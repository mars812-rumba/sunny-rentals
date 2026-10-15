import ast
import json
from pathlib import Path
import tempfile
import unittest

from crm_time import crm_datetime


class CRMUnreadTests(unittest.TestCase):
    def test_read_markers_do_not_hide_newer_messages(self):
        source = Path(__file__).resolve().parents[1] / 'web_integration.py'
        tree = ast.parse(source.read_text())
        node = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == 'get_fast_dialog_map')
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            chat = root / 'chat.jsonl'
            history = root / 'crm_history.jsonl'
            messages = [
                {'user_id': 1, 'role': 'user', 'timestamp': '2026-10-15T12:00:00Z'},
                {'user_id': 2, 'role': 'user', 'timestamp': '2026-10-15T12:00:00Z'},
                {'user_id': 3, 'role': 'manager', 'timestamp': '2026-10-15T12:00:00Z'},
                {'user_id': 4, 'role': 'user', 'timestamp': '2026-10-15T12:00:00Z'},
            ]
            reads = [
                {'user_id': 1, 'action': 'messages_marked_read', 'timestamp': '2026-10-15T11:00:00Z'},
                {'user_id': 2, 'action': 'messages_marked_read', 'timestamp': '2026-10-15T19:01:00+07:00'},
                {'user_id': 4, 'action': 'messages_marked_read', 'timestamp': 'bad'},
            ]
            chat.write_text('\n'.join(json.dumps(item) for item in messages))
            history.write_text('\n'.join(json.dumps(item) for item in reads))
            before = (chat.read_bytes(), history.read_bytes())
            namespace = {'json': json, 'DATA': root, 'CHAT_LOGS_JSONL': chat, 'crm_datetime': crm_datetime,
                         'read_jsonl_tail': lambda path, limit: path.read_text().splitlines()[-limit:]}
            exec(compile(ast.Module(body=[node], type_ignores=[]), str(source), 'exec'), namespace)
            result = namespace['get_fast_dialog_map']()
            self.assertTrue(result['1']['has_new_messages'])
            self.assertFalse(result['2']['has_new_messages'])
            self.assertFalse(result['3']['has_new_messages'])
            self.assertTrue(result['4']['has_new_messages'])
            self.assertEqual((chat.read_bytes(), history.read_bytes()), before)
