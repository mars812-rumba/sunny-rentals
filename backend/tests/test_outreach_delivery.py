"""No service imports, real recipients, bot traffic or production file writes."""
import ast
import asyncio
import json
import tempfile
import threading
import time
import unittest
from datetime import datetime, UTC
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import Mock, patch

from fastapi import HTTPException
from fastapi.responses import JSONResponse
from outreach_delivery import ERROR_LABELS, TELEGRAM_DESCRIPTIONS, OutreachDeliveryError, failure_from_response
from customer_outreach_campaign import (append_event, load_campaign_state, select_recipient_batch, send_one)

ROOT = Path(__file__).resolve().parents[1]


def isolated_functions(filename, names, namespace):
    tree = ast.parse((ROOT / filename).read_text())
    selected = []
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name in names:
            node.decorator_list = []
            selected.append(node)
    assert len(selected) == len(names)
    exec(compile(ast.Module(body=selected, type_ignores=[]), filename, 'exec'), namespace)
    return namespace


class DeliveryTests(unittest.TestCase):
    def response(self, status, payload):
        return SimpleNamespace(status_code=status, json=lambda: payload)

    def test_permanent_errors_and_rolling_upgrade_detail(self):
        for code, description, reason in [
            (403, 'Forbidden: bot was blocked by the user', 'bot_blocked'),
            (403, 'Forbidden: user is deactivated', 'user_deactivated'),
            (400, 'Bad Request: chat not found', 'chat_not_found'),
        ]:
            for status, payload in [(code, {'error_code': code, 'description': description}),
                                    (500, {'detail': f'A request to the Telegram API was unsuccessful. Error code: {code}. Description: {description}'})]:
                failure = failure_from_response(self.response(status, payload))
                self.assertTrue(failure.permanent)
                self.assertEqual(failure.reason, reason)
                self.assertEqual(failure.error_code, code)

    def test_temporary_and_unknown_failures_are_not_excluded(self):
        for status, payload in [(500, {'detail': 'Telegram bot rejected the message'}),
                                (403, {'description': 'Forbidden: not enough rights'}),
                                (401, {}), (502, {}), (429, {'parameters': {'retry_after': 123}})]:
            failure = failure_from_response(self.response(status, payload))
            self.assertFalse(failure.permanent)
            if status == 429:
                self.assertEqual(failure.retry_after, 123)
        self.assertEqual(OutreachDeliveryError(429, 'Too Many Requests: retry after 120').retry_after, 120)

    def test_raw_secrets_do_not_escape_in_errors(self):
        failure = OutreachDeliveryError.from_exception(RuntimeError('https://api.telegram.org/bot123456:SECRET/sendMessage'))
        self.assertNotIn('SECRET', json.dumps(failure.as_event()))

    def test_fold_and_queue_skip_permanent_but_preserve_legacy_and_transient(self):
        with tempfile.TemporaryDirectory() as directory:
            log = Path(directory) / 'campaign.jsonl'
            events = [
                {'user_id': 1, 'delivered': True, 'claude_active': False},
                {'user_id': 2, **OutreachDeliveryError(403, 'bot was blocked by the user').as_event()},
                {'user_id': 3, 'error': 'Telegram bot rejected the message'},
                {'user_id': 4, **OutreachDeliveryError(502).as_event()},
                {'user_id': 5, 'permanent_failure': True, 'error_reason': 'made_up'},
            ]
            for event in events:
                append_event(log, event)
            state = load_campaign_state(log)
            recipients = {i: {'updated_at': f'2026-10-{20-i:02d}T00:00:00'} for i in range(1, 7)}
            batch = [i for i, _ in select_recipient_batch(recipients, state, 30)]
            self.assertEqual(batch, [5, 6, 3, 4])
            self.assertFalse(state[3].get('excluded'))
            self.assertFalse(state[4].get('excluded'))
            self.assertTrue(state[1]['delivered'])

    def test_cli_activation_failure_keeps_delivery_receipt(self):
        session = Mock()
        session.post.return_value = self.response(200, {'status': 'ok', 'sent_via_bot': True})
        with patch('customer_outreach_campaign.activate_claude', side_effect=RuntimeError('test')):
            result = send_one(session, 'http://test.invalid', 1, 'fixture')
        self.assertTrue(result['delivered'])
        self.assertFalse(result['claude_active'])
        session.post.assert_called_once()

    def test_bot_adapter_structured_response_without_importing_bot(self):
        bot = Mock()
        error = RuntimeError('private SDK error')
        error.result_json = {'error_code': 403, 'description': 'Forbidden: bot was blocked by the user'}
        bot.send_message.side_effect = error
        ns = isolated_functions('telegram_bot.py', {'internal_send_message'}, {
            'Request': object, 'HTTPException': HTTPException, 'JSONResponse': JSONResponse,
            'bot': bot, 'OutreachDeliveryError': OutreachDeliveryError, 'TELEGRAM_DESCRIPTIONS': TELEGRAM_DESCRIPTIONS,
        })
        async def payload(): return {'user_id': 1, 'text': 'fixture'}
        response = asyncio.run(ns['internal_send_message'](SimpleNamespace(json=payload)))
        self.assertEqual(response.status_code, 403)
        self.assertTrue(json.loads(response.body)['permanent_failure'])
        bot.send_message.assert_called_once_with(1, 'fixture')


class CampaignRouteTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.log = self.root / 'campaign.jsonl'
        self.recipients = {i: {'updated_at': f'2026-10-{20-i:02d}T00:00:00'} for i in range(1, 8)}
        self.deliver = Mock(return_value=True)
        self.ns = isolated_functions('web_integration.py', {'send_outreach_batch', '_outreach_status_payload'}, {
            'Dict': dict, 'Any': object, 'OutreachSendRequest': object, 'Depends': lambda x: None,
            'admin_required': None, 'HTTPException': HTTPException, 'datetime': datetime, 'UTC': UTC,
            'time': SimpleNamespace(time=time.time, sleep=lambda _: None),
            'json': json, '_outreach_campaign_lock': threading.Lock(), 'DATA': self.root,
            'OUTREACH_LOG_JSONL': self.log, 'CHAT_LOGS_JSONL': self.root / 'chats.jsonl',
            'OUTREACH_CAMPAIGN_ID': 'fixture', 'OUTREACH_BATCH_MAX': 100, 'OUTREACH_GREETING': 'fixture',
            'load_outreach_recipients': lambda _: self.recipients, 'load_campaign_state': load_campaign_state,
            'select_recipient_batch': select_recipient_batch, 'append_outreach_event': append_event,
            'OutreachDeliveryError': OutreachDeliveryError, 'ERROR_LABELS': ERROR_LABELS,
            '_deliver_outreach_greeting': self.deliver, '_ensure_outreach_user_in_crm': Mock(),
            'update_dialog_status': Mock(return_value=True), 'notify_bot_status_sync': Mock(),
            'log_dialog_event': Mock(),
        })

    def send(self, count=3):
        return self.ns['send_outreach_batch'](SimpleNamespace(count=count))

    def test_permanent_failures_advance_queue_and_do_not_activate_claude(self):
        self.deliver.side_effect = [OutreachDeliveryError(403, 'bot was blocked by the user'),
                                    OutreachDeliveryError(403, 'user is deactivated'), True]
        first = self.send()
        self.assertEqual((first['delivered'], first['permanent_failed']), (1, 2))
        self.assertEqual(first['campaign']['remaining'], 4)
        self.assertEqual(first['campaign']['excluded'], 2)
        self.assertEqual(len(first['error_summary']), 2)
        self.ns['update_dialog_status'].assert_called_once_with(3, claude_status='active')
        self.deliver.reset_mock(side_effect=True)
        self.deliver.return_value = True
        second = self.send()
        self.assertEqual([c.args[0] for c in self.deliver.call_args_list], [4, 5, 6])
        self.assertEqual(second['delivered'], 3)

    def test_rate_limit_stops_batch_and_next_click_cannot_bypass_pause(self):
        self.deliver.side_effect = OutreachDeliveryError(429, retry_after=120)
        result = self.send()
        self.assertEqual(result['attempted'], 1)
        self.assertEqual(result['campaign']['remaining'], 7)
        self.assertGreater(result['campaign']['retry_after'], 0)
        with self.assertRaises(HTTPException) as error:
            self.send()
        self.assertEqual(error.exception.status_code, 429)
        self.deliver.assert_called_once()
        self.assertFalse(self.ns['_outreach_campaign_lock'].locked())

    def test_transport_failure_is_retryable_and_fresh_recipients_go_first(self):
        self.deliver.side_effect = RuntimeError('connection refused')
        result = self.send()
        self.assertEqual(result['attempted'], 1)
        self.assertEqual(result['campaign']['excluded'], 0)
        self.assertEqual(result['campaign']['remaining'], 7)
        self.deliver.reset_mock(side_effect=True)
        self.deliver.return_value = True
        self.send()
        self.assertEqual([c.args[0] for c in self.deliver.call_args_list], [2, 3, 4])

    def test_activation_retry_does_not_send_a_duplicate_greeting(self):
        self.ns['update_dialog_status'].side_effect = [False, True, True]
        first = self.send(1)
        self.assertEqual(first['delivered'], 1)
        self.assertEqual(first['error_counts'], {'activation_failed': 1})
        self.deliver.reset_mock()
        second = self.send(1)
        self.assertEqual(second['activation_retried'], 1)
        self.deliver.assert_called_once_with(2)

    def test_delivery_adapter_rejects_non_ok_200(self):
        ns = isolated_functions('web_integration.py', {'_deliver_outreach_greeting'}, {
            'os': SimpleNamespace(getenv=lambda *args: 'http://fixture.invalid'),
            'requests': SimpleNamespace(post=Mock(return_value=SimpleNamespace(status_code=200, json=lambda: {'status': 'error'}))),
            'OUTREACH_GREETING': 'fixture', 'OutreachDeliveryError': OutreachDeliveryError,
            'failure_from_response': failure_from_response,
        })
        with self.assertRaises(OutreachDeliveryError):
            ns['_deliver_outreach_greeting'](1)


if __name__ == '__main__':
    unittest.main()
