"""Isolated CRM reads: never import/start the app or write live customer data."""
import ast
from collections import Counter
from datetime import datetime, timedelta, UTC
import json
from pathlib import Path
import statistics
import sys
import tempfile
import time
from typing import Any, Dict, List, Optional, Union
import unittest

from fastapi import HTTPException, Query
from crm_time import crm_datetime, crm_sort_time
from jsonl_tail import read_jsonl_tail

SOURCE = Path(__file__).resolve().parents[1] / 'web_integration.py'
NAMES = {'load_bookings', 'check_user_has_active_booking', 'check_user_has_confirmed_booking',
         'get_user_last_booking', 'get_fast_dialog_map', 'get_crm_users', 'get_crm_stats',
         'build_crm_booking_index'}


def load_reads(source, data):
    counts = Counter()

    def read_json(path):
        counts[path.name] += 1
        return json.loads(path.read_text()) if path.exists() else []

    ns = dict(json=json, datetime=datetime, timedelta=timedelta, UTC=UTC,
              Dict=Dict, List=List, Optional=Optional, Union=Union, Any=Any,
              Query=Query, HTTPException=HTTPException, crm_datetime=crm_datetime,
              crm_sort_time=crm_sort_time, load_json=read_json, read_jsonl_tail=read_jsonl_tail,
              DATA=data, USER_DATA_JSON=data / 'user_data.json',
              BOOKINGS_FILE=data / 'bookings.json', CHAT_LOGS_JSONL=data / 'chat_logs.jsonl')
    nodes = [node for node in ast.parse(source.read_text()).body
             if isinstance(node, ast.FunctionDef) and node.name in NAMES]
    for node in nodes:
        node.decorator_list = []
    exec(compile(ast.Module(body=nodes, type_ignores=[]), str(source), 'exec'), ns)
    return ns, counts


class CRMJsonPerformanceTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        self.ns, self.counts = load_reads(SOURCE, self.root)
        self.users = [dict(user_id=1, status='new', created_at='2026-10-01'),
                      dict(user_id='2', status='confirmed', created_at='2026-10-02'),
                      dict(user_id=3, status='new', created_at='2026-10-03'),
                      dict(user_id='web_session_a', status='pre_booking', created_at='2026-10-03'),
                      dict(user_id='web_session_b', status='new', created_at='2026-10-03'),
                      dict(user_id=4, status='new', created_at='2026-10-03', archived=True),
                      dict(user_id=5, status='new', created_at='invalid')]
        self.bookings = [dict(id='old', user_id='1', status='confirmed', created_at='2026-01-01'),
                         dict(id='latest', user_id=1, status='rejected', created_at='2026-02-01'),
                         dict(id='equal', user_id='1', status='cancelled', created_at='2026-02-01'),
                         dict(id='pending', user_id=2, status='pre_booking'),
                         dict(id='orphan', user_id=None, status='confirmed')]
        self.write('user_data.json', self.users)
        self.write('bookings.json', self.bookings)

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value))

    def test_users_match_existing_booking_helpers_and_read_bookings_once(self):
        result = self.ns['get_crm_users']()
        self.assertEqual(result['status'], 'ok')
        self.assertEqual(self.counts['bookings.json'], 1)
        self.assertEqual({str(u['user_id']) for u in result['users']}, {'1', '2', '3', 'web_session_a'})
        for user in result['users']:
            uid = user['user_id']
            self.assertEqual(user['has_active_booking'], self.ns['check_user_has_active_booking'](uid))
            self.assertEqual(user['last_booking'], self.ns['get_user_last_booking'](uid))
        self.assertEqual(next(u for u in result['users'] if u['user_id'] == 1)['last_booking']['id'], 'latest')

    def test_confirmed_filter_and_status_filter_preserve_semantics(self):
        result = self.ns['get_crm_users'](has_confirmed_booking=True)
        self.assertEqual([u['user_id'] for u in result['users']], [1])
        self.assertEqual(self.counts['bookings.json'], 1)
        result = self.ns['get_crm_users'](status='confirmed')
        self.assertEqual([u['user_id'] for u in result['users']], ['2'])

    def test_next_request_sees_external_edits_and_response_mutation_cannot_poison_cache(self):
        self.ns['get_crm_users']()['users'].clear()
        self.write('bookings.json', [dict(user_id=3, status='confirmed', id='new')])
        result = self.ns['get_crm_users'](has_confirmed_booking=True)
        self.assertEqual([u['user_id'] for u in result['users']], [3])
        self.assertEqual(self.counts['bookings.json'], 2)

    def test_stats_index_preserves_first_duplicate_id_and_legacy_status_mapping(self):
        self.write('user_data.json', [dict(user_id=1, status='in_progress', created_at='2026-10-01'),
                                      dict(user_id='1', status='new', created_at='2026-10-01'),
                                      dict(user_id=2, status='hot', created_at='2026-10-01')])
        (self.root / 'chat_logs.jsonl').write_text('\n'.join([
            json.dumps(dict(user_id='1', role='user')), 'invalid JSON',
            json.dumps(dict(user_id=2, role='user')), json.dumps(dict(user_id=999, role='user'))]))
        stats = self.ns['get_crm_stats'](period='all')['stats']
        self.assertEqual(stats['unread_by_status'], dict(new=0, in_work=1, pre_booking=1))
        self.assertEqual(stats['new'], 1)
        self.assertEqual(stats['in_work'], 1)
        self.assertEqual(stats['pre_booking'], 1)
        self.assertEqual(self.counts['user_data.json'], 1)

    def test_reads_do_not_modify_any_files(self):
        before = {path.name: path.read_bytes() for path in self.root.iterdir()}
        self.ns['get_crm_users']()
        self.ns['get_crm_stats'](period='all')
        self.assertEqual(before, {path.name: path.read_bytes() for path in self.root.iterdir()})


def benchmark(before_path):
    """Read-only comparison on local data; prints timings/counts, never PII."""
    data = SOURCE.parent / 'data'
    before, old_counts = load_reads(Path(before_path), data)
    after, new_counts = load_reads(SOURCE, data)
    for period in ('all', 'today', 'week', 'month'):
        for status in (None, 'new', 'in_work', 'pre_booking', 'confirmed'):
            for confirmed in (None, True):
                kwargs = dict(period=period, status=status, has_confirmed_booking=confirmed)
                assert before['get_crm_users'](**kwargs) == after['get_crm_users'](**kwargs), 'Users changed'
        assert before['get_crm_stats'](period=period) == after['get_crm_stats'](period=period), 'Stats changed'
    for endpoint in ('get_crm_users', 'get_crm_stats'):
        kwargs = dict(period='all')
        assert before[endpoint](**kwargs) == after[endpoint](**kwargs), 'Response changed'
        report = {}
        for label, ns, counts in [('before', before, old_counts), ('after', after, new_counts)]:
            durations = []
            counts.clear()
            for _ in range(5):
                start = time.perf_counter()
                ns[endpoint](**kwargs)
                durations.append((time.perf_counter() - start) * 1000)
            report[label] = dict(median_ms=round(statistics.median(durations), 2),
                                 json_reads_per_request={key: value / 5 for key, value in counts.items()})
        print(json.dumps(dict(endpoint=endpoint, **report)))


if __name__ == '__main__':
    if len(sys.argv) == 3 and sys.argv[1] == '--benchmark-before':
        benchmark(sys.argv[2])
    else:
        unittest.main()
