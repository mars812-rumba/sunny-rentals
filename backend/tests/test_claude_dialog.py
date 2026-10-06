import unittest

from claude_dialog import (
    build_pricing_context,
    find_offered_car_main_photo,
    is_short_affirmative,
    offers_to_show_photo,
    parse_claude_output,
    requests_manager_handoff,
)


class ClaudeDialogTests(unittest.TestCase):
    def test_pricing_uses_price_30_and_includes_both_seasons(self):
        context = build_pricing_context({
            "low_season": {"price_1_6": 732, "price_7_14": 700, "price_15_29": 653, "price_30": 495},
            "high_season": {"price_1_6": 811, "price_7_14": 732, "price_15_29": 653, "price_30": 573},
        })
        self.assertIn("30+д=495 батов", context)
        self.assertIn("30+д=573 бата", context)
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
        self.assertTrue(requests_manager_handoff("Проверю ваши даты и точную стоимость. Скоро вернусь с ответом."))

    def test_price_wording_is_safe_even_if_model_uses_old_examples(self):
        text, photos = parse_claude_output(
            "Точный расчёт на 10 дней подтвердит менеджер. "
            "MG5: 873฿/сутки, депозит 5,000฿."
        )
        self.assertEqual(text, "Проверю ваши даты и точную стоимость. Скоро вернусь с ответом.")
        self.assertEqual(photos, [])

        text, _ = parse_claude_output("MG5: 873฿ в сутки, 889฿ в сезон. Депозит 5000฿.")
        self.assertEqual(text, "MG5: 873 бата в сутки, 889 батов в сезон. Депозит 5000 батов.")

    def test_short_affirmative_continues_photo_offer(self):
        self.assertTrue(is_short_affirmative("Да"))
        self.assertTrue(is_short_affirmative("Да, покажи"))
        self.assertTrue(offers_to_show_photo("Toyota Yaris 2024 — 853฿/сутки. Показать фото?"))
        self.assertFalse(is_short_affirmative("Да, но сначала расскажите про страховку"))

    def test_resolves_main_photo_of_last_offered_catalogue_car(self):
        cars = {
            "yaris": {
                "name": "Toyota YARIS 2024 Gray",
                "brand": "Toyota",
                "model": "YARIS",
                "year": "2024",
                "available": True,
                "photos": {"main": "compact/yaris/1.jpg"},
            },
            "yaris_cross": {
                "name": "Toyota Yaris Cross 2024 White",
                "brand": "Toyota",
                "model": "Yaris Cross",
                "year": "2024",
                "available": True,
                "photos": {"main": "suv/yaris-cross/1.jpg"},
            },
        }
        photo = find_offered_car_main_photo(
            "Toyota Yaris 2024 — 853฿/сутки. Показать фото?",
            cars,
        )
        self.assertEqual(photo, "compact/yaris/1.jpg")


if __name__ == "__main__":
    unittest.main()
