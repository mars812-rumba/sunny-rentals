import json
import unittest
from update_ar_duration_prices import updated_document, rates_for, MAPPING


class ARDurationPriceTests(unittest.TestCase):
    def fixture(self):
        return {'tenant_id': 'ar-rentals', 'items': [{'id': str(index), 'tenant_id': 'ar-rentals', 'name': key,
            'legacy': {'source': 'legacy-owner-AR-v1', 'car_id': key}, 'pricing': {'currency': 'THB', 'daily_rate': 1},
            'deposit_policy': {'amount': 5000}, 'photos': {'main': 'kept.webp'}, 'public': False,
            'status': 'hidden' if index == 0 else 'available'} for index, key in enumerate(MAPPING)]}

    def test_mapping_markup_and_calendar_independence_preserve_other_fields(self):
        before = self.fixture()
        updated, report = updated_document(before)
        self.assertEqual(len(report), 26)
        self.assertEqual(before['items'][0]['pricing']['daily_rate'], 1)
        for previous, item in zip(before['items'], updated['items']):
            self.assertEqual({k: v for k, v in previous.items() if k not in ['pricing', 'updated_at']}, {k: v for k, v in item.items() if k not in ['pricing', 'updated_at']})
            self.assertEqual(item['pricing']['pricing_mode'], 'duration')
            self.assertEqual(item['pricing']['tariff_grid']['low_season'], item['pricing']['tariff_grid']['high_season'])
        self.assertEqual(rates_for('volvo'), {'price_1_6': 1760, 'price_7_14': 1650, 'price_15_29': 1540, 'price_30': 1466.67})
        self.assertEqual(rates_for('fortuner')['price_7_14'], 1375)
        self.assertEqual(rates_for('xforce')['price_1_6'], 1430)
        self.assertEqual(rates_for('mazda2_yaris')['price_30'], 513.33)
        again, report = updated_document(updated)
        self.assertEqual(updated, again)
        self.assertFalse(any(row['changed'] for row in report))

    def test_wrong_fleet_and_cross_tenant_records_are_rejected(self):
        wrong = self.fixture(); wrong['items'].pop()
        with self.assertRaises(ValueError): updated_document(wrong)
        wrong = self.fixture(); wrong['items'][0]['tenant_id'] = 'other'
        with self.assertRaises(ValueError): updated_document(wrong)
