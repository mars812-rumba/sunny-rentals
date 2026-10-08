import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from jsonl_tail import read_jsonl_tail


class JsonlTailTests(unittest.TestCase):
    def test_incomplete_utf8_record_does_not_hide_valid_lines(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "chat.jsonl"
            path.write_bytes(
                '{"user_id":"1","content":"Привет"}\n'.encode("utf-8")
                + b'{"user_id":"2","content":"broken '
                + b'\xd0'
            )

            parsed = []
            for line in read_jsonl_tail(path, 100):
                try:
                    parsed.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

            self.assertEqual(parsed, [{"user_id": "1", "content": "Привет"}])

    def test_missing_file_and_non_positive_limit_are_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "missing.jsonl"
            self.assertEqual(read_jsonl_tail(path, 100), [])
            path.write_text('{"ok":true}\n', encoding="utf-8")
            self.assertEqual(read_jsonl_tail(path, 0), [])


if __name__ == "__main__":
    unittest.main()
