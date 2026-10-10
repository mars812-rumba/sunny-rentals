"""Shared-bot contracts, only fake Telegram and temporary data-v2 storage."""

from concurrent.futures import ThreadPoolExecutor
import hashlib
import hmac
import json
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urlencode
from unittest.mock import patch

from fastapi import FastAPI
from test_platform_asset_admin import InProcessASGIClient
from platform_core import PlatformAdminAuth, PlatformContext, TenantProvisionRequest, TenantProvisioner
from platform_core.partner_bot import PartnerBotConfig, PartnerBotError, PartnerBotService, PartnerDeliveryError, TelegramPartnerTransport
from platform_partner_api import create_platform_partner_router, mount_platform_partner_api


class FakeTransport:
    def __init__(self):
        self.sent = []
        self.fail = False

    def send(self, payload):
        if self.fail:
            raise PartnerDeliveryError('Delivery failed')
        self.sent.append(payload)


class PartnerBotTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / 'data-v2'
        self.now = 100000
        self.admin = PlatformContext.for_admin('1')
        self.auth = PlatformAdminAuth('a' * 32, ['1'], clock=lambda: self.now)
        self.config = PartnerBotConfig('555:' + 'b' * 30, 'partners_test_bot', 'c' * 32, 'https://example.com')
        self.transport = FakeTransport()
        self.service = PartnerBotService(self.root, self.config, self.transport, clock=lambda: self.now)
        for slug in ('park-a', 'park-b'):
            self.service.provisioner.create_tenant(self.admin, TenantProvisionRequest(name=slug, slug=slug))
            self.service.provisioner.publish_tenant(self.admin, slug)
        app = FastAPI()
        app.include_router(create_platform_partner_router(self.service, self.auth))
        self.client = InProcessASGIClient(app)
        self.header = {'X-Telegram-Bot-Api-Secret-Token': self.config.webhook_secret}

    def tearDown(self):
        self.temp.cleanup()

    def state(self):
        return self.service.provisioner._load_state()

    def update(self, parameter, uid=42, update_id=100):
        return {'update_id': update_id, 'message': {
            'from': {'id': uid, 'is_bot': False, 'first_name': 'Test'},
            'chat': {'id': uid, 'type': 'private'}, 'text': f'/start {parameter}'}}

    def token(self, uid=42, bot_token=None):
        values = {'auth_date': str(self.now), 'user': json.dumps({'id': uid})}
        key = hmac.new(b'WebAppData', (bot_token or self.config.token).encode(), hashlib.sha256).digest()
        values['hash'] = hmac.new(key, '\n'.join(f'{k}={v}' for k, v in sorted(values.items())).encode(), hashlib.sha256).hexdigest()
        return urlencode(values)

    def invite(self, park='park-a', **kwargs):
        return self.service.invite(self.admin, park, **kwargs)['url'].split('start=')[1]

    def identity(self, park='park-a', **kwargs):
        return self.client.post('/api/partners/identity', json={'tenant_id': park, 'init_data': self.token(**kwargs)})

    def test_default_mount_does_not_read_or_write_anything(self):
        self.assertFalse(mount_platform_partner_api(FastAPI(), Path(self.temp.name) / 'unused', {}))
        self.assertFalse((Path(self.temp.name) / 'unused').exists())

    def test_enabled_without_credentials_fails_closed(self):
        with self.assertRaises(ValueError):
            mount_platform_partner_api(FastAPI(), self.root, {'PLATFORM_PARTNERS_BOT_ENABLED': 'true'})

    def test_env_names_and_secret_not_in_repr(self):
        config = PartnerBotConfig.from_env({'PLATFORM_PARTNERS_BOT_TOKEN': self.config.token,
            'PLATFORM_BOT_NAME': '@partners_test_bot', 'PLATFORM_PARTNERS_WEBHOOK_SECRET': 'c' * 32})
        self.assertEqual(config.username, self.config.username)
        self.assertNotIn(config.token, repr(config))

    def test_webhook_requires_secret_and_bounds_body(self):
        before = self.service.provisioner.state_path.read_bytes()
        self.assertEqual(self.client.post('/api/partners/webhook', json=self.update('ppark-a')).status_code, 403)
        self.assertEqual(self.service.provisioner.state_path.read_bytes(), before)
        self.assertEqual(self.client.post('/api/partners/webhook', content='x' * 65537, headers=self.header).status_code, 413)
        self.assertEqual(self.client.post('/api/partners/webhook', json=[], headers=self.header).status_code, 400)

    def test_public_link_no_membership_and_verified_identity(self):
        link = self.client.get('/api/partners/parks/park-a/bot-link')
        self.assertEqual(link.json()['url'], 'https://t.me/partners_test_bot?start=ppark-a')
        result = self.client.post('/api/partners/webhook', json=self.update('ppark-a'), headers=self.header)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.state().memberships, [])
        self.assertEqual(self.identity().json()['role'], 'customer')
        self.assertEqual(self.identity('park-b').status_code, 403)
        self.assertEqual(self.identity(bot_token='123:other-bot').status_code, 403)
        self.assertEqual(self.identity(uid=43).status_code, 403)
        self.assertEqual(self.transport.sent[0]['reply_markup']['inline_keyboard'][0][0]['web_app']['url'], 'https://example.com/p/park-a')

    def test_invite_is_protected_and_once(self):
        url = '/api/partners/parks/park-a/owner-invitations'
        self.assertEqual(self.client.post(url, json={}).status_code, 401)
        response = self.client.post(url, json={}, headers={'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')})
        code = response.json()['url'].split('start=')[1]
        self.assertLessEqual(len(code), 64)
        self.assertNotIn(code, self.service.provisioner.state_path.read_text())
        self.service.handle_update(self.update(code))
        self.assertEqual(self.identity().json()['role'], 'owner')
        self.service.handle_update(self.update(code, uid=43, update_id=101))
        self.assertEqual(len(self.state().memberships), 1)
        self.assertEqual(self.identity(uid=43).status_code, 403)
        with self.assertRaises(PartnerBotError):
            self.service.resolve_identity('park-b', self.token(), require_owner=True)

    def test_expected_recipient_and_expiry(self):
        code = self.invite(expected_user_id='43')
        self.service.handle_update(self.update(code))
        self.assertEqual(self.state().memberships, [])
        self.now += self.service.INVITATION_TTL
        self.service.handle_update(self.update(code, uid=43, update_id=101))
        self.assertEqual(self.state().memberships, [])

    def test_valid_recipient_consumes_bound_invitation(self):
        self.service.handle_update(self.update(self.invite(expected_user_id='42')))
        self.assertEqual(self.identity().json()['role'], 'owner')

    def test_invitation_lasts_a_day_and_expires_exactly_at_boundary(self):
        invitation = self.service.invite(self.admin, 'park-a')
        self.assertEqual(invitation['expires_in'], 86400)
        code = invitation['url'].split('start=')[1]
        self.now += 86400 - 1
        self.service.handle_update(self.update(code))
        self.assertEqual(self.identity().json()['role'], 'owner')
        other = self.invite('park-b')
        self.now += 86400
        self.service.handle_update(self.update(other, update_id=101))
        self.assertNotIn('reply_markup', self.transport.sent[-1])
        self.assertEqual(len(self.state().memberships), 1)

    def test_consumed_link_reopens_for_active_owner_even_after_expiry(self):
        code = self.invite()
        self.service.handle_update(self.update(code))
        self.now += 86400 + 1
        self.service.handle_update(self.update(code, update_id=101))
        self.assertIn('reply_markup', self.transport.sent[-1])
        self.assertEqual(self.identity().json()['role'], 'owner')
        self.assertEqual(len(self.state().memberships), 1)
        self.service.handle_update(self.update(code, uid=43, update_id=102))
        self.assertNotIn('reply_markup', self.transport.sent[-1])
        self.assertEqual(self.identity(uid=43).status_code, 403)

    def test_consumed_link_cannot_reactivate_revoked_owner(self):
        code = self.invite()
        self.service.handle_update(self.update(code))
        self.service.revoke_owner(self.admin, 'park-a', '42')
        self.service.handle_update(self.update(code, update_id=101))
        self.assertNotIn('reply_markup', self.transport.sent[-1])
        self.assertEqual(self.identity().json()['role'], 'customer')
        self.now += 86400 + 1
        self.service.handle_update(self.update(code, update_id=102))
        self.assertNotIn('reply_markup', self.transport.sent[-1])

    def test_consumed_link_revocation_removes_shortcut_not_membership(self):
        invitation = self.service.invite(self.admin, 'park-a')
        code = invitation['url'].split('start=')[1]
        self.service.handle_update(self.update(code))
        self.service.revoke_invite(self.admin, 'park-a', invitation['invitation_id'])
        self.service.handle_update(self.update(code, update_id=101))
        self.assertNotIn('reply_markup', self.transport.sent[-1])
        self.assertEqual(self.identity().json()['role'], 'owner')

    def test_replay_and_parallel_invite_only_one_member(self):
        code = self.invite()
        with ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(self.service.handle_update, [self.update(code, uid=i, update_id=i) for i in range(42, 46)]))
        self.assertEqual(len(self.state().memberships), 1)
        winner = self.state().memberships[0].user_id.split(':')[-1]
        self.assertEqual(len(self.transport.sent), 4)
        self.service.handle_update(self.update(code, uid=int(winner), update_id=int(winner)))
        self.assertEqual(len(self.transport.sent), 4)

    def test_failed_delivery_retries_reply_not_invitation(self):
        update = self.update(self.invite())
        self.transport.fail = True
        self.assertEqual(self.client.post('/api/partners/webhook', json=update, headers=self.header).status_code, 503)
        self.assertEqual(len(self.state().memberships), 1)
        self.transport.fail = False
        self.assertEqual(self.client.post('/api/partners/webhook', json=update, headers=self.header).status_code, 200)
        self.assertEqual(len(self.state().memberships), 1)
        self.assertIn('Доступ владельца', self.transport.sent[0]['text'])

    def test_revocation_is_immediate(self):
        self.service.handle_update(self.update(self.invite()))
        with self.service.provisioner._locked():
            state = self.state()
            state.memberships[0].active = False
            self.service.provisioner._save_state(state)
        self.assertEqual(self.identity().json()['role'], 'customer')
        with self.assertRaises(PartnerBotError):
            self.service.resolve_identity('park-a', self.token(), require_owner=True)

    def test_client_may_open_two_parks_without_mixing_identity(self):
        self.service.handle_update(self.update('ppark-a'))
        self.service.handle_update(self.update('ppark-b', update_id=101))
        self.assertEqual(len(self.state().partner_bot.identities), 2)
        self.assertEqual(self.identity('park-a').json()['tenant_id'], 'park-a')
        self.assertEqual(self.identity('park-b').json()['tenant_id'], 'park-b')
        self.service.handle_update(self.update('', update_id=102))
        self.assertNotIn('reply_markup', self.transport.sent[-1])

    def test_groups_spoofed_chat_and_malformed_sender_cannot_claim(self):
        code = self.invite()
        updates = [self.update(code, update_id=i) for i in range(100, 103)]
        updates[0]['message']['chat']['type'] = 'supergroup'
        updates[1]['message']['chat']['id'] = 99
        updates[2]['message']['from'] = []
        for update in updates:
            self.service.handle_update(update)
        self.assertEqual(self.state().memberships, [])
        self.assertEqual(self.transport.sent, [])

    def test_draft_and_suspended_park_no_public_link(self):
        self.service.provisioner.create_tenant(self.admin, TenantProvisionRequest(name='Draft', slug='draft'))
        self.assertEqual(self.client.get('/api/partners/parks/draft/bot-link').status_code, 404)
        self.service.handle_update(self.update(self.invite('draft')))
        self.assertNotIn('reply_markup', self.transport.sent[-1])
        with self.service.provisioner._locked():
            state = self.state()
            state.tenants[0].status = 'suspended'
            self.service.provisioner._save_state(state)
        self.assertEqual(self.client.get('/api/partners/parks/park-a/bot-link').status_code, 404)
        self.assertEqual(self.identity().status_code, 403)

    def test_provisioning_keeps_bot_state(self):
        self.service.handle_update(self.update(self.invite()))
        self.service.provisioner.create_tenant(self.admin, TenantProvisionRequest(name='Third', slug='third'))
        self.assertEqual(self.identity().json()['role'], 'owner')
        self.assertEqual(len(self.state().partner_bot.invitations), 1)

    def test_transaction_failure_leaves_invite_unused(self):
        code = self.invite()
        with patch.object(self.service.provisioner, '_save_state', side_effect=OSError('test disk failure')):
            with self.assertRaises(OSError):
                self.service.handle_update(self.update(code))
        self.assertEqual(self.state().memberships, [])
        self.service.handle_update(self.update(code))
        self.assertEqual(len(self.state().memberships), 1)

    def test_real_transport_does_not_leak_token_on_failure(self):
        import requests
        with patch('platform_core.partner_bot.requests.post', side_effect=requests.RequestException(self.config.token)):
            with self.assertRaises(PartnerDeliveryError) as error:
                TelegramPartnerTransport(self.config).send({'chat_id': 42, 'text': 'test'})
        self.assertNotIn(self.config.token, str(error.exception))

    def test_invitation_and_owner_revocation_api_are_scoped(self):
        invitation = self.service.invite(self.admin, 'park-a')
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        path = '/api/partners/parks/park-a/owner-invitations/' + invitation['invitation_id']
        self.assertEqual(self.client.delete(path).status_code, 401)
        self.assertEqual(self.client.delete(path.replace('park-a', 'park-b'), headers=headers).status_code, 404)
        self.assertEqual(self.client.delete(path, headers=headers).status_code, 200)
        self.service.handle_update(self.update(invitation['url'].split('start=')[1]))
        self.assertEqual(self.state().memberships, [])
        self.service.handle_update(self.update(self.invite(), update_id=101))
        owner_path = '/api/partners/parks/park-a/owners/42'
        self.assertEqual(self.client.delete(owner_path.replace('park-a', 'park-b'), headers=headers).status_code, 404)
        self.assertEqual(self.client.delete(owner_path, headers=headers).status_code, 200)
        self.assertEqual(self.identity().json()['role'], 'customer')

    def test_corrupt_cross_tenant_identity_is_denied(self):
        self.service.handle_update(self.update('ppark-a'))
        with self.service.provisioner._locked():
            state = self.state()
            state.partner_bot.identities[self.service.identity_key('park-a', '42')].tenant_id = 'park-b'
            self.service.provisioner._save_state(state)
        self.assertEqual(self.identity().status_code, 403)


if __name__ == '__main__':
    unittest.main()
