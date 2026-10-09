import json
import unittest
from unittest.mock import Mock

from fastapi import FastAPI
import requests
import test_platform_partner_bot as fixtures
from test_platform_asset_admin import InProcessASGIClient
from platform_core.partner_webhook import PartnerWebhookManager, WebhookConflict, WebhookSetupError
from platform_partner_api import create_platform_partner_router


class PartnerWebhookTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.PartnerBotTests()
        self.fixture.setUp()
        self.config = self.fixture.config
        self.url = ''
        self.calls = []
        self.username = self.config.username
        self.manager = PartnerWebhookManager(self.config, self.post)

    def tearDown(self):
        self.fixture.tearDown()

    def post(self, url, **kwargs):
        method = url.rsplit('/', 1)[1]
        self.calls.append((method, kwargs))
        if method == 'getMe':
            result = {'id': int(self.config.bot_id), 'is_bot': True, 'username': self.username}
        elif method == 'getWebhookInfo':
            result = {'url': self.url, 'pending_update_count': 3,
                      'last_error_message': self.config.token + self.config.webhook_secret}
        elif method == 'setWebhook':
            self.url = kwargs['json']['url']
            result = True
        else:
            raise AssertionError(method)
        return Mock(json=lambda: {'ok': True, 'result': result}, raise_for_status=lambda: None)

    def test_status_does_not_mutate_or_expose_secrets(self):
        status = self.manager.status()
        self.assertEqual(status['state'], 'not_set')
        self.assertEqual(status['pending_updates'], 3)
        self.assertTrue(status['delivery_error'])
        self.assertNotIn(self.config.token, json.dumps(status))
        self.assertNotIn(self.config.webhook_secret, json.dumps(status))
        self.assertNotIn('setWebhook', [m for m, _ in self.calls])

    def test_connect_uses_fixed_url_secret_and_preserves_queue(self):
        self.assertEqual(self.manager.connect()['state'], 'configured')
        payload = next(k['json'] for m, k in self.calls if m == 'setWebhook')
        self.assertEqual(payload, {'url': self.manager.target,
            'secret_token': self.config.webhook_secret, 'allowed_updates': ['message'],
            'drop_pending_updates': False})
        self.assertTrue(all(k['allow_redirects'] is False and k['timeout'] == (3, 7) for _, k in self.calls))

    def test_connect_reapplies_secret_to_same_url(self):
        self.url = self.manager.target
        self.manager.connect()
        self.assertEqual([m for m, _ in self.calls].count('setWebhook'), 1)

    def test_other_webhook_is_not_replaced_or_disclosed(self):
        self.url = 'https://elsewhere.example/private-secret'
        self.assertEqual(self.manager.status()['state'], 'other')
        self.assertNotIn(self.url, json.dumps(self.manager.status()))
        with self.assertRaises(WebhookConflict):
            self.manager.connect()
        self.assertNotIn('setWebhook', [m for m, _ in self.calls])

    def test_wrong_bot_blocks_connect(self):
        self.username = 'wrong_bot'
        with self.assertRaises(WebhookSetupError):
            self.manager.connect()
        self.assertNotIn('setWebhook', [m for m, _ in self.calls])

    def test_upstream_errors_are_sanitized(self):
        self.manager.post = Mock(side_effect=requests.ConnectionError(self.config.token))
        with self.assertRaises(WebhookSetupError) as caught:
            self.manager.status()
        self.assertNotIn(self.config.token, str(caught.exception))
        self.manager.post = Mock(return_value=Mock(raise_for_status=lambda: None, json=lambda: {'ok': False, 'description': self.config.token}))
        with self.assertRaises(WebhookSetupError):
            self.manager.status()

    def client(self):
        app = FastAPI()
        app.include_router(create_platform_partner_router(self.fixture.service, self.fixture.auth, self.manager))
        return InProcessASGIClient(app)

    def test_endpoints_require_admin_before_network(self):
        client = self.client()
        for method, path in [('get', '/api/partners/admin/webhook'), ('post', '/api/partners/admin/webhook/connect')]:
            self.assertEqual(getattr(client, method)(path).status_code, 401)
        self.assertEqual(self.calls, [])

    def test_admin_status_connect_and_conflict(self):
        client = self.client()
        headers = {'Authorization': 'Bearer ' + self.fixture.auth.issue_for_verified_actor('1')}
        status = client.get('/api/partners/admin/webhook', headers=headers)
        self.assertEqual(status.status_code, 200)
        self.assertEqual(status.headers['cache-control'], 'private, no-store')
        self.assertEqual(client.post('/api/partners/admin/webhook/connect', headers=headers).status_code, 200)
        self.url = 'https://other.example'
        self.assertEqual(client.post('/api/partners/admin/webhook/connect', headers=headers).status_code, 409)
        self.manager.post = Mock(side_effect=requests.Timeout(self.config.token))
        failure = client.get('/api/partners/admin/webhook', headers=headers)
        self.assertEqual(failure.status_code, 503)
        self.assertNotIn(self.config.token, failure.text)
