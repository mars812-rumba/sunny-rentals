import json
import tempfile
import unittest
from pathlib import Path

from customer_outreach_campaign import (
    ADMIN_IDS,
    load_campaign_state,
    load_completed,
    load_recipients,
    select_recipient_batch,
)


class CustomerOutreachCampaignTests(unittest.TestCase):
    def test_merges_current_and_archive_by_newest_record(self):
        with tempfile.TemporaryDirectory() as directory:
            data_dir = Path(directory)
            (data_dir / "user_data.json").write_text(
                json.dumps(
                    [
                        {"user_id": "10", "updated_at": "2026-01-01T00:00:00", "status": "new"},
                        {"user_id": "web_session_x"},
                        {"user_id": next(iter(ADMIN_IDS))},
                    ]
                ),
                encoding="utf-8",
            )
            (data_dir / "archive.json").write_text(
                json.dumps(
                    [
                        {"user_id": 10, "archived_at": "2026-02-01T00:00:00", "status": "archive"},
                        {"user_id": 20, "archived_at": "2026-02-01T00:00:00"},
                    ]
                ),
                encoding="utf-8",
            )

            recipients = load_recipients(data_dir)

            self.assertEqual(set(recipients), {10, 20})
            self.assertEqual(recipients[10]["status"], "archive")
            self.assertEqual(recipients[10]["_campaign_source"], "archive.json")

    def test_resume_log_only_skips_fully_completed_recipient(self):
        with tempfile.TemporaryDirectory() as directory:
            log_path = Path(directory) / "campaign.jsonl"
            events = [
                {"user_id": 10, "delivered": True, "claude_active": True},
                {"user_id": 20, "delivered": True, "claude_active": False},
                {"user_id": 30, "delivered": False, "claude_active": False},
            ]
            log_path.write_text("\n".join(json.dumps(event) for event in events), encoding="utf-8")

            self.assertEqual(load_completed(log_path), {10})
            self.assertEqual(
                load_campaign_state(log_path),
                {
                    10: {"delivered": True, "claude_active": True},
                    20: {"delivered": True, "claude_active": False},
                    30: {"delivered": False, "claude_active": False},
                },
            )

    def test_batch_uses_newest_unsent_recipients(self):
        recipients = {
            10: {"updated_at": "2026-01-01T00:00:00"},
            20: {"updated_at": "2026-03-01T00:00:00"},
            30: {"updated_at": "2026-02-01T00:00:00"},
        }
        state = {20: {"delivered": True, "claude_active": True}}

        batch = select_recipient_batch(recipients, state, 1)

        self.assertEqual([user_id for user_id, _ in batch], [30])


if __name__ == "__main__":
    unittest.main()
