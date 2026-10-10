import json
import unittest
from datetime import timedelta
import test_platform_partner_bot as fixtures
import test_platform_asset_admin as image_fixtures
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.partner_bot import PartnerBotError
from platform_core.provisioning import trial_summary, PlatformContext
from platform_core.context import TenantAccessError


class OwnerFleetTests(unittest.TestCase):
    state = fixtures.PartnerBotTests.state
    update = fixtures.PartnerBotTests.update
    token = fixtures.PartnerBotTests.token
    invite = fixtures.PartnerBotTests.invite
    tearDown = fixtures.PartnerBotTests.tearDown

    @classmethod
    def setUpClass(cls):
        image_fixtures.PlatformAssetTests.setUpClass()
        cls.png = image_fixtures.PlatformAssetTests.png

    def setUp(self):
        fixtures.PartnerBotTests.setUp(self)
        self.service.handle_update(self.update(self.invite()))

    def signed(self, **extra):
        return {'tenant_id': 'park-a', 'init_data': self.token(), **extra}

    def save(self, **extra):
        return self.client.post('/api/partners/fleet/save', json=self.signed(
            data={'name': 'Toyota', 'daily_rate': 800, 'deposit': 5000, 'public': True}, **extra))

    def test_owner_create_edit_and_list_same_scoped_records(self):
        created = self.save()
        self.assertEqual(created.status_code, 200, created.text)
        asset = created.json()['asset']
        listing = self.client.post('/api/partners/fleet/list', json=self.signed())
        self.assertEqual(listing.status_code, 200, listing.text)
        self.assertEqual(listing.json()['tenant']['tenant_id'], 'park-a')
        self.assertEqual(listing.json()['assets'][0]['id'], asset['id'])
        updated = self.client.post('/api/partners/fleet/save', json=self.signed(asset_id=asset['id'],
            data={'name': 'Yaris', 'daily_rate': 900, 'public': False}))
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list()[0].name, 'Yaris')
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-b').list(), [])
        events = [json.loads(line) for line in (self.root / 'tenants/park-a/audit.jsonl').read_text().splitlines()]
        self.assertEqual(events[-1]['actor_id'], self.service.actor_id('42'))

    def test_foreign_vehicle_and_park_are_denied_without_writes(self):
        foreign = TenantAssetAdmin(self.root, self.admin, 'park-b').save(AssetInput(name='Foreign'))
        before = (self.root / 'tenants/park-b/assets.json').read_bytes()
        self.assertEqual(self.save(asset_id=foreign.id).status_code, 404)
        self.assertEqual(self.client.post('/api/partners/fleet/archive', json=self.signed(asset_id=foreign.id)).status_code, 404)
        self.assertEqual(self.client.post('/api/partners/fleet/list', json=self.signed(tenant_id='park-b')).status_code, 403)
        self.assertEqual((self.root / 'tenants/park-b/assets.json').read_bytes(), before)

    def test_customer_wrong_bot_and_forged_role_are_denied(self):
        self.service.revoke_owner(self.admin, 'park-a', '42')
        self.assertEqual(self.save().status_code, 403)
        self.assertEqual(self.client.post('/api/partners/fleet/list', json=self.signed(role='owner')).status_code, 422)
        self.assertEqual(self.client.post('/api/partners/fleet/list', json=self.signed(init_data=self.token(bot_token='wrong'))).status_code, 403)
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list(), [])

    def test_revocation_rechecked_inside_existing_service_before_mutation(self):
        assets = TenantAssetAdmin.for_owner(self.service, 'park-a', self.token())
        self.service.revoke_owner(self.admin, 'park-a', '42')
        with self.assertRaises(PartnerBotError):
            assets.save(AssetInput(name='Must not persist'))
        with self.assertRaises(PartnerBotError):
            assets.list()
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list(), [])

    def test_photo_private_media_and_archive_preserve_scope(self):
        asset = self.save().json()['asset']
        uploaded = self.client.post('/api/partners/fleet/photo', data={**self.signed(), 'asset_id': asset['id']},
            files={'file': ('../../unsafe.png', self.png, 'image/png')})
        self.assertEqual(uploaded.status_code, 200, uploaded.text)
        reference = uploaded.json()['asset']['photos']['main']
        media = self.client.post('/api/partners/fleet/media', json=self.signed(reference=reference))
        self.assertEqual(media.status_code, 200, media.text)
        self.assertEqual(media.headers['cache-control'], 'private, no-store')
        self.assertEqual(self.client.post('/api/partners/fleet/media', json=self.signed(reference='../../secret')).status_code, 404)
        archived = self.client.post('/api/partners/fleet/archive', json=self.signed(asset_id=asset['id']))
        self.assertEqual(archived.status_code, 200, archived.text)
        self.assertEqual(self.client.post('/api/partners/fleet/list', json=self.signed()).json()['assets'], [])
        self.service.revoke_owner(self.admin, 'park-a', '42')
        self.assertEqual(self.client.post('/api/partners/fleet/media', json=self.signed(reference=reference)).status_code, 403)

    def test_invalid_photo_and_untrusted_asset_fields_do_not_write(self):
        asset = self.save().json()['asset']
        uploaded = self.client.post('/api/partners/fleet/photo', data={**self.signed(), 'asset_id': asset['id']},
            files={'file': ('bad.jpg', b'not-an-image', 'image/jpeg')})
        self.assertEqual(uploaded.status_code, 422)
        result = self.client.post('/api/partners/fleet/save', json=self.signed(data={
            'name': 'Bad', 'tenant_id': 'park-b'}))
        self.assertEqual(result.status_code, 422)
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list()[0].photos, {})

    def test_foreign_media_and_owner_logo_management_are_denied(self):
        foreign = TenantAssetAdmin(self.root, self.admin, 'park-b')
        asset = foreign.save(AssetInput(name='Foreign'))
        asset = foreign.upload_photo(asset.id, self.png)
        result = self.client.post('/api/partners/fleet/media', json=self.signed(reference=asset.photos['main']))
        self.assertEqual(result.status_code, 404)
        with self.assertRaises(PermissionError):
            TenantAssetAdmin.for_owner(self.service, 'park-a', self.token()).upload_logo(self.png)

    def test_trial_visible_to_owner_and_admin_without_reset_or_other_park_data(self):
        path = self.service.provisioner.state_path
        before = path.read_bytes()
        listing = self.client.post('/api/partners/fleet/list', json=self.signed()).json()
        trial = listing['tenant']['trial']
        self.assertEqual(trial['days'], 7)
        self.assertEqual(trial['status'], 'trialing')
        self.assertIsNotNone(trial['started_at'])
        self.assertIsNotNone(trial['ends_at'])
        self.assertNotIn('memberships', listing['tenant'])
        overviews = self.service.provisioner.tenant_overviews(self.admin)
        self.assertEqual(len(overviews), 2)
        self.assertEqual(next(item for item in overviews if item['tenant_id'] == 'park-a')['trial']['days'], 7)
        with self.assertRaises(TenantAccessError):
            self.service.provisioner.tenant_overviews(PlatformContext(actor_id='42', roles=frozenset({'owner'})))
        subscription = next(item for item in self.state().subscriptions if item.tenant_id == 'park-a')
        self.assertFalse(trial_summary(self.state(), 'park-a', subscription.trial_ends_at - timedelta(seconds=1))['expired'])
        self.assertTrue(trial_summary(self.state(), 'park-a', subscription.trial_ends_at)['expired'])
        self.assertEqual(path.read_bytes(), before)
