import unittest

from chat_messages import deduplicate_chat_entries


class ChatMessageDeduplicationTests(unittest.TestCase):
    def test_removes_legacy_backend_double_write(self):
        entries = [
            {"timestamp": "2026-08-09T01:30:44.477476", "user_id": 42, "role": "user", "content": "Пикап"},
            {"timestamp": "2026-08-09T01:30:45.924365", "user_id": 42, "role": "user", "content": "Пикап"},
            {"timestamp": "2026-08-09T01:30:45.924666", "user_id": 42, "role": "assistant", "content": "На какие даты?"},
        ]
        result = deduplicate_chat_entries(entries)
        self.assertEqual([entry["role"] for entry in result], ["user", "assistant"])

    def test_preserves_intentional_repeated_message(self):
        entries = [
            {"timestamp": "2026-08-09T01:30:44", "user_id": 42, "role": "user", "content": "Пикап"},
            {"timestamp": "2026-08-09T01:30:45", "user_id": 42, "role": "user", "content": "Пикап"},
            {"timestamp": "2026-08-09T01:31:10", "user_id": 42, "role": "user", "content": "Когда ответите?"},
        ]
        self.assertEqual(len(deduplicate_chat_entries(entries)), 3)

    def test_uses_stable_external_message_id(self):
        entries = [
            {"id": "telegram:42:7", "user_id": 42, "role": "user", "content": "Привет"},
            {"id": "telegram:42:7", "user_id": 42, "role": "user", "content": "Привет"},
        ]
        self.assertEqual(len(deduplicate_chat_entries(entries)), 1)


if __name__ == "__main__":
    unittest.main()
