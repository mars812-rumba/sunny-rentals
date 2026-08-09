import unittest
from pathlib import Path

import yaml


class PromptPolicyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        prompt_file = Path(__file__).resolve().parents[1] / "prompts.yaml"
        cls.prompt = yaml.safe_load(prompt_file.read_text(encoding="utf-8"))["main_prompt"]

    def test_sales_concision_and_single_question_rules_are_present(self):
        self.assertIn("Обычный ответ: 1–3 коротких предложения", self.prompt)
        self.assertIn("250 символов", self.prompt)
        self.assertIn("не более ОДНОГО вопроса", self.prompt)

    def test_competitor_and_alternative_rules_are_present(self):
        self.assertIn("НИКОГДА НЕ ОТПРАВЛЯЙ К КОНКУРЕНТАМ", self.prompt)
        self.assertIn("максимум 2 наиболее подходящих варианта", self.prompt)

    def test_catalogue_is_not_treated_as_date_availability(self):
        self.assertIn("Наличие модели в каталоге НЕ означает доступность", self.prompt)
        self.assertIn("только после фактической проверки доступности", self.prompt)

    def test_known_telegram_contact_is_not_requested_again(self):
        self.assertIn("Telegram-чат является известным контактом", self.prompt)
        self.assertIn("НЕ спрашивай телефон, email или Telegram", self.prompt)

    def test_monthly_and_cross_season_pricing_rules_are_present(self):
        self.assertIn("Низкий сезон: апрель–октябрь", self.prompt)
        self.assertIn("Высокий сезон: ноябрь–март", self.prompt)
        self.assertIn("тариф 30+ дней", self.prompt)


if __name__ == "__main__":
    unittest.main()
