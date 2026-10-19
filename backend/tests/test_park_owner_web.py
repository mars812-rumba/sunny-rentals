"""Browser owner contracts on temporary data, with no Telegram bot configured."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
import json
from pathlib import Path
import tempfile
import unittest

from fastapi import FastAPI
from test_platform_asset_admin import InProcessASGIClient
from platform_admin_api import create_platform_admin_router
from platform_owner_api import create_owner_web_router, COOKIE
from platform_core import PlatformAdminAuth, PlatformContext, TenantProvisioner, TenantProvisionRequest
from platform_core.asset_admin import TenantAssetAdmin, AssetInput
from platform_core.owner_web_auth import OwnerWebAuth, OwnerAuthenticationError, OwnerRateLimitError


class OwnerWebTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.admin = PlatformContext.for_admin('admin')
        self.platform_auth = PlatformAdminAuth('secure-test-secret-of-at-least-32-characters', ['admin'])
        self.provisioner = TenantProvisioner(self.root)
        for tenant_id in ('park-a', 'park-b'):
            self.provisioner.create_tenant(self.admin, TenantProvisionRequest(name=tenant_id, slug=tenant_id))
        self.auth = OwnerWebAuth(self.root)
        self.credentials = self.auth.issue(self.admin, 'park-a')
        app = FastAPI()
        app.include_router(create_platform_admin_router(self.root, self.platform_auth))
        app.include_router(create_owner_web_router(self.root))
        self.client = InProcessASGIClient(app)
        self.client.headers = {'X-Owner-Request': '1', 'Origin': 'http://test'}

    def tearDown(self):
        self.temp.cleanup()

    def login(self):
        response = self.client.post('/api/owner/login', json={'tenant_id': 'park-a',
            'login': self.credentials['login'], 'password': self.credentials['password']})
        self.assertEqual(response.status_code, 200, response.text)
        token = response.cookies.get(COOKIE)
        self.client.headers['Cookie'] = f'{COOKIE}={token}'
        return response, token

    def post(self, path, **body):
        return self.client.post('/api/owner' + path, json={'tenant_id': 'park-a', **body})

    def asset(self):
        response = self.post('/fleet/save', data={'name': 'Toyota', 'daily_rate': 800, 'public': True})
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()['asset']

    def test_login_cookie_no_plaintext_storage_or_platform_privilege(self):
        response, token = self.login()
        cookie = response.headers['set-cookie'].lower()
        for attribute in ('secure', 'httponly', 'samesite=strict', 'path=/api/owner'):
            self.assertIn(attribute, cookie)
        self.assertNotIn(token, response.text)
        raw = self.auth.path.read_text()
        self.assertNotIn(token, raw)
        self.assertNotIn(self.credentials['password'], raw)
        self.assertEqual(self.auth.path.stat().st_mode & 0o777, 0o600)
        context = self.auth.authenticate(token, 'park-a')
        self.assertEqual(context.roles, frozenset({'owner'}))
        self.assertEqual(self.client.get('/api/platform/tenants').status_code, 401)
        self.assertEqual(self.client.get('/api/platform/tenants', headers={'Authorization': f'Bearer {token}'}).status_code, 401)
        self.assertEqual(response.headers['cache-control'], 'private, no-store')

    def test_browser_owner_can_save_and_reload_private_license_plate(self):
        self.login()
        asset = self.asset()
        result = self.post('/fleet/details', asset_id=asset['id'], data={
            'section': 'specs', 'specs': {}, 'license_plate': 'กจ 2490 พังงา'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['asset']['license_plate'], 'กจ 2490 พังงา')
        listed = self.post('/fleet/list')
        self.assertEqual(listed.status_code, 200, listed.text)
        self.assertEqual(listed.json()['assets'][0]['license_plate'], 'กจ 2490 พังงา')

    def test_bot_independent_fleet_and_calendar_share_existing_records(self):
        self.login()
        asset = self.asset()
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list()[0].id, asset['id'])
        response = self.post('/fleet/list')
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['tenant']['tenant_id'], 'park-a')
        start = (datetime.now() + timedelta(days=2)).date().isoformat()
        end = (datetime.now() + timedelta(days=5)).date().isoformat()
        response = self.post('/calendar/manual', asset_id=asset['id'], start_date=start, end_date=end,
                             request_id='browser-manual-123456', customer_name='Somchai', booking_status='requested')
        self.assertEqual(response.status_code, 200, response.text)
        booking = response.json()['booking']
        calendar = self.post('/calendar')
        self.assertEqual(calendar.status_code, 200, calendar.text)
        self.assertEqual(calendar.json()['bookings'][0]['id'], booking['id'])
        self.assertEqual(self.post('/bookings/status', booking_id=booking['id'], status='confirmed', expected_status='requested').status_code, 200)
        self.assertEqual(self.post('/bookings/status', booking_id=booking['id'], status='cancelled', expected_status='requested').status_code, 409)

    def test_foreign_tenant_asset_media_and_forged_role_denied(self):
        self.login()
        foreign = TenantAssetAdmin(self.root, self.admin, 'park-b').save(AssetInput(name='Foreign'))
        before = (self.root / 'tenants/park-b/assets.json').read_bytes()
        for path in ('/fleet/list', '/calendar'):
            self.assertEqual(self.post(path, tenant_id='park-b').status_code, 401)
        self.assertEqual(self.post('/fleet/save', asset_id=foreign.id, data={'name': 'Wrong'}).status_code, 404)
        self.assertEqual(self.post('/fleet/media', reference='../park-b/media/logo.webp').status_code, 404)
        self.assertEqual(self.post('/fleet/list', role='platform_admin').status_code, 422)
        self.assertEqual((self.root / 'tenants/park-b/assets.json').read_bytes(), before)

    def test_password_change_optional_and_revokes_other_sessions(self):
        _, first = self.login()
        _, second = self.login()
        self.assertEqual(self.post('/fleet/list').status_code, 200)  # No forced password change.
        response = self.post('/password', old_password=self.credentials['password'], new_password='new secure password 123')
        self.assertEqual(response.status_code, 200, response.text)
        fresh = response.cookies.get(COOKIE)
        for token in (first, second):
            with self.assertRaises(OwnerAuthenticationError):
                self.auth.authenticate(token, 'park-a')
        self.assertEqual(self.auth.authenticate(fresh, 'park-a').tenant_id, 'park-a')
        with self.assertRaises(OwnerAuthenticationError):
            self.auth.login('park-a', self.credentials['login'], self.credentials['password'], 'test')

    def test_reset_invalidates_stale_service_and_logout_invalidates_token(self):
        _, token = self.login()
        service = TenantAssetAdmin.for_web_owner(self.auth, token, 'park-a')
        self.auth.issue(self.admin, 'park-a', reset=True)
        with self.assertRaises(OwnerAuthenticationError):
            service.save(AssetInput(name='Must not be written'))
        self.assertEqual(TenantAssetAdmin(self.root, self.admin, 'park-a').list(), [])
        self.credentials = self.auth.issue(self.admin, 'park-a', reset=True)
        _, token = self.login()
        self.assertEqual(self.client.post('/api/owner/logout', json={}).status_code, 200)
        self.assertEqual(self.post('/calendar').status_code, 401)

    def test_csrf_guards(self):
        self.login()
        for headers in ({'Origin': 'https://evil.example'}, {'X-Owner-Request': ''}, {'sec-fetch-site': 'cross-site'}):
            response = self.client.post('/api/owner/fleet/list', json={'tenant_id': 'park-a'}, headers=headers)
            self.assertEqual(response.status_code, 403, response.text)

    def test_invalid_password_input_not_echoed_and_errors_uncacheable(self):
        secret = 'private-invalid-password-' * 10
        response = self.client.post('/api/owner/login', json={'tenant_id': 'park-a', 'login': 'x', 'password': secret})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn(secret, response.text)
        self.assertEqual(response.headers['cache-control'], 'private, no-store')
        self.login()
        response = self.post('/password', old_password='incorrect password', new_password='my new password 1234')
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.post('/fleet/list').status_code, 200)

    def test_expiry_and_suspended_park(self):
        now = [1000]
        auth = OwnerWebAuth(self.root, clock=lambda: now[0])
        token = auth.login('park-a', self.credentials['login'], self.credentials['password'], 'test')
        now[0] += auth.ttl + 1
        with self.assertRaises(OwnerAuthenticationError):
            auth.authenticate(token, 'park-a')
        self.login()
        with self.provisioner._locked():
            state = self.provisioner._load_state()
            state.tenants[0].status = 'suspended'
            self.provisioner._save_state(state)
        self.assertEqual(self.post('/fleet/list').status_code, 403)

    def test_admin_endpoints_protected_and_password_shown_only_on_issue(self):
        path = '/api/platform/tenants/park-a/owner-web'
        self.assertEqual(self.client.post(path, json={'reset': True}).status_code, 401)
        self.client.headers['Authorization'] = f'Bearer {self.platform_auth.issue_for_verified_actor("admin")}'
        metadata = self.client.get(path)
        self.assertEqual(metadata.status_code, 200, metadata.text)
        self.assertNotIn('password', metadata.json())
        self.assertEqual(self.client.post(path, json={}).status_code, 409)
        reset = self.client.post(path, json={'reset': True})
        self.assertEqual(reset.status_code, 200, reset.text)
        self.assertNotEqual(reset.json()['password'], self.credentials['password'])

    def test_persistent_parallel_rate_limit(self):
        def bad_login(_):
            try:
                OwnerWebAuth(self.root).login('park-a', self.credentials['login'], 'incorrect-password', 'test')
            except OwnerRateLimitError:
                return 'limited'
            except OwnerAuthenticationError:
                return 'invalid'
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(bad_login, range(12)))
        self.assertEqual(results.count('invalid'), 10)
        self.assertEqual(results.count('limited'), 2)


if __name__ == '__main__':
    unittest.main()
