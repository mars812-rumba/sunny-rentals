import ast
import copy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import tempfile
import unittest

from crm_time import crm_datetime, crm_sort_time


class FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return cls(2026, 10, 11, 12, tzinfo=timezone.utc).astimezone(tz)


class CRMTimeTests(unittest.TestCase):
    def test_naive_z_and_offsets_normalize_to_the_same_instant(self):
        expected = datetime(2026, 10, 11, 12, tzinfo=timezone.utc)
        for value in ['2026-10-11T12:00:00', '2026-10-11T12:00:00Z',
                      '2026-10-11T12:00:00+00:00', '2026-10-11T19:00:00+07:00',
                      '2026-10-11T07:00:00-05:00']:
            self.assertEqual(crm_datetime(value), expected)
        for value in [None, '', 'not-a-date', 42, {}, '2026-02-30']:
            self.assertIsNone(crm_datetime(value))
        self.assertLess(crm_sort_time(None), expected)

    def test_timestamp_order_uses_instants_not_lexical_offsets(self):
        values = ['2026-10-11T18:00:00+07:00', '2026-10-11T12:00:00Z']
        self.assertEqual(sorted(values, key=crm_sort_time, reverse=True), values[::-1])

    def endpoints(self, records, root):
        # Exercise actual handlers without importing startup code or touching production.
        source = Path(__file__).resolve().parents[1] / 'web_integration.py'
        tree = ast.parse(source.read_text())
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef)
                 and node.name in {'get_crm_users', 'get_crm_stats', 'get_archive_users', 'build_crm_booking_index'}]
        for node in nodes:
            node.decorator_list = []
        namespace = {
            'datetime': FixedDatetime, 'timedelta': timedelta, 'UTC': timezone.utc,
            'crm_datetime': crm_datetime, 'crm_sort_time': crm_sort_time,
            'Query': lambda default, **kwargs: default, 'json': json,
            'List': list, 'Dict': dict, 'load_bookings': lambda: [],
            'USER_DATA_JSON': root / 'users.json', 'ARCHIVE_JSON': root / 'archive.json',
            'DATA': root, 'CHAT_LOGS_JSONL': root / 'chat.jsonl',
            'load_json': lambda path: copy.deepcopy(records),
            'get_fast_dialog_map': lambda: {}, 'read_jsonl_tail': lambda *args: [],
            'check_user_has_active_booking': lambda uid: False,
            'check_user_has_confirmed_booking': lambda uid: False,
            'get_user_last_booking': lambda uid: None,
        }
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), namespace)
        return namespace

    def test_users_and_counters_accept_mixed_dates_in_every_period(self):
        records = [
            {'user_id': 1, 'status': 'new', 'updated_at': '2026-10-11T11:00:00'},
            {'user_id': 2, 'status': 'in_work', 'updated_at': '2026-10-11T11:30:00+00:00'},
            {'user_id': 3, 'status': 'pre_booking', 'updated_at': '2026-10-11T18:45:00+07:00'},
            {'user_id': 4, 'status': 'confirmed', 'created_at': '2026-10-11T11:50:00Z'},
            {'user_id': 5, 'status': 'new', 'updated_at': 'broken'},
            {'user_id': 6, 'status': 'new', 'updated_at': '2026-10-11T11:00:00Z', 'archived': True},
        ]
        original = copy.deepcopy(records)
        with tempfile.TemporaryDirectory() as directory:
            endpoints = self.endpoints(records, Path(directory))
            for period in ['all', 'today', 'week', 'month']:
                users = endpoints['get_crm_users'](period=period)
                self.assertEqual(users['status'], 'ok')
                self.assertEqual([user['user_id'] for user in users['users']], [4, 3, 2, 1])
                stats = endpoints['get_crm_stats'](period=period)
                self.assertEqual(stats['status'], 'ok')
                for status in ['new', 'in_work', 'pre_booking', 'confirmed', 'archive']:
                    self.assertEqual(stats['stats'][status], 1)
            self.assertEqual(len(endpoints['get_crm_users'](status='new')['users']), 1)
        self.assertEqual(records, original)

    def test_offset_date_is_filtered_by_utc_instant(self):
        records = [{'user_id': 1, 'status': 'new', 'updated_at': '2026-10-11T01:00:00+07:00'}]
        with tempfile.TemporaryDirectory() as directory:
            endpoints = self.endpoints(records, Path(directory))
            self.assertEqual(endpoints['get_crm_stats'](period='today')['stats']['new'], 0)
            self.assertEqual(endpoints['get_crm_stats'](period='all')['stats']['new'], 1)

    def test_archive_includes_recent_aware_and_naive_entries(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            archive = [
                {'user_id': 1, 'archived_at': '2026-10-11T11:00:00+00:00'},
                {'user_id': 2, 'archived_at': '2026-10-11T10:00:00'},
                {'user_id': 3, 'archived_at': '2025-01-01T00:00:00Z'},
                {'user_id': 4, 'archived_at': 'broken'},
            ]
            file = root / 'archive.json'
            file.write_text(json.dumps(archive))
            before = file.read_bytes()
            endpoints = self.endpoints([], root)
            for period in ['week', 'month']:
                result = endpoints['get_archive_users'](period=period)
                self.assertEqual(result['status'], 'ok')
                self.assertEqual([user['user_id'] for user in result['users']], [1, 2])
            self.assertEqual(file.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
