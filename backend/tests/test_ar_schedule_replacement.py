from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from replace_ar_booking_schedule import SOURCE, confirm_imported_rentals, correct_xpander_year, merged_periods, plan, run, sha
from platform_core.models import RentalAsset, Booking
from platform_core.provisioning import PlatformContext, TenantProvisioner, TenantProvisionRequest, _atomic_json_write


class ARScheduleReplacementTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.now = datetime(2026, 10, 19, tzinfo=timezone.utc)
        self.admin = PlatformContext.for_admin('test')
        provisioner = TenantProvisioner(self.root)
        for tenant in ['ar-rentals', 'other-park']:
            provisioner.create_tenant(self.admin, TenantProvisionRequest(name=tenant, slug=tenant))
        self.asset = RentalAsset(id='a' * 32, tenant_id='ar-rentals', name='Car', license_plate='5ขศ 2600')
        self.directory = self.root / 'tenants/ar-rentals'
        self.assets_path = self.directory / 'assets.json'
        self.bookings_path = self.directory / 'bookings.json'
        _atomic_json_write(self.assets_path, {'tenant_id': 'ar-rentals', 'items': [json.loads(self.asset.json())]})
        old = Booking(id='old', booking_number='100001', tenant_id='ar-rentals', asset_id=self.asset.id,
                      status='confirmed', source='owner_manual', start_at=self.now, end_at=datetime(2026, 11, 19, tzinfo=timezone.utc))
        _atomic_json_write(self.bookings_path, {'tenant_id': 'ar-rentals', 'items': [json.loads(old.json())]})
        self.source = {'source_id': SOURCE, 'vehicles': [
            {'name': 'Xpander', 'plate': '2600', 'periods': [['2026-01-31', '2026-02-22'], ['2026-12-16', '2027-01-14']]},
            {'name': 'Absent', 'plate': '9999', 'periods': [['2026-09-01', '2026-09-10']]}]}
        self.source_path = self.root / 'source.json'
        self.source_path.write_text(json.dumps(self.source))

    def tearDown(self):
        self.temp.cleanup()

    def apply(self, report):
        return run(self.root, self.source_path, True, report['bookings_sha256'], report['assets_sha256'], self.now)

    def test_dry_run_backup_replace_scope_idempotency_and_literal_dates(self):
        old = self.bookings_path.read_bytes()
        assets = self.assets_path.read_bytes()
        other = self.root / 'tenants/other-park/tenant.json'
        other_bytes = other.read_bytes()
        report = run(self.root, self.source_path, now=self.now)
        self.assertEqual(report['new_records'], 2)
        self.assertEqual(self.bookings_path.read_bytes(), old)
        self.assertEqual(len(report['not_in_park']), 1)
        result = self.apply(report)
        self.assertTrue(result['applied'])
        backup = Path(result['backup'])
        self.assertEqual((backup / 'bookings.json').read_bytes(), old)
        self.assertEqual(self.assets_path.read_bytes(), assets)
        self.assertEqual(other.read_bytes(), other_bytes)
        entries = json.loads(self.bookings_path.read_text())['items']
        self.assertEqual(entries[0]['pricing']['start_date'], '2026-01-31')
        for entry in entries:
            self.assertEqual(entry['entry_type'], 'block')
            self.assertIsNone(entry['customer_id'])
            self.assertEqual(entry['pricing']['total_rental'], '0.00')
            self.assertEqual(Booking.parse_obj(entry).start_at.hour, 2)
        after = self.bookings_path.read_bytes()
        self.assertTrue(run(self.root, self.source_path, True, now=self.now)['already_applied'])
        self.assertEqual(self.bookings_path.read_bytes(), after)

    def test_changed_file_or_missing_hash_stops_before_replacement(self):
        report = run(self.root, self.source_path, now=self.now)
        for field, path in [('bookings_sha256', self.bookings_path), ('assets_sha256', self.assets_path)]:
            original = path.read_bytes()
            path.write_bytes(original + b'\n')
            with self.assertRaisesRegex(ValueError, 'hashes'):
                self.apply(report)
            path.write_bytes(original)
        with self.assertRaisesRegex(ValueError, 'hashes'):
            run(self.root, self.source_path, True, now=self.now)

    def test_owner_year_correction_preserves_other_records_and_is_idempotent(self):
        self.apply(run(self.root, self.source_path, now=self.now))
        report = confirm_imported_rentals(self.root, expected_count=2, now=self.now)
        confirm_imported_rentals(self.root, True, report['bookings_sha256'], expected_count=2, now=self.now)
        original = self.bookings_path.read_bytes()
        before = json.loads(original)['items']
        report = correct_xpander_year(self.root, now=self.now)
        self.assertEqual(self.bookings_path.read_bytes(), original)
        with self.assertRaisesRegex(ValueError, 'hash'):
            correct_xpander_year(self.root, True, 'stale', now=self.now)
        with patch('replace_ar_booking_schedule.JsonlEventRepository.append', side_effect=RuntimeError('audit failed')):
            with self.assertRaisesRegex(RuntimeError, 'audit failed'):
                correct_xpander_year(self.root, True, report['bookings_sha256'], now=self.now)
        self.assertEqual(json.loads(self.bookings_path.read_text())['items'], before)
        report = correct_xpander_year(self.root, now=self.now)
        result = correct_xpander_year(self.root, True, report['bookings_sha256'], now=self.now)
        after = json.loads(self.bookings_path.read_text())['items']
        self.assertEqual((Path(result['backup']) / 'bookings.json').read_bytes(), original)
        self.assertEqual(after[1], before[1])
        for key in ['id', 'booking_number', 'asset_id', 'status', 'deposit', 'entry_type', 'customer_id']:
            self.assertEqual(after[0][key], before[0][key])
        self.assertEqual(after[0]['pricing']['start_date'], '2027-01-31')
        self.assertEqual(after[0]['pricing']['end_date'], '2027-02-22')
        self.assertEqual(after[0]['pricing']['days'], 22)
        self.assertEqual(Booking.parse_obj(after[0]).start_at.hour, 2)
        self.assertTrue(correct_xpander_year(self.root, True, now=self.now)['already_corrected'])

    def test_ambiguous_match_invalid_dates_and_audit_failure_leave_old_schedule(self):
        before = self.bookings_path.read_bytes()
        ambiguous = {**self.source, 'vehicles': self.source['vehicles'] + [self.source['vehicles'][0]]}
        with self.assertRaisesRegex(ValueError, 'unique'):
            plan([self.asset], [], ambiguous, 'hash', 'Asia/Bangkok', self.now)
        with self.assertRaises(ValueError):
            merged_periods([['2026-09-07', '2026-09-07']])
        report = run(self.root, self.source_path, now=self.now)
        with patch('replace_ar_booking_schedule.JsonlEventRepository.append', side_effect=OSError('audit failed')):
            with self.assertRaises(OSError):
                self.apply(report)
        self.assertEqual(self.bookings_path.read_bytes(), before)

    def test_overlaps_union_but_adjacent_periods_stay_separate(self):
        groups = merged_periods([['2026-09-13', '2027-09-13'], ['2026-09-04', '2026-09-20'], ['2027-09-13', '2027-09-15']])
        self.assertEqual(len(groups), 2)
        self.assertEqual(str(groups[0][0]), '2026-09-04')
        self.assertEqual(str(groups[0][1]), '2027-09-13')
        self.assertEqual(len(groups[0][2]), 2)

    def test_conversion_preserves_dates_ids_amounts_and_retries_without_changes(self):
        self.apply(run(self.root, self.source_path, now=self.now))
        before = json.loads(self.bookings_path.read_text())
        report = confirm_imported_rentals(self.root, expected_count=2)
        self.assertEqual(report['converted'], 2)
        self.assertEqual(json.loads(self.bookings_path.read_text()), before)
        with self.assertRaisesRegex(ValueError, 'hash'):
            confirm_imported_rentals(self.root, True, 'wrong', expected_count=2)
        with patch('replace_ar_booking_schedule.JsonlEventRepository.append', side_effect=OSError('audit')):
            with self.assertRaises(OSError):
                confirm_imported_rentals(self.root, True, report['bookings_sha256'], expected_count=2)
        self.assertEqual(json.loads(self.bookings_path.read_text()), before)
        result = confirm_imported_rentals(self.root, True, report['bookings_sha256'], expected_count=2)
        self.assertEqual(result['converted'], 2)
        after = json.loads(self.bookings_path.read_text())
        for old, new in zip(before['items'], after['items']):
            self.assertEqual(new['entry_type'], 'rental')
            for field in ['status', 'id', 'booking_number', 'asset_id', 'start_at', 'end_at', 'customer_id', 'deposit']:
                self.assertEqual(new[field], old[field])
            self.assertEqual(new['pricing']['total_rental'], old['pricing']['total_rental'])
            self.assertEqual(new['pricing']['pickup']['time'], '09:00')
        raw = self.bookings_path.read_bytes()
        self.assertEqual(confirm_imported_rentals(self.root, True, expected_count=2)['converted'], 0)
        self.assertEqual(self.bookings_path.read_bytes(), raw)
