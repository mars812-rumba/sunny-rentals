"""HTTP contract tests using temporary storage, never the live Sunny files."""

import asyncio
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from fastapi import FastAPI
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from platform_admin_api import create_platform_admin_router
from platform_core import PlatformAdminAuth, PlatformContext, TenantProvisionRequest, TenantProvisioner
from platform_core.asset_admin import MAX_IMAGE_BYTES, TenantAssetAdmin


class InProcessASGIClient:
    """Exercise routing/validation without a cross-thread event-loop portal.

    The Telegram sandbox blocks the wakeup socket used by Starlette TestClient.
    Only the test threadpool scheduler is replaced; HTTP parsing, dependencies,
    authorization and response serialization still run through the real app.
    Service locking is checked independently, not by this adapter.
    """
    def __init__(self, app):
        self.app = app
        self.headers = {}

    def request(self, method, url, **kwargs):
        async def direct(func, *args, **options):
            return func(*args)

        async def perform():
            with patch("anyio.to_thread.run_sync", direct):
                async with httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test", headers=self.headers) as client:
                    return await client.request(method, url, **kwargs)
        return asyncio.run(perform())

    def get(self, url, **kwargs): return self.request("GET", url, **kwargs)
    def post(self, url, **kwargs): return self.request("POST", url, **kwargs)
    def put(self, url, **kwargs): return self.request("PUT", url, **kwargs)
    def delete(self, url, **kwargs): return self.request("DELETE", url, **kwargs)
    def close(self): pass


class PlatformAssetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.png = subprocess.run([
            "ffmpeg", "-nostdin", "-v", "error", "-f", "lavfi", "-i", "color=c=blue:s=40x30",
            "-frames:v", "1", "-threads", "1", "-f", "image2pipe", "-c:v", "png", "pipe:1",
        ], capture_output=True, check=True).stdout

    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.admin = PlatformContext.for_admin("admin")
        self.auth = PlatformAdminAuth("secure-test-secret-of-at-least-32-characters", ["admin"])
        app = FastAPI()
        app.include_router(create_platform_admin_router(self.root, self.auth))
        self.client = InProcessASGIClient(app)
        self.client.headers["Authorization"] = f"Bearer {self.auth.issue_for_verified_actor('admin')}"
        for slug in ("park-a", "park-b"):
            response = self.client.post("/api/platform/tenants", json={"name": slug, "slug": slug})
            self.assertEqual(response.status_code, 201, response.text)
        self.url = "/api/platform/tenants/park-a"

    def tearDown(self):
        self.client.close()
        self.directory.cleanup()

    def create_asset(self, park="park-a"):
        response = self.client.post(f"/api/platform/tenants/{park}/assets", json={
            "name": "Toyota Yaris", "brand": "Toyota", "model": "Yaris", "year": 2024,
            "daily_rate": 1200, "deposit": 5000,
        })
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["asset"]

    def photo(self, asset_id, content=None):
        return self.client.post(f"{self.url}/assets/{asset_id}/photos", files={
            "file": ("../../unsafe-name.png", self.png if content is None else content, "image/png")
        })

    def test_ownerless_drafts_have_no_fake_memberships_or_running_trial(self):
        state = json.loads((self.root / "platform/control-plane.json").read_text())
        self.assertEqual(state["memberships"], [])
        self.assertTrue(all(tenant["status"] == "draft" for tenant in state["tenants"]))
        self.assertTrue(all(subscription["trial_started_at"] is None for subscription in state["subscriptions"]))

    def test_create_update_and_archive_are_isolated(self):
        asset = self.create_asset()
        self.assertEqual(asset["tenant_id"], "park-a")
        self.assertEqual(self.client.get("/api/platform/tenants/park-b/assets").json()["assets"], [])
        updated = self.client.put(f"{self.url}/assets/{asset['id']}", json={"name": "Updated", "daily_rate": 1500})
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["asset"]["pricing"]["daily_rate"], 1500)
        self.assertEqual(self.client.delete(f"{self.url}/assets/{asset['id']}").status_code, 200)
        self.assertEqual(self.client.get(f"{self.url}/assets").json()["assets"], [])
        document = json.loads((self.root / "tenants/park-a/assets.json").read_text())
        self.assertIsNotNone(document["items"][0]["archived_at"])

    def test_upload_produces_private_webp_and_preserves_main_photo(self):
        asset = self.create_asset()
        first = self.photo(asset["id"])
        self.assertEqual(first.status_code, 200, first.text)
        reference = first.json()["asset"]["photos"]["main"]
        second = self.photo(asset["id"]).json()["asset"]
        self.assertEqual(second["photos"]["main"], reference)
        self.assertEqual(len(second["photos"]["gallery"]), 2)
        self.assertEqual(second["pricing"]["daily_rate"], 1200)
        media = self.client.get(f"{self.url}/media/{reference}")
        self.assertEqual(media.status_code, 200)
        self.assertEqual(media.headers["content-type"], "image/webp")
        self.assertEqual(media.content[8:12], b"WEBP")
        self.assertEqual(media.headers["cache-control"], "private, no-store")
        self.assertEqual(self.client.get(f"/api/platform/tenants/park-b/media/{reference}").status_code, 404)
        originals = list((self.root / "tenants/park-a/media/assets" / asset["id"] / "original").glob("*.png"))
        self.assertEqual(len(originals), 2)
        self.assertEqual(originals[0].read_bytes(), self.png)

    def test_cannot_mutate_an_asset_through_another_tenant(self):
        asset = self.create_asset()
        url = f"/api/platform/tenants/park-b/assets/{asset['id']}"
        self.assertEqual(self.client.put(url, json={"name": "Intruder"}).status_code, 404)
        self.assertEqual(self.client.delete(url).status_code, 404)
        self.assertEqual(self.client.post(url + "/photos", files={"file": ("image.png", self.png)}).status_code, 404)
        self.assertFalse((self.root / "tenants/park-b/media").exists())

    def test_unknown_tenant_does_not_create_storage(self):
        self.assertEqual(self.client.post("/api/platform/tenants/missing/assets", json={"name": "Test"}).status_code, 404)
        self.assertFalse((self.root / "tenants/missing").exists())

    def test_invalid_and_oversized_uploads_do_not_write_images(self):
        asset = self.create_asset()
        for content in (b"<svg>not a raster</svg>", b"\x89PNG\r\n\x1a\ninvalid", b""):
            self.assertEqual(self.photo(asset["id"], content).status_code, 422)
        self.assertEqual(self.photo(asset["id"], b"x" * (MAX_IMAGE_BYTES + 1)).status_code, 413)
        self.assertEqual(self.client.get(f"{self.url}/assets").json()["assets"][0]["photos"], {})
        self.assertEqual(list((self.root / "tenants/park-a").rglob("*.webp")), [])

    def test_logo_updates_both_documents_without_changing_second_park(self):
        response = self.client.post(f"{self.url}/logo", files={"file": ("logo.png", self.png)})
        self.assertEqual(response.status_code, 200, response.text)
        logo = response.json()["tenant"]["branding"]["logo"]
        self.assertTrue(logo.startswith("logo/"))
        self.assertEqual(self.client.get(self.url).json()["tenant"]["branding"]["logo"], logo)
        document = json.loads((self.root / "tenants/park-a/tenant.json").read_text())
        self.assertEqual(document["branding"]["logo"], logo)
        self.assertEqual(self.client.get("/api/platform/tenants/park-b").json()["tenant"]["branding"], {})

    def test_new_endpoints_require_session(self):
        asset = self.create_asset()
        reference = self.photo(asset["id"]).json()["asset"]["photos"]["main"]
        self.client.headers.pop("Authorization")
        for method, url, kwargs in (
            ("get", f"{self.url}/assets", {}),
            ("post", f"{self.url}/assets", {"json": {"name": "Test"}}),
            ("put", f"{self.url}/assets/{asset['id']}", {"json": {"name": "Test"}}),
            ("delete", f"{self.url}/assets/{asset['id']}", {}),
            ("post", f"{self.url}/logo", {"files": {"file": ("logo.png", self.png)}}),
            ("post", f"{self.url}/assets/{asset['id']}/photos", {"files": {"file": ("photo.png", self.png)}}),
            ("get", f"{self.url}/media/{reference}", {}),
        ):
            response = getattr(self.client, method)(url, **kwargs)
            self.assertEqual(response.status_code, 401, url)

    def test_invalid_asset_fields_and_untrusted_ids_are_rejected(self):
        for data in ({"name": "  "}, {"name": "Test", "daily_rate": -1}, {"name": "Test", "tenant_id": "park-b"}, {"name": "Test", "year": 1}):
            self.assertEqual(self.client.post(f"{self.url}/assets", json=data).status_code, 422)
        self.assertEqual(self.client.delete(f"{self.url}/assets/unknown").status_code, 404)

    def test_symlink_media_escape_is_rejected(self):
        asset = self.create_asset()
        reference = self.photo(asset["id"]).json()["asset"]["photos"]["main"]
        preview = self.root / "tenants/park-a/media" / reference
        preview.unlink()
        preview.symlink_to(self.root / "tenants/park-b/tenant.json")
        self.assertEqual(self.client.get(f"{self.url}/media/{reference}").status_code, 404)
        self.assertEqual(self.client.get(f"{self.url}/media/assets/{asset['id']}/original/private.png").status_code, 404)

    def test_failed_collection_write_cleans_new_uploads(self):
        asset = self.create_asset()
        service = TenantAssetAdmin(self.root, self.admin, "park-a")
        with patch.object(service.audit, "append", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                service.upload_photo(asset["id"], self.png)
        self.assertEqual(list((self.root / "tenants/park-a").rglob("*.webp")), [])
        self.assertEqual(list((self.root / "tenants/park-a").rglob("*.png")), [])
        self.assertEqual(service.list()[0].photos, {})

    def test_failed_audit_rolls_back_asset_edit(self):
        asset = self.create_asset()
        service = TenantAssetAdmin(self.root, self.admin, "park-a")
        from platform_core.asset_admin import AssetInput
        with patch.object(service.audit, "append", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                service.save(AssetInput(name="Must not persist"), asset["id"])
        self.assertEqual(service.list()[0].name, "Toyota Yaris")

    def test_logo_failure_rolls_back_branding_and_removes_uploads(self):
        service = TenantAssetAdmin(self.root, self.admin, "park-a")
        with patch.object(service.provisioner, "_save_state", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                service.upload_logo(self.png)
        self.assertEqual(json.loads((self.root / "tenants/park-a/tenant.json").read_text())["branding"], {})
        self.assertEqual(list((self.root / "tenants/park-a").rglob("*.webp")), [])

    def test_parallel_photo_uploads_preserve_every_reference(self):
        asset = self.create_asset()
        def upload(_):
            return TenantAssetAdmin(self.root, self.admin, "park-a").upload_photo(asset["id"], self.png)
        with ThreadPoolExecutor(max_workers=3) as executor:
            list(executor.map(upload, range(3)))
        saved = TenantAssetAdmin(self.root, self.admin, "park-a").list()[0]
        self.assertEqual(len(set(saved.photos["gallery"])), 3)
        self.assertIn(saved.photos["main"], saved.photos["gallery"])

    def test_five_asset_demo_does_not_change_another_park(self):
        for _ in range(5):
            self.create_asset()
        self.assertEqual(len(self.client.get(f"{self.url}/assets").json()["assets"]), 5)
        self.assertEqual(self.client.get("/api/platform/tenants/park-b/assets").json()["assets"], [])

    def test_repository_rejects_foreign_records_and_sibling_symlink(self):
        from platform_core import TenantAccessError
        asset = self.create_asset()
        path = self.root / "tenants/park-a/assets.json"
        document = json.loads(path.read_text())
        document["items"][0]["tenant_id"] = "park-b"
        path.write_text(json.dumps(document))
        with self.assertRaises(TenantAccessError):
            TenantAssetAdmin(self.root, self.admin, "park-a").list()
        from platform_core.repositories import TenantStorage
        from platform_core.context import TenantContext
        (self.root / "tenants/alias-park").symlink_to(self.root / "tenants/park-b", target_is_directory=True)
        with self.assertRaises(TenantAccessError):
            TenantStorage(self.root, TenantContext("alias-park"))


if __name__ == "__main__":
    unittest.main()
