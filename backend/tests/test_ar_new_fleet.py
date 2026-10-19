import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from complete_ar_new_fleet import TARGETS, complete
from replace_ar_booking_schedule import SOURCE
from platform_core.models import RentalAsset
from platform_core.provisioning import PlatformContext, TenantProvisioner, TenantProvisionRequest, _atomic_json_write


class NewFleetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        TenantProvisioner(self.root).create_tenant(PlatformContext.for_admin('test'), TenantProvisionRequest(name='AR', slug='ar-rentals'))
        self.assets_path = self.root / 'tenants/ar-rentals/assets.json'
        self.bookings_path = self.root / 'tenants/ar-rentals/bookings.json'
        assets = []
        for plate in sorted(set(TARGETS) | {value[0] for value in TARGETS.values()}):
            a = RentalAsset(tenant_id='ar-rentals', name=plate, license_plate=plate,
                            specs={'color': 'White', 'year': 2023}, pricing={'daily_rate': 0, 'currency': 'THB'})
            if plate not in TARGETS:
                a.pricing = {'daily_rate': 715, 'currency': 'THB', 'tariff_grid': {'low_season': {'price_30': 500}}}
                a.specs = {'engine': '1.5L Turbo', 'power': '182', 'fuel': 'Бензин', 'transmission': 'CVT'}
                a.deposit_policy = {'amount': 5000, 'currency': 'THB'}
            assets.append(json.loads(a.json()))
        _atomic_json_write(self.assets_path, {'tenant_id': 'ar-rentals', 'items': assets})
        _atomic_json_write(self.bookings_path, {'tenant_id': 'ar-rentals', 'items': []})
        self.source = self.root / 'source.json'
        self.source.write_text(json.dumps({'source_id': SOURCE, 'vehicles': [
            {'plate': plate, 'name': value[1], 'periods': [['2026-10-01', '2026-10-10']]}
            for plate, value in TARGETS.items()] + [
            {'plate': '4551', 'name': 'City HB Grey', 'periods': [['2026-09-01', '2027-09-01']]}]}))

    def test_scoped_completion_and_idempotency(self):
        before = self.assets_path.read_bytes()
        report = complete(self.root, self.source)
        self.assertEqual(self.assets_path.read_bytes(), before)
        self.assertEqual(report['new_bookings'], len(TARGETS))
        with self.assertRaisesRegex(ValueError, 'hashes'):
            complete(self.root, self.source, True, 'stale', 'stale')
        result = complete(self.root, self.source, True, report['assets_sha256'], report['bookings_sha256'])
        self.assertEqual((Path(result['backup']) / 'assets.json').read_bytes(), before)
        assets = json.loads(self.assets_path.read_text())['items']
        civic = next(x for x in assets if x['license_plate'] == '8951')
        self.assertEqual(civic['specs']['engine'], '1.8L')
        self.assertNotIn('power', civic['specs'])
        for item in assets:
            if item['license_plate'] in TARGETS:
                self.assertEqual(item['specs']['color'], 'White')
                self.assertEqual(item['pricing']['daily_rate'], 715)
        records = json.loads(self.bookings_path.read_text())['items']
        self.assertEqual({(x['entry_type'], x['status']) for x in records}, {('rental', 'confirmed')})
        self.assertTrue(all(x['pricing']['total_rental'] == '0.00' for x in records))
        again = complete(self.root, self.source, True)
        self.assertEqual(again['new_bookings'], 0)
        self.assertEqual(again['updated_plates'], [])

    def test_audit_failure_rolls_back_both_documents(self):
        before_a = json.loads(self.assets_path.read_text())
        before_b = json.loads(self.bookings_path.read_text())
        report = complete(self.root, self.source)
        with patch('complete_ar_new_fleet.JsonlEventRepository.append', side_effect=RuntimeError('audit')):
            with self.assertRaisesRegex(RuntimeError, 'audit'):
                complete(self.root, self.source, True, report['assets_sha256'], report['bookings_sha256'])
        self.assertEqual(json.loads(self.assets_path.read_text()), before_a)
        self.assertEqual(json.loads(self.bookings_path.read_text()), before_b)
