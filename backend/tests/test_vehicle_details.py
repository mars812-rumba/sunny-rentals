"""Tariff boundaries, scoped section patches and public projection in temp storage."""
from datetime import date
import json
import unittest
from unittest.mock import patch

from pydantic import ValidationError
import test_platform_partner_bot as fixtures
from platform_admin_api import create_platform_admin_router
from platform_storefront_api import create_storefront_router
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.vehicle_details import TariffGrid, VehicleDetailsInput, calculate_rental


def grid():
    return {'low_season': {'price_1_6': 800, 'price_7_14': 700, 'price_15_29': 600, 'price_30': 500},
            'high_season': {'price_1_6': 1000, 'price_7_14': 900, 'price_15_29': 800, 'price_30': 700},
            'high_start': '11-01', 'high_end': '03-31'}


class RentalTariffTests(unittest.TestCase):
    def test_explicit_modes_keep_inactive_grid_out_of_calculation(self):
        for start in (date(2026, 4, 1), date(2026, 11, 1), date(2026, 10, 30)):
            flat = calculate_rental({'daily_rate': 3000, 'tariff_grid': grid(), 'pricing_mode': 'flat'}, start, 10)
            self.assertEqual(flat, {'daily_rate': '3000.00', 'total_rental': '30000.00'})
            duration = calculate_rental({'tariff_grid': grid(), 'pricing_mode': 'duration'}, start, 10)
            self.assertEqual(duration, {'daily_rate': '700.00', 'total_rental': '7000.00'})
        for mode in ('duration', 'seasonal'):
            with self.assertRaises(ValidationError): VehicleDetailsInput(section='pricing', pricing_mode=mode)
        with self.assertRaises(ValidationError): VehicleDetailsInput(section='pricing', pricing_mode='flat', daily_rate=0)
        with self.assertRaises(ValidationError): VehicleDetailsInput(section='specs', specs={}, daily_rate=3000)

    def test_every_duration_boundary(self):
        for days, expected in [(1, 800), (6, 800), (7, 700), (14, 700), (15, 600), (29, 600), (30, 500), (365, None)]:
            with self.subTest(days=days):
                result = calculate_rental({'tariff_grid': grid()}, date(2026, 4, 1), days)
                if expected:
                    self.assertEqual(result['daily_rate'], f'{expected}.00')
                    self.assertEqual(result['total_rental'], f'{expected * days}.00')
                self.assertEqual(sum(item['days'] for item in result['tariff_breakdown']), days)

    def test_cross_season_excludes_return_day_and_uses_whole_duration_tier(self):
        result = calculate_rental({'tariff_grid': grid()}, date(2026, 10, 30), 7)
        self.assertEqual(result['total_rental'], '5900.00')
        self.assertEqual(result['tariff_breakdown'], [
            {'season': 'low_season', 'days': 2, 'daily_rate': '700.00', 'subtotal': '1400.00'},
            {'season': 'high_season', 'days': 5, 'daily_rate': '900.00', 'subtotal': '4500.00'}])
        self.assertEqual(calculate_rental({'tariff_grid': grid()}, date(2026, 10, 31), 1)['total_rental'], '800.00')
        self.assertEqual(calculate_rental({'tariff_grid': grid()}, date(2026, 3, 31), 2)['total_rental'], '1800.00')
        self.assertEqual(calculate_rental({'tariff_grid': grid()}, date(2028, 2, 29), 1)['total_rental'], '1000.00')

    def test_custom_season_and_legacy_flat_price(self):
        custom = {**grid(), 'high_start': '06-01', 'high_end': '08-31'}
        self.assertEqual(calculate_rental({'tariff_grid': custom}, date(2026, 6, 1), 2)['total_rental'], '2000.00')
        self.assertEqual(calculate_rental({'daily_rate': 800}, date(2026, 11, 1), 2), {'daily_rate': '800.00', 'total_rental': '1600.00'})

    def test_invalid_grid_or_unbounded_public_fields_are_rejected(self):
        for value in ('02-29', '02-30', '13-01', '6-01'):
            with self.assertRaises(ValidationError): TariffGrid(**{**grid(), 'high_start': value})
        for rate in (0, 0.001, -1, float('nan'), float('inf'), 100000001):
            bad = grid(); bad['low_season']['price_1_6'] = rate
            with self.assertRaises(ValidationError): TariffGrid(**bad)
        for payload in ({'section': 'description', 'description': 'a' * 5001},
                        {'section': 'specs', 'specs': {'internal_notes': 'private'}},
                        {'section': 'specs', 'specs': {'features': ['x'] * 21}},
                        {'section': 'specs', 'specs': {'seats': 99}},
                        {'section': 'description', 'description': 'text', 'pricing': grid()}):
            with self.assertRaises(ValidationError): VehicleDetailsInput(**payload)


class VehicleDetailsApiTests(unittest.TestCase):
    state = fixtures.PartnerBotTests.state
    update = fixtures.PartnerBotTests.update
    token = fixtures.PartnerBotTests.token
    invite = fixtures.PartnerBotTests.invite
    tearDown = fixtures.PartnerBotTests.tearDown

    def setUp(self):
        fixtures.PartnerBotTests.setUp(self)
        self.service.handle_update(self.update(self.invite()))
        self.assets = TenantAssetAdmin(self.root, self.admin, 'park-a')
        self.asset = self.assets.save(AssetInput(name='Toyota', brand='Toyota', daily_rate=800, public=True))
        self.asset.specs['internal_notes'] = 'PRIVATE'
        self.asset.photos = {'main': 'existing-photo'}
        self.assets.assets.upsert(self.asset)
        self.client.app.include_router(create_platform_admin_router(self.root, self.auth))
        self.client.app.include_router(create_storefront_router(self.root, self.auth))
        self.admin_headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}

    def details(self, data, **identity):
        return self.client.post('/api/partners/fleet/details', json={
            'tenant_id': 'park-a', 'init_data': self.token(), 'asset_id': self.asset.id, 'data': data, **identity})

    def test_mode_switch_preserves_grid_and_public_price_matches_active_mode(self):
        self.assertEqual(self.details({'section': 'pricing', 'pricing_mode': 'seasonal', 'pricing': grid()}).status_code, 200)
        flat = self.details({'section': 'pricing', 'pricing_mode': 'flat', 'pricing': None, 'daily_rate': 3000})
        self.assertEqual(flat.status_code, 200, flat.text)
        self.assertEqual(flat.json()['asset']['pricing']['tariff_grid'], grid())
        public = self.client.get('/api/storefront/park-a').json()['assets'][0]
        self.assertEqual(public['daily_rate'], 3000)
        self.assertIsNone(public['tariff_grid'])
        duration_grid = grid()
        duration_grid['high_season'] = {key: 1 for key in duration_grid['high_season']}
        duration = self.details({'section': 'pricing', 'pricing_mode': 'duration', 'pricing': duration_grid})
        self.assertEqual(duration.status_code, 200, duration.text)
        public = self.client.get('/api/storefront/park-a').json()['assets'][0]
        self.assertEqual(public['daily_rate'], 500)
        self.assertEqual(public['tariff_grid']['mode'], 'duration')
        self.assertEqual(duration.json()['asset']['pricing']['daily_rate'], 3000)
        seasonal = self.details({'section': 'pricing', 'pricing_mode': 'seasonal', 'pricing': duration_grid})
        self.assertEqual(seasonal.status_code, 200, seasonal.text)
        self.assertEqual(self.client.get('/api/storefront/park-a').json()['assets'][0]['daily_rate'], 1)

    def test_basic_editor_omitting_prices_preserves_latest_tariffs_and_deposit(self):
        self.assets.save_details(self.asset.id, VehicleDetailsInput(section='pricing', pricing_mode='seasonal', pricing=grid(), deposit=6000, daily_rate=950))
        result = self.client.request('PUT', f'/api/platform/tenants/park-a/assets/{self.asset.id}', json={'name': 'Updated Toyota', 'brand': 'Toyota', 'public': False}, headers=self.admin_headers)
        self.assertEqual(result.status_code, 200, result.text)
        saved = result.json()['asset']
        self.assertEqual(saved['pricing']['daily_rate'], 950)
        self.assertEqual(saved['pricing']['pricing_mode'], 'seasonal')
        self.assertEqual(saved['pricing']['tariff_grid'], grid())
        self.assertEqual(saved['deposit_policy']['amount'], 6000)
        owner = self.client.post('/api/partners/fleet/save', json={'tenant_id': 'park-a', 'init_data': self.token(), 'asset_id': self.asset.id, 'data': {'name': 'Owner Toyota', 'brand': 'Toyota'}})
        self.assertEqual(owner.status_code, 200, owner.text)
        self.assertEqual(owner.json()['asset']['pricing'], saved['pricing'])
        self.assertEqual(owner.json()['asset']['deposit_policy'], saved['deposit_policy'])

    def test_owner_and_admin_patch_only_selected_section_and_public_projection(self):
        result = self.details({'section': 'pricing', 'pricing': grid(), 'deposit': 5000})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['asset']['photos']['main'], 'existing-photo')
        self.assertEqual(result.json()['asset']['specs']['internal_notes'], 'PRIVATE')
        result = self.details({'section': 'specs', 'specs': {'fuel': 'Гибрид', 'seats': 5, 'air_conditioning': True, 'features': ['Кресло', 'Кресло']}})
        self.assertEqual(result.status_code, 200, result.text)
        path = f'/api/platform/tenants/park-a/assets/{self.asset.id}/details'
        result = self.client.request('PUT', path, json={'section': 'description', 'description': '  Особое авто\nПосле ТО  '}, headers=self.admin_headers)
        self.assertEqual(result.status_code, 200, result.text)
        asset = result.json()['asset']
        self.assertEqual(asset['description'], 'Особое авто\nПосле ТО')
        self.assertEqual(asset['pricing']['tariff_grid'], grid())
        self.assertEqual(asset['specs']['brand'], 'Toyota')
        self.assertEqual(asset['specs']['features'], ['Кресло'])
        public = self.client.get('/api/storefront/park-a')
        self.assertEqual(public.status_code, 200, public.text)
        self.assertNotIn('PRIVATE', public.text)
        self.assertNotIn('internal_notes', public.text)
        self.assertEqual(public.json()['assets'][0]['description'], asset['description'])
        self.assertEqual(public.json()['assets'][0]['daily_rate'], 500)
        self.assertTrue(public.json()['assets'][0]['specs']['air_conditioning'])
        self.assertEqual(self.details({'section': 'pricing', 'pricing': None}).status_code, 200)
        self.assertIsNone(self.assets.assets.get(self.asset.id).pricing['tariff_grid'])

    def test_forged_customer_or_cross_park_details_do_not_write(self):
        before = self.assets.assets.path.read_bytes()
        self.assertEqual(self.details({'section': 'description', 'description': 'hack'}, init_data=self.token(uid=43)).status_code, 403)
        self.assertEqual(self.details({'section': 'description', 'description': 'hack'}, tenant_id='park-b').status_code, 403)
        result = self.client.request('PUT', f'/api/platform/tenants/park-b/assets/{self.asset.id}/details',
            json={'section': 'description', 'description': 'hack'}, headers=self.admin_headers)
        self.assertEqual(result.status_code, 404)
        self.assertEqual(self.assets.assets.path.read_bytes(), before)
        self.assertEqual(self.details({'section': 'specs', 'specs': {'fuel': 'invalid'}}).status_code, 422)

    def test_private_license_plate_owner_admin_round_trip_and_clear(self):
        plate = 'ขต 1517 ภูเก็ต'
        result = self.details({'section': 'specs', 'specs': {'fuel': 'Дизель'}, 'license_plate': '  ขต   1517 ภูเก็ต  '})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['asset']['license_plate'], plate)
        self.assertEqual(self.assets.assets.get(self.asset.id).license_plate, plate)
        # Old clients and other editor sections must not erase the private field.
        self.details({'section': 'specs', 'specs': {'seats': 7}})
        self.details({'section': 'description', 'description': 'Public description'})
        self.assets.save(AssetInput(name='Updated Toyota'), self.asset.id)
        saved = self.assets.assets.get(self.asset.id)
        self.assertEqual(saved.license_plate, plate)
        self.assertEqual(saved.photos['main'], 'existing-photo')
        public = self.client.get('/api/storefront/park-a')
        self.assertEqual(public.status_code, 200, public.text)
        self.assertNotIn('license_plate', public.text)
        self.assertNotIn(plate, public.text)
        path = f'/api/platform/tenants/park-a/assets/{self.asset.id}/details'
        result = self.client.put(path, json={'section': 'specs', 'specs': {}, 'license_plate': '5ขต 7503 กรุงเทพ'}, headers=self.admin_headers)
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json()['asset']['license_plate'], '5ขต 7503 กรุงเทพ')
        cleared = self.details({'section': 'specs', 'specs': {}, 'license_plate': ''})
        self.assertEqual(cleared.status_code, 200, cleared.text)
        self.assertIsNone(self.assets.assets.get(self.asset.id).license_plate)

    def test_invalid_or_unauthorized_license_plate_does_not_write(self):
        before = self.assets.assets.path.read_bytes()
        for data in ({'section': 'specs', 'specs': {}, 'license_plate': 'x' * 81},
                     {'section': 'description', 'description': 'Text', 'license_plate': 'ABC 123'}):
            self.assertEqual(self.details(data).status_code, 422)
        data = {'section': 'specs', 'specs': {}, 'license_plate': 'ขต 1517'}
        self.assertEqual(self.details(data, init_data=self.token(uid=43)).status_code, 403)
        self.assertEqual(self.details(data, tenant_id='park-b').status_code, 403)
        result = self.client.put(f'/api/platform/tenants/park-b/assets/{self.asset.id}/details', json=data, headers=self.admin_headers)
        self.assertEqual(result.status_code, 404)
        self.assertEqual(self.assets.assets.path.read_bytes(), before)

    def test_license_plate_audit_failure_rolls_back(self):
        before = self.assets.assets.path.read_bytes()
        with patch.object(self.assets, '_event', side_effect=OSError('audit unavailable')):
            with self.assertRaises(OSError):
                self.assets.save_details(self.asset.id, VehicleDetailsInput(section='specs', specs={}, license_plate='ขต 1517'))
        self.assertEqual(self.assets.assets.path.read_bytes(), before)

    def test_audit_failure_rolls_back_detail_patch(self):
        before = self.assets.assets.path.read_bytes()
        with patch.object(self.assets, '_event', side_effect=OSError('audit unavailable')):
            with self.assertRaises(OSError):
                self.assets.save_details(self.asset.id, VehicleDetailsInput(section='description', description='test'))
        self.assertEqual(self.assets.assets.path.read_bytes(), before)

    def test_grid_only_asset_is_available_without_a_flat_base_rate(self):
        asset = self.assets.save(AssetInput(name='Grid only', daily_rate=0, public=True))
        self.assets.save_details(asset.id, VehicleDetailsInput(section='pricing', pricing=grid()))
        result = self.client.post('/api/partners/parks/park-a/availability', json={'start_date': '2026-10-30', 'end_date': '2026-11-06'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertIn(asset.id, result.json()['available_asset_ids'])
