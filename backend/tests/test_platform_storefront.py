"""Public projection, tenant isolation and scoped preview contracts."""

import json
from pathlib import Path
import tempfile
import unittest

from fastapi import FastAPI

from platform_admin_api import create_platform_admin_router
from platform_storefront_api import StorefrontPreview, create_storefront_router
from platform_core import PlatformAdminAuth, PlatformContext, TenantProvisionRequest, TenantProvisioner
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.models import AssetStatus, TenantStatus
from test_platform_asset_admin import InProcessASGIClient


class StorefrontTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name)
        self.now = 100000
        self.auth = PlatformAdminAuth('storefront-test-secret-at-least-32-bytes', ['admin'], clock=lambda: self.now)
        self.context = PlatformContext.for_admin('admin')
        self.provisioner = TenantProvisioner(self.root)
        for tenant in ('park-a', 'park-b'):
            self.provisioner.create_tenant(self.context, TenantProvisionRequest(name=tenant, slug=tenant))
        self.service = TenantAssetAdmin(self.root, self.context, 'park-a')
        self.asset = self.service.save(AssetInput(name='Yaris', daily_rate=900, deposit=5000))
        self.reference = f'assets/{self.asset.id}/' + 'a' * 32 + '.webp'
        path = self.service.media_dir / self.reference
        path.parent.mkdir(parents=True)
        path.write_bytes(b'RIFFtestWEBPtest')
        self.asset.photos = {'main': self.reference, 'gallery': [self.reference]}
        self.asset.specs['internal_notes'] = 'PRIVATE'
        self.asset.legacy = {'private': 'PRIVATE'}
        self.service.assets.upsert(self.asset)
        app = FastAPI()
        app.include_router(create_platform_admin_router(self.root, self.auth))
        app.include_router(create_storefront_router(self.root, self.auth))
        self.client = InProcessASGIClient(app)
        self.url = '/api/storefront/park-a'

    def tearDown(self):
        self.directory.cleanup()

    def token(self, tenant='park-a'):
        return StorefrontPreview(self.auth).issue(tenant, 'admin')

    def headers(self):
        return {'X-Storefront-Preview': self.token()}

    def publish(self):
        self.provisioner.publish_tenant(self.context, 'park-a')
        self.service.save(AssetInput(name='Yaris', daily_rate=900, deposit=5000, public=True), self.asset.id)

    def test_draft_is_private_but_preview_shows_three_assets_without_starting_trial(self):
        for name in ('Honda', 'Toyota'):
            self.service.save(AssetInput(name=name))
        self.assertEqual(self.client.get(self.url).status_code, 404)
        response = self.client.get(self.url, headers=self.headers())
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['assets']), 3)
        self.assertTrue(response.json()['preview'])
        self.assertFalse(response.json()['booking_enabled'])
        self.assertIsNone(self.provisioner.get_tenant(self.context, 'park-a').published_at)

    def test_published_park_still_hides_unpublished_assets(self):
        self.provisioner.publish_tenant(self.context, 'park-a')
        self.assertEqual(self.client.get(self.url).json()['assets'], [])
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference}').status_code, 404)

    def test_public_projection_has_no_private_fields_or_integrations(self):
        self.publish()
        result = self.client.get(self.url)
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()['assets'][0]['daily_rate'], 900)
        self.assertNotIn('PRIVATE', result.text)
        self.assertNotIn('integrations', result.text)
        self.assertNotIn('created_by', result.text)
        self.assertEqual(result.headers['cache-control'], 'no-store')

    def test_preview_is_scoped_and_cannot_authorize_admin_api(self):
        token = self.token()
        self.assertEqual(self.client.get('/api/storefront/park-b', headers={'X-Storefront-Preview': token}).status_code, 401)
        self.assertEqual(self.client.get('/api/platform/tenants', headers={'Authorization': f'Bearer {token}'}).status_code, 401)
        admin_token = self.auth.issue_for_verified_actor('admin')
        self.assertEqual(self.client.get(self.url, headers={'X-Storefront-Preview': admin_token}).status_code, 401)

    def test_preview_expiry_tampering_and_actor_revocation(self):
        token = self.token()
        self.assertEqual(self.client.get(self.url, headers={'X-Storefront-Preview': token + 'x'}).status_code, 401)
        self.now += 3600
        self.assertEqual(self.client.get(self.url, headers={'X-Storefront-Preview': token}).status_code, 401)
        token = self.token()
        self.auth.allowed_actor_ids = frozenset({'someone-else'})
        self.assertEqual(self.client.get(self.url, headers={'X-Storefront-Preview': token}).status_code, 401)

    def test_preview_issuance_requires_admin(self):
        url = '/api/platform/tenants/park-a/storefront-preview'
        self.assertEqual(self.client.post(url).status_code, 401)
        response = self.client.post(url, headers={'Authorization': f"Bearer {self.auth.issue_for_verified_actor('admin')}"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['expires_in'], 3600)
        self.assertEqual(self.client.get(self.url, headers={'X-Storefront-Preview': response.json()['token']}).status_code, 200)

    def test_media_only_serves_referenced_processed_images(self):
        self.publish()
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference}').status_code, 200)
        self.assertEqual(self.client.get(f'/api/storefront/park-b/media/{self.reference}', headers={'X-Storefront-Preview': self.token('park-b')}).status_code, 404)
        unreferenced = self.service.media_dir / 'logo' / ('b' * 32 + '.webp')
        unreferenced.parent.mkdir()
        unreferenced.write_bytes(b'private')
        self.assertEqual(self.client.get(f'{self.url}/media/logo/{unreferenced.name}').status_code, 404)
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference.replace(".webp", ".jpg")}').status_code, 404)

    def test_archive_hidden_and_visibility_toggle_remove_public_media(self):
        self.publish()
        self.service.save(AssetInput(name='Yaris', public=False), self.asset.id)
        self.assertEqual(self.client.get(self.url).json()['assets'], [])
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference}').status_code, 404)
        self.asset.public = True
        self.asset.status = AssetStatus.HIDDEN
        self.service.assets.upsert(self.asset)
        self.assertEqual(self.client.get(self.url, headers=self.headers()).json()['assets'], [])
        self.service.archive(self.asset.id)
        self.assertEqual(self.client.get(self.url, headers=self.headers()).json()['assets'], [])

    def test_symlink_and_foreign_records_fail_closed(self):
        path = self.root / 'tenants/park-a/assets.json'
        document = json.loads(path.read_text())
        document['items'][0]['tenant_id'] = 'park-b'
        path.write_text(json.dumps(document))
        self.assertEqual(self.client.get(self.url, headers=self.headers()).status_code, 404)
        path.unlink()
        path.symlink_to(self.root / 'tenants/park-b/assets.json')
        self.assertEqual(self.client.get(self.url, headers=self.headers()).status_code, 404)

    def test_unregistered_tenant_does_not_create_storage(self):
        self.assertEqual(self.client.get('/api/storefront/unknown').status_code, 404)
        self.assertFalse((self.root / 'tenants/unknown').exists())

    def test_media_symlink_is_rejected(self):
        self.publish()
        path = self.service.media_dir / self.reference
        path.unlink()
        outside = self.root / 'secret.webp'
        outside.write_bytes(b'secret')
        path.symlink_to(outside)
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference}').status_code, 404)

    def test_preserves_visibility_when_older_admin_client_omits_it(self):
        self.publish()
        self.service.save(AssetInput(name='New name'), self.asset.id)
        self.assertTrue(self.service.assets.get(self.asset.id).public)

    def test_catalog_refreshes_without_copying_global_catalog(self):
        self.publish()
        self.service.save(AssetInput(name='Updated Yaris', daily_rate=1500), self.asset.id)
        result = self.client.get(self.url).json()
        self.assertEqual(result['assets'][0]['name'], 'Updated Yaris')
        self.assertEqual(result['assets'][0]['daily_rate'], 1500)
        self.assertFalse((self.root / 'data/web_cars.json').exists())

    def test_suspended_park_is_inaccessible_even_in_preview(self):
        self.publish()
        state = self.provisioner._load_state()
        state.tenants[0].status = TenantStatus.SUSPENDED
        self.provisioner._save_state(state)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get(self.url, headers=self.headers()).status_code, 404)
        self.assertEqual(self.client.get(f'{self.url}/media/{self.reference}', headers=self.headers()).status_code, 404)

    def test_logo_is_tenant_scoped_and_internal_asset_photos_cannot_become_logo(self):
        self.publish()
        logo = 'logo/' + 'c' * 32 + '.webp'
        path = self.service.media_dir / logo
        path.parent.mkdir()
        path.write_bytes(b'RIFFtestWEBPtest')
        self.provisioner.set_logo(self.context, 'park-a', logo)
        self.assertEqual(self.client.get(self.url).json()['tenant']['logo'], logo)
        self.assertEqual(self.client.get(f'{self.url}/media/{logo}').status_code, 200)
        self.assertEqual(self.client.get(f'/api/storefront/park-b/media/{logo}', headers={'X-Storefront-Preview': self.token('park-b')}).status_code, 404)
        self.provisioner.set_logo(self.context, 'park-a', self.reference)
        self.assertIsNone(self.client.get(self.url).json()['tenant']['logo'])
