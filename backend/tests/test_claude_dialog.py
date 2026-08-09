import unittest

from claude_dialog import build_pricing_context, parse_claude_output, requests_manager_handoff


class ClaudeDialogTests(unittest.TestCase):
    def test_pricing_uses_price_30_and_includes_both_seasons(self):
        context = build_pricing_context({
            "low_season": {"price_1_6": 732, "price_7_14": 700, "price_15_29": 653, "price_30": 495},
            "high_season": {"price_1_6": 811, "price_7_14": 732, "price_15_29": 653, "price_30": 573},
        })
        self.assertIn("30+д=495฿", context)
        self.assertIn("30+д=573฿", context)
        self.assertIn("апрель–октябрь", context)
        self.assertIn("ноябрь–март", context)

    def test_output_removes_image_tokens_and_markdown_bold(self):
        text, photos = parse_claude_output(
            "**Вот фото**\n[image:bikes/a/1.jpg]\n![ещё](image:bikes/a/2.jpg)"
        )
        self.assertEqual(text, "Вот фото")
        self.assertEqual(photos, ["bikes/a/1.jpg", "bikes/a/2.jpg"])

    def test_handoff_requires_affirmative_statement(self):
        self.assertTrue(requests_manager_handoff("Передаю заявку менеджеру — он подтвердит детали."))
        self.assertTrue(requests_manager_handoff("Менеджер свяжется с вами."))
        self.assertFalse(requests_manager_handoff("Передать менеджеру?"))
        self.assertFalse(requests_manager_handoff("Могу уточнить у менеджера."))


if __name__ == "__main__":
    unittest.main()
