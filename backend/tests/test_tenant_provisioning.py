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
    TenantNotFoundError,
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

    def test_archive_preserves_data_denies_access_and_does_not_touch_other_parks(self):
        provisioner = TenantProvisioner(self.root)
        tenant = provisioner.create_tenant(self.admin, self.request, self.now)
        provisioner.publish_tenant(self.admin, tenant.tenant_id, self.now)
        other = provisioner.create_tenant(self.admin, TenantProvisionRequest(name="Other", slug="other"), self.now)
        other_before = (self.root / 'tenants' / other.tenant_id / 'tenant.json').read_bytes()
        directory = self.root / 'tenants' / tenant.tenant_id
        retained = {name: (directory / name).read_bytes() for name in ['assets.json', 'bookings.json', 'customers.json']}
        state_before = provisioner._load_state()
        archived = provisioner.archive_tenant(self.admin, tenant.tenant_id, self.now + timedelta(days=2))
        self.assertEqual(archived.status.value, 'cancelled')
        self.assertIsNotNone(archived.archived_at)
        self.assertEqual([item.tenant_id for item in provisioner.list_tenants(self.admin)], [other.tenant_id])
        self.assertEqual([item['tenant_id'] for item in provisioner.tenant_overviews(self.admin)], [other.tenant_id])
        with self.assertRaises(TenantNotFoundError):
            provisioner.get_tenant(self.admin, tenant.tenant_id)
        with self.assertRaises(TenantNotFoundError):
            provisioner.publish_tenant(self.admin, tenant.tenant_id)
        from platform_core.partner_bot import PartnerBotService, PartnerBotError
        from platform_storefront_api import StorefrontReader
        from fastapi import HTTPException
        with self.assertRaises(PartnerBotError):
            PartnerBotService.tenant(provisioner._load_state(), tenant.tenant_id)
        with self.assertRaises(HTTPException):
            StorefrontReader(self.root, tenant.tenant_id, False)
        state = provisioner._load_state()
        member = next(item for item in state.memberships if item.tenant_id == tenant.tenant_id)
        self.assertFalse(member.active)
        self.assertEqual(state.subscriptions[0].trial_ends_at, state_before.subscriptions[0].trial_ends_at)
        for name, content in retained.items():
            self.assertEqual((directory / name).read_bytes(), content)
        self.assertEqual((self.root / 'tenants' / other.tenant_id / 'tenant.json').read_bytes(), other_before)
        before = provisioner.state_path.read_bytes()
        provisioner.archive_tenant(self.admin, tenant.tenant_id)
        self.assertEqual(provisioner.state_path.read_bytes(), before)

    def test_archive_requires_admin_and_rolls_back_on_failure(self):
        provisioner = TenantProvisioner(self.root)
        tenant = provisioner.create_tenant(self.admin, self.request, self.now)
        viewer = PlatformContext(actor_id="viewer", roles=frozenset({"viewer"}))
        with self.assertRaises(TenantAccessError):
            provisioner.archive_tenant(viewer, tenant.tenant_id)
        state_before = provisioner.state_path.read_bytes()
        path = self.root / 'tenants' / tenant.tenant_id / 'tenant.json'
        tenant_before = path.read_bytes()
        def fail(stage):
            if stage == 'archive_saved':
                raise RuntimeError('simulated failure')
        with self.assertRaises(RuntimeError):
            TenantProvisioner(self.root, fault_hook=fail).archive_tenant(self.admin, tenant.tenant_id)
        self.assertEqual(provisioner.state_path.read_bytes(), state_before)
        self.assertEqual(path.read_bytes(), tenant_before)

    def test_republish_preserves_trial_and_supports_active_tenant(self):
        provisioner = TenantProvisioner(self.root)
        tenant = provisioner.create_tenant(self.admin, self.request, self.now)
        provisioner.publish_tenant(self.admin, tenant.tenant_id, self.now)
        before = provisioner.state_path.read_bytes()
        provisioner.publish_tenant(self.admin, tenant.tenant_id, self.now + timedelta(days=5))
        self.assertEqual(provisioner.state_path.read_bytes(), before)
        from platform_core.models import TenantStatus
        from platform_core.provisioning import _atomic_json_write, _jsonable
        state = provisioner._load_state()
        state.tenants[0].status = TenantStatus.ACTIVE
        provisioner._save_state(state)
        _atomic_json_write(self.root / 'tenants' / tenant.tenant_id / 'tenant.json', _jsonable(state.tenants[0]))
        before = provisioner.state_path.read_bytes()
        self.assertEqual(provisioner.publish_tenant(self.admin, tenant.tenant_id).status, TenantStatus.ACTIVE)
        self.assertEqual(provisioner.state_path.read_bytes(), before)

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
