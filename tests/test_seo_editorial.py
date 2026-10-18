import importlib.util
import json
import os
from pathlib import Path
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("seo_editorial", ROOT / "scripts/seo_editorial.py")
seo = importlib.util.module_from_spec(spec)
spec.loader.exec_module(seo)


def fixture(topic):
    return {"title": topic["title"], "slug": topic["slug"], "draft_markdown": "полезный текст " * 260,
            "research_notes": "Synthetic fixture, not a real article or real research.", "owner_questions": [],
            "sources": [{"url": f"https://{host}/{lang}", "language": lang, "summary": "fixture"}
                        for host, lang in [("ru-one.example", "ru"), ("ru-two.example", "ru"), ("en-one.example", "en"), ("en-two.example", "en")]]}


class EditorialTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.directory = Path(self.tmp.name) / "private"
        self.config = seo.load_config()
        self.now = seo.instant(self.config["start_at"]).astimezone(timezone.utc)
        self.environment = patch.dict(os.environ, {"SUNNY_SEO_ENABLED": "1", "SUNNY_SEO_TELEGRAM_BOT_TOKEN": "fixture-secret", "SUNNY_SEO_REVIEW_CHAT_ID": "fixture-chat"})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.generate = Mock(side_effect=lambda topic, directory: fixture(topic))
        self.send = Mock(return_value=17)
        self.notify = Mock()

    def run_job(self, now=None):
        return seo.run_once(self.config, self.directory, now or self.now, self.generate, self.send, self.notify)

    def state(self):
        return json.loads((self.directory / "state.json").read_text())

    def test_disabled_and_early_are_noops(self):
        with patch.dict(os.environ, {"SUNNY_SEO_ENABLED": "0"}):
            self.assertEqual(self.run_job(), "disabled")
            self.assertFalse(self.directory.exists())
        self.assertEqual(self.run_job(self.now - timedelta(seconds=1)), "not_due")
        self.generate.assert_not_called()
        self.send.assert_not_called()

    def test_owner_corrected_topic_grouping_and_scope(self):
        topics = self.config["topics"]
        self.assertEqual([topic["slug"] for topic in topics], [
            "car-rental-phuket-prices", "car-rental-phuket-areas",
            "car-rental-or-taxi-phuket", "driving-licence-car-rental-phuket",
            "choose-car-rental-company-phuket"])
        for word in ("компактной", "седана", "кроссовера", "семиместного", "проверить"):
            self.assertIn(word, topics[0]["angle"])
        for district in ("Патонг", "Карон", "Ката", "Банг Тао", "Раваи"):
            self.assertIn(district, topics[1]["angle"])
        self.assertIn("официальным", topics[3]["angle"])
        self.assertIn("Не придумывать отзывы", topics[4]["angle"])
        self.assertTrue(all(topic.get("wordstat_phrase") for topic in topics[2:]))
        prompt = (ROOT / "config/seo-editorial-prompt.md").read_text()
        self.assertIn("только\nкогда именно они указаны темой", prompt)
        self.assertIn("Вопрос замены и подменных машин не поднимай", prompt)

    def test_missing_delivery_configuration_fails_before_generation(self):
        with patch.dict(os.environ, {"SUNNY_SEO_REVIEW_CHAT_ID": ""}):
            with self.assertRaises(ValueError):
                self.run_job()
        self.assertFalse(self.directory.exists())
        self.generate.assert_not_called()

    def test_editorial_voice_is_the_team_without_invented_experience(self):
        prompt = (ROOT / "config/seo-editorial-prompt.md").read_text()
        self.assertIn("от лица команды Sunny Rentals", prompt)
        self.assertIn("как сторонний обзорщик", prompt)
        self.assertIn("мы бесплатно", prompt)
        self.assertIn("Не выдумывай имя сотрудника", prompt)
        self.assertIn("research_notes и sources", prompt)

    def test_inventory_context_is_public_and_does_not_invent_image_or_card_urls(self):
        root = Path(self.tmp.name)
        inventory = root / "backend/data/web_cars.json"
        inventory.parent.mkdir(parents=True)
        image = root / "public/images_web/compact/photo.jpg"
        image.parent.mkdir(parents=True)
        image.touch()
        row = {"name": "Test compact", "class": "compact", "supplier": "PRIVATE",
               "contact": "PRIVATE", "available": True,
               "photos": {"main": "compact/photo.jpg"},
               "pricing": {"low_season": {"price_7_14": 100, "internal": 999},
                           "high_season": {"price_7_14": 200}, "deposit": 5000}}
        inventory.write_text(json.dumps({"cars": {"one": row, "two": {**row, "photos": {"main": "../secret.jpg"}}}}))
        context = seo.public_inventory_context(root)
        self.assertEqual(context["offers"][0]["photo_url"], "/images_web/compact/photo.jpg")
        self.assertIsNone(context["offers"][1]["photo_url"])
        self.assertEqual(context["offers"][0]["daily_rates"]["low_season"], {"price_7_14": 100})
        self.assertNotIn("PRIVATE", json.dumps(context))
        self.assertNotIn("available", context["offers"][0])
        self.assertNotIn("slug", context["offers"][0])

    def test_48_hours_month_boundary_and_no_repeats(self):
        now = datetime(2026, 10, 31, 3, tzinfo=timezone.utc)
        self.assertEqual(self.run_job(now), "pending_review")
        self.assertEqual(self.run_job(now + timedelta(hours=47)), "not_due")
        self.assertEqual(self.run_job(now + timedelta(hours=48)), "pending_review")
        self.assertEqual(self.generate.call_count, 2)
        self.assertEqual([call.args[0]["slug"] for call in self.generate.call_args_list], [topic["slug"] for topic in self.config["topics"][:2]])

    def test_no_catchup_burst_and_exhausted_queue_stops(self):
        count = len(self.config["topics"])
        for index in range(count):
            self.assertEqual(self.run_job(self.now + timedelta(days=20 + index * 2)), "pending_review")
        self.assertEqual(self.run_job(self.now + timedelta(days=40)), "exhausted")
        self.assertEqual(self.send.call_count, count)
        self.assertEqual(self.generate.call_count, count)
        self.assertTrue(all(row["status"] == "pending_review" for row in self.state()["topics"].values()))

    def test_delivery_retry_reuses_draft_without_another_model_call(self):
        self.send.side_effect = [RuntimeError("private token must not be logged"), 18]
        with self.assertRaisesRegex(RuntimeError, "Editorial job failed"):
            self.run_job()
        self.assertEqual(self.state()["topics"][self.config["topics"][0]["slug"]]["status"], "awaiting_delivery")
        self.assertEqual(self.run_job(self.now + timedelta(hours=1)), "not_due")
        self.assertEqual(self.run_job(self.now + timedelta(hours=6)), "pending_review")
        self.assertEqual(self.generate.call_count, 1)
        self.assertEqual(self.send.call_count, 2)
        self.assertNotIn("fixture-secret", json.dumps(self.state()))
        self.notify.assert_called_once()

    def test_failures_back_off_then_halt_without_consuming_topic(self):
        self.generate.side_effect = ValueError("unavailable research")
        for hour in [0, 6, 12]:
            with self.assertRaises(RuntimeError):
                self.run_job(self.now + timedelta(hours=hour))
        self.assertTrue(self.state()["halted"])
        self.assertEqual(self.run_job(self.now + timedelta(days=2)), "halted")
        self.assertEqual(self.generate.call_count, 3)
        self.send.assert_not_called()

    def test_validation_rejects_fake_or_incomplete_research_and_excluded_topic(self):
        topic = self.config["topics"][0]
        for mutation in [lambda d: d.update(sources=[]), lambda d: d.update(slug="wrong"), lambda d: d.update(draft_markdown="short"), lambda d: d.update(draft_markdown=d["draft_markdown"] + " подменная машина")]:
            draft = fixture(topic)
            mutation(draft)
            with self.assertRaises(ValueError):
                seo.validate_draft(draft, topic)

    def test_generator_requires_completed_search_and_never_passes_telegram_secret(self):
        topic = self.config["topics"][0]
        def fake_cli(command, **kwargs):
            for relative in (
                "skills/article-editor/SKILL.md",
                "config/article-project-profile.md",
                "config/article-editorial-memory.md",
            ):
                self.assertIn((ROOT / relative).read_text(), kwargs["input"])
            self.assertIn("read-only", command)
            self.assertIn('web_search="live"', command)
            self.assertNotIn("SUNNY_SEO_TELEGRAM_BOT_TOKEN", kwargs["env"])
            self.assertNotIn("fixture-secret", json.dumps(kwargs["env"]))
            Path(command[command.index("-o") + 1]).write_text(json.dumps(fixture(topic)))
            return Mock(returncode=0, stdout='{"type":"item.completed","item":{"type":"web_search"}}\n')
        with patch.object(seo.subprocess, "run", side_effect=fake_cli):
            self.assertEqual(seo.generate(topic, Path(self.tmp.name) / "research")["slug"], topic["slug"])
        with patch.object(seo.subprocess, "run", return_value=Mock(returncode=0, stdout="")):
            with self.assertRaisesRegex(ValueError, "No completed web research"):
                seo.generate(topic, Path(self.tmp.name) / "no-search")


if __name__ == "__main__":
    unittest.main()
