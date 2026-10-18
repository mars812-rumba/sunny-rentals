import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("live_check", ROOT / "scripts/editorial_live_check.py")
live = importlib.util.module_from_spec(spec)
spec.loader.exec_module(live)


class LiveCheckTests(unittest.TestCase):
    def test_individual_failures_are_not_success(self):
        good = dict.fromkeys(("revision", "canonical", "language", "heading", "images", "contents", "cta", "tables"), True)
        self.assertEqual(live.verify_checks(good), [])
        for key in good:
            self.assertIn(key, live.verify_checks(dict(good, **{key: False})))
        self.assertIn("page overflow", live.verify_checks(dict(good, overflow=True)))

    def test_index_paths_and_identity_are_validated(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            directory = root / "public/content/blog"
            directory.mkdir(parents=True)
            (directory / "index.json").write_text('["example"]')
            (directory / "example.json").write_text(json.dumps({"slug": "example", "title": "Example"}))
            self.assertEqual(live.article_cases(root)[0]["url"], live.ORIGIN + "/articles/example/")
            (directory / "index.json").write_text('["../secret"]')
            with self.assertRaises(ValueError):
                live.article_cases(root)


if __name__ == "__main__":
    unittest.main()
