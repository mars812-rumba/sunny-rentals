from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from platform_core import (
    PlatformContext,
    TenantAccessError,
    TenantAlreadyExistsError,
    TenantProvisionRequest,
    TenantProvisioner,
)


class TenantProvisioningTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name) / "data-v2"
        self.admin = PlatformContext.for_admin("superadmin-1")
        self.now = datetime(2026, 10, 8, 12, 0, tzinfo=timezone.utc)
        self.request = TenantProvisionRequest(
            name="Test Cars Phuket",
            slug="test-cars-phuket",
            owner_user_id="telegram:12345",
            trial_days=7,
            branding={"primary_color": "#123456"},
        )

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_platform_admin_creates_complete_draft_tenant(self):
        tenant = TenantProvisioner(self.root).create_tenant(
            self.admin, self.request, self.now
        )
        tenant_dir = self.root / "tenants" / tenant.tenant_id
        self.assertEqual(tenant.status.value, "draft")
        self.assertIsNone(tenant.published_at)
        for filename in (
            "tenant.json",
            "assets.json",
            "customers.json",
            "bookings.json",
            "events.jsonl",
            "conversations.jsonl",
            "audit.jsonl",
        ):
            self.assertTrue((tenant_dir / filename).exists(), filename)
        state = json.loads(
            (self.root / "platform" / "control-plane.json").read_text(encoding="utf-8")
        )
        self.assertEqual(state["tenants"][0]["tenant_id"], "test-cars-phuket")
        self.assertEqual(state["memberships"][0]["role"], "owner")
        self.assertEqual(state["subscriptions"][0]["status"], "draft")
        self.assertEqual(state["subscriptions"][0]["trial_starts_on"], "publish")

    def test_trial_starts_on_publish_not_creation(self):
        provisioner = TenantProvisioner(self.root)
        provisioner.create_tenant(self.admin, self.request, self.now)
        published_at = self.now + timedelta(days=3)
        tenant = provisioner.publish_tenant(
            self.admin, self.request.slug, published_at
        )
        state = json.loads(provisioner.state_path.read_text(encoding="utf-8"))
        subscription = state["subscriptions"][0]
        self.assertEqual(tenant.status.value, "trial")
        self.assertEqual(tenant.published_at, published_at)
        # Pydantic 1 writes +00:00; Pydantic 2 writes the equivalent UTC Z.
        self.assertEqual(
            datetime.fromisoformat(subscription["trial_started_at"].replace("Z", "+00:00")),
            published_at,
        )
        self.assertEqual(
            datetime.fromisoformat(subscription["trial_ends_at"].replace("Z", "+00:00")),
            published_at + timedelta(days=7),
        )

    def test_non_admin_cannot_create_or_publish(self):
        viewer = PlatformContext(actor_id="viewer", roles=frozenset({"viewer"}))
        provisioner = TenantProvisioner(self.root)
        with self.assertRaises(TenantAccessError):
            provisioner.create_tenant(viewer, self.request, self.now)

    def test_duplicate_slug_is_rejected_without_changes(self):
        provisioner = TenantProvisioner(self.root)
        provisioner.create_tenant(self.admin, self.request, self.now)
        before = provisioner.state_path.read_bytes()
        with self.assertRaises(TenantAlreadyExistsError):
            provisioner.create_tenant(self.admin, self.request, self.now)
        self.assertEqual(provisioner.state_path.read_bytes(), before)

    def test_failure_after_install_rolls_back_directory_and_control_plane(self):
        def fail(stage):
            if stage == "control_plane_saved":
                raise RuntimeError("simulated failure")

        provisioner = TenantProvisioner(self.root, fault_hook=fail)
        with self.assertRaises(RuntimeError):
            provisioner.create_tenant(self.admin, self.request, self.now)
        self.assertFalse((self.root / "tenants" / self.request.slug).exists())
        self.assertFalse(provisioner.state_path.exists())

    def test_publish_failure_restores_draft_and_unstarted_trial(self):
        provisioner = TenantProvisioner(self.root)
        provisioner.create_tenant(self.admin, self.request, self.now)
        before_state = provisioner.state_path.read_bytes()
        before_tenant = (
            self.root / "tenants" / self.request.slug / "tenant.json"
        ).read_bytes()

        def fail(stage):
            if stage == "publication_saved":
                raise RuntimeError("simulated publication failure")

        provisioner.fault_hook = fail
        with self.assertRaises(RuntimeError):
            provisioner.publish_tenant(
                self.admin, self.request.slug, self.now + timedelta(days=1)
            )
        self.assertEqual(provisioner.state_path.read_bytes(), before_state)
        self.assertEqual(
            (self.root / "tenants" / self.request.slug / "tenant.json").read_bytes(),
            before_tenant,
        )

    def test_existing_sunny_tenant_is_bootstrapped_without_replacement(self):
        platform = self.root / "platform"
        platform.mkdir(parents=True)
        sunny = {
            "schema_version": 1,
            "tenant_id": "sunny-rentals",
            "items": [
                {
                    "schema_version": 1,
                    "id": "sunny-rentals",
                    "tenant_id": "sunny-rentals",
                    "created_at": self.now.isoformat(),
                    "updated_at": self.now.isoformat(),
                    "archived_at": None,
                    "slug": "sunny-rentals",
                    "name": "Sunny Rentals",
                }
            ],
        }
        (platform / "tenants.json").write_text(json.dumps(sunny), encoding="utf-8")
        provisioner = TenantProvisioner(self.root)
        provisioner.create_tenant(self.admin, self.request, self.now)
        state = json.loads(provisioner.state_path.read_text(encoding="utf-8"))
        self.assertEqual(
            {tenant["tenant_id"] for tenant in state["tenants"]},
            {"sunny-rentals", "test-cars-phuket"},
        )


if __name__ == "__main__":
    unittest.main()
