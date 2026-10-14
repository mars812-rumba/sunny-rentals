from datetime import datetime, timezone, timedelta
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from import_ar_booking_schedule import plan, run, VEHICLES, SOURCE
from platform_core.models import Booking, BookingStatus, RentalAsset
from platform_core.provisioning import PlatformContext, TenantProvisioner, TenantProvisionRequest, _jsonable, _atomic_json_write


class ARScheduleTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 10, 14, 14, 15, tzinfo=timezone.utc)
        rates = dict(price_1_6=1100, price_7_14=1000, price_15_29=900, price_30=800)
        self.assets = [RentalAsset(id=f'{index:032x}', tenant_id='ar-rentals', name=label,
            legacy={'car_id': car_id}, pricing={'currency': 'THB', 'pricing_mode': 'duration',
                'tariff_grid': {'low_season': rates, 'high_season': rates}}, deposit_policy={'amount': 5000})
            for index, (label, car_id) in enumerate(VEHICLES.items(), 1)]

    def test_known_entries_confirmed_empty_clients_correct_time_and_unknown_start_blocks(self):
        planned, skipped = plan(self.assets, [], 'Asia/Bangkok', self.now)
        self.assertEqual(sum(item.entry_type == 'rental' for item in planned), 17)
        self.assertEqual(sum(item.entry_type == 'block' for item in planned), 11)
        self.assertEqual(len({item.booking_number for item in planned}), 28)
        for item in planned:
            self.assertEqual(item.status, BookingStatus.CONFIRMED)
            self.assertIsNone(item.customer_id)
            self.assertEqual(item.operator_details['customer_name'], '')
            self.assertNotIn('contact_value', item.operator_details)
            self.assertEqual(item.start_at.hour, 2)  # 09:00 Bangkok
            self.assertEqual(item.end_at.hour, 2)
            self.assertEqual(item.pricing['pickup']['time'], '09:00')
            self.assertNotIn('location', item.pricing['pickup'])
            self.assertIn('Агент:', item.operator_details['note'])
            if item.entry_type == 'block':
                self.assertEqual(item.pricing['start_date'], '2026-10-14')
                self.assertEqual(item.pricing['total_rental'], '0.00')
                self.assertEqual(item.deposit['amount'], '0.00')
                self.assertIn('Даты начала неизвестны', item.operator_details['note'])
            else:
                self.assertGreater(float(item.pricing['total_rental']), 0)
                self.assertTrue(item.legacy['pricing_estimated'])
        january = next(item for item in planned if item.pricing['start_date'] == '2027-01-31')
        self.assertEqual(january.pricing['end_date'], '2027-02-22')
        self.assertTrue(any('Cross 1403' in item['vehicle'] for item in skipped))
        self.assertTrue(any(item['vehicle'] == 'Civic white 2020' for item in skipped))
        self.assertTrue(any(item['vehicle'] == 'CX3' and 'уже наступила' in item['reason'] for item in skipped))

    def test_retry_later_skips_existing_even_if_cancelled_without_resurrection(self):
        first, _ = plan(self.assets, [], 'Asia/Bangkok', self.now)
        first[0].status = BookingStatus.CANCELLED
        second, skipped = plan(self.assets, first, 'Asia/Bangkok', self.now + timedelta(days=1))
        self.assertEqual(second, [])
        self.assertEqual(sum(item['reason'] == 'Уже импортировано.' for item in skipped), 28)
        self.assertEqual(first[0].status, BookingStatus.CANCELLED)

    def test_conflicts_abort_and_adjacent_handover_day_is_allowed(self):
        first, _ = plan(self.assets, [], 'Asia/Bangkok', self.now)
        conflict = first[0].copy(update={'id': 'other-record', 'booking_number': '100099'})
        with self.assertRaisesRegex(ValueError, 'Occupied-period conflict'):
            plan(self.assets, [conflict], 'Asia/Bangkok', self.now)
        # The block's return and following pickup share the date but not occupied time.
        fortuner = [item for item in first if item.asset_id == self.assets[0].id]
        self.assertEqual(fortuner[0].end_at, fortuner[1].start_at)

    def test_bulk_write_is_atomic_preserves_old_records_and_has_backup(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            provisioner = TenantProvisioner(root)
            admin = PlatformContext.for_admin('test')
            provisioner.create_tenant(admin, TenantProvisionRequest(name='AR', slug='ar-rentals'))
            target = root / 'tenants/ar-rentals'
            _atomic_json_write(target / 'assets.json', {'tenant_id': 'ar-rentals', 'items': [_jsonable(item) for item in self.assets]})
            original = (target / 'bookings.json').read_bytes()
            with patch('import_ar_booking_schedule.JsonlEventRepository.append', side_effect=RuntimeError('audit failure')):
                with self.assertRaises(RuntimeError):
                    run(root, apply=True, now=self.now)
            self.assertEqual((target / 'bookings.json').read_bytes(), original)
            result = run(root, apply=True, now=self.now)
            self.assertEqual(result['bookings'], 17)
            self.assertEqual(result['blocks'], 11)
            self.assertEqual((Path(result['backup']) / 'bookings.json').read_bytes(), original)
            before = (target / 'bookings.json').read_bytes()
            retry = run(root, apply=True, now=self.now)
            self.assertEqual(retry['bookings'] + retry['blocks'], 0)
            self.assertEqual((target / 'bookings.json').read_bytes(), before)
