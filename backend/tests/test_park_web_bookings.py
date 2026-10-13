"""Public browser requests and private edits; no bot/token required."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
import unittest
from fastapi import FastAPI
from test_platform_asset_admin import InProcessASGIClient
import test_park_owner_web as fixtures
from types import SimpleNamespace
from platform_core.partner_bot import PartnerBotService
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.park_bookings import ParkBookingService, ParkWebBookingRequest
from platform_core.models import Booking
from platform_core.vehicle_details import VehicleDetailsInput
from platform_core.repositories import JsonCollectionRepository
from platform_core.context import TenantContext
from platform_storefront_api import create_storefront_router
from platform_owner_api import create_owner_web_router


class WebBookingTests(unittest.TestCase):
    tearDown = fixtures.OwnerWebTests.tearDown
    login = fixtures.OwnerWebTests.login
    post = fixtures.OwnerWebTests.post

    def setUp(self):
        fixtures.OwnerWebTests.setUp(self)
        self.provisioner.publish_tenant(self.admin, 'park-a')
        self.asset = TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Toyota', daily_rate=800, deposit=5000, public=True))
        app = FastAPI()
        app.include_router(create_storefront_router(self.root, self.platform_auth, booking_enabled=True))
        app.include_router(create_owner_web_router(self.root))
        self.client = InProcessASGIClient(app)
        self.client.headers = {'X-Owner-Request': '1', 'X-Storefront-Request': '1', 'Origin': 'http://test'}
        self.start = (datetime.now(timezone.utc) + timedelta(days=3)).date()
        self.end = self.start + timedelta(days=3)

    def payload(self, **changes):
        return {'tenant_id': 'park-a', 'asset_id': self.asset.id, 'start_date': self.start.isoformat(), 'end_date': self.end.isoformat(),
            'pickup': {'time': '10:00', 'location': 'city', 'address': '', 'return_time': '18:00', 'return_location': 'city', 'return_address': ''}, **changes}

    def quote(self, **changes):
        response = self.client.post('/api/storefront/park-a/quote', json=self.payload(**changes))
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_availability_prices_match_quotes_for_flat_duration_and_seasonal(self):
        from datetime import date
        admin = TenantAssetAdmin(self.root, self.admin, 'park-a')
        low = dict(price_1_6=900, price_7_14=900, price_15_29=900, price_30=900)
        high = dict(price_1_6=1200, price_7_14=1200, price_15_29=1200, price_30=1200)
        grid = dict(low_season=low, high_season=high, high_start='11-01', high_end='03-31')
        seasonal = admin.save(AssetInput(name='MG ZS', daily_rate=900, deposit=8000, public=True))
        duration = admin.save(AssetInput(name='MG 5', daily_rate=900, deposit=5000, public=True))
        private = admin.save(AssetInput(name='Private car', daily_rate=100, deposit=0, public=False))
        admin.save_details(seasonal.id, VehicleDetailsInput(section='pricing', pricing_mode='seasonal', pricing=grid, deposit=8000))
        admin.save_details(duration.id, VehicleDetailsInput(section='pricing', pricing_mode='duration', pricing=grid, deposit=5000))
        year = self.start.year + 1
        for start, end, clock, days, expected in [
            (date(year, 11, 18), date(year, 11, 29), '10:00', 11, '13200.00'),
            (date(year, 10, 28), date(year, 11, 8), '10:00', 11, '12000.00'),
            (date(year, 10, 28), date(year, 11, 8), '18:00', 12, '13200.00'),
        ]:
            response = self.client.post('/api/storefront/park-a/availability', json={'start_date': start.isoformat(), 'end_date': end.isoformat(), 'pickup_time': '10:00', 'return_time': clock})
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()
            self.assertNotIn(private.id, data['prices'])
            self.assertEqual(data['prices'][seasonal.id]['total_rental'], expected)
            self.assertEqual(data['prices'][duration.id]['total_rental'], f'{900 * days}.00')
            self.assertEqual(data['prices'][self.asset.id]['total_rental'], f'{800 * days}.00')
            self.assertEqual(data['pickup_time'], '10:00')
            self.assertEqual(data['return_time'], clock)
            for asset in (self.asset, seasonal, duration):
                quote = self.quote(asset_id=asset.id, start_date=start.isoformat(), end_date=end.isoformat(), pickup={'time': '10:00', 'return_time': clock, 'location': 'city', 'return_location': 'city'})
                price = data['prices'][asset.id]
                for key in ('days', 'daily_rate', 'total_rental', 'deposit', 'currency'):
                    self.assertEqual(price[key], quote[key])
                self.assertEqual(price.get('tariff_breakdown'), quote.get('tariff_breakdown'))
                self.assertNotIn('quote_token', price)
                self.assertNotIn('customer', price)

    def create_data(self):
        quote = self.quote()
        return {**self.payload(), 'customer_name': 'สมชาย', 'contact': {'channel': 'phone', 'value': '+66123456789', 'consent': True},
                'request_id': 'web_browser_request_123456', 'quote_token': quote['quote_token']}

    def test_return_fee_paid_day_and_exact_occupancy(self):
        quote = self.quote()
        self.assertEqual(quote['days'], 4)
        self.assertTrue(quote['extra_day'])
        self.assertEqual(quote['total_rental'], '3200.00')
        self.assertEqual(quote['delivery_fee'], '500.00')
        self.assertEqual(quote['return_fee'], '500.00')
        self.assertEqual(quote['total_payable'], '4200.00')
        data = self.create_data()
        created = self.client.post('/api/storefront/park-a/bookings', json=data)
        self.assertEqual(created.status_code, 201, created.text)
        booking = created.json()['booking']
        self.assertEqual(booking['source'], 'web_storefront')
        self.assertEqual(booking['end_at'][11:16], '11:00')  # 18:00 Bangkok, not an extra calendar day.
        for clock, available in [('17:59', False), ('18:00', True), ('18:01', True)]:
            response = self.client.post('/api/storefront/park-a/availability', json={'start_date': self.end.isoformat(),
                'end_date': (self.end + timedelta(days=2)).isoformat(), 'pickup_time': clock, 'return_time': clock})
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(self.asset.id in response.json()['available_asset_ids'], available)
        self.login()
        private = self.post('/calendar').json()['bookings'][0]
        self.assertEqual(private['operator_details']['customer_name'], 'สมชาย')
        self.assertEqual(private['customer']['contact']['value'], '+66123456789')
        self.assertEqual(private['pricing']['pickup']['return_time'], '18:00')

    def test_equal_earlier_and_free_return(self):
        for clock in ('09:00', '10:00'):
            pickup = {**self.payload()['pickup'], 'return_time': clock, 'return_location': 'airport', 'return_address': 'discarded'}
            quote = self.quote(pickup=pickup)
            self.assertEqual(quote['days'], 3)
            self.assertFalse(quote['extra_day'])
            self.assertEqual(quote['return_fee'], '0.00')
            self.assertEqual(quote['total_payable'], '2900.00')
            self.assertEqual(quote['pickup']['return_address'], '')

    def test_input_tampering_private_assets_and_drafts(self):
        data = self.create_data()
        for field in ('customer_name', 'contact'):
            changed = dict(data)
            del changed[field]
            self.assertEqual(self.client.post('/api/storefront/park-a/bookings', json=changed).status_code, 422)
        for changes in ({'total_payable': '0'}, {'status': 'confirmed'}, {'note': 'client cannot set internal note'}, {'init_data': 'forged'}):
            self.assertEqual(self.client.post('/api/storefront/park-a/bookings', json={**data, **changes}).status_code, 422)
        changed = {**data, 'pickup': {**data['pickup'], 'return_time': '10:00'}}
        self.assertEqual(self.client.post('/api/storefront/park-a/bookings', json=changed).status_code, 409)
        invalid = self.payload(pickup={**self.payload()['pickup'], 'return_time': '24:00'})
        self.assertEqual(self.client.post('/api/storefront/park-a/quote', json=invalid).status_code, 422)
        self.assertEqual(self.client.post('/api/storefront/park-b/quote', json=self.payload(tenant_id='park-b')).status_code, 404)
        TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Private', public=False), self.asset.id)
        self.assertEqual(self.client.post('/api/storefront/park-a/quote', json=self.payload()).status_code, 409)

    def test_edit_cas_scope_immutable_price_and_note_privacy_on_public_retry(self):
        data = self.create_data()
        booking = self.client.post('/api/storefront/park-a/bookings', json=data).json()['booking']
        self.login()
        original = self.post('/calendar').json()['bookings'][0]
        edit = {'booking_id': booking['id'], 'customer_name': 'New name', 'contact_channel': 'whatsapp',
                'contact_value': '+66999999999', 'note': 'PRIVATE NOTE', 'expected_updated_at': original['updated_at']}
        self.assertEqual(self.post('/bookings/edit', tenant_id='park-b', **edit).status_code, 401)
        self.assertEqual(self.post('/bookings/edit', **edit).status_code, 200)
        self.assertEqual(self.post('/bookings/edit', **edit).status_code, 409)
        saved = self.post('/calendar').json()['bookings'][0]
        self.assertEqual(saved['pricing'], original['pricing'])
        self.assertEqual(saved['start_at'], original['start_at'])
        self.assertEqual(saved['end_at'], original['end_at'])
        self.assertEqual(saved['operator_details']['customer_name'], 'New name')
        self.assertEqual(saved['customer']['contact']['value'], '+66999999999')
        self.assertEqual(saved['operator_details']['note'], 'PRIVATE NOTE')
        retry = self.client.post('/api/storefront/park-a/bookings', json=data)
        self.assertEqual(retry.status_code, 201, retry.text)
        self.assertEqual(retry.json()['booking']['id'], booking['id'])
        self.assertNotIn('PRIVATE NOTE', retry.text)
        self.assertNotIn('+66999999999', retry.text)
        self.assertNotIn('New name', retry.text)
        changed = {**edit, 'expected_updated_at': saved['updated_at'], 'contact_value': '', 'note': ''}
        self.assertEqual(self.post('/bookings/edit', **changed).status_code, 200)
        self.assertNotIn('contact', self.post('/calendar').json()['bookings'][0]['customer'])
        self.assertEqual(len(self.post('/calendar').json()['bookings']), 1)

    def test_public_rate_limit_and_private_route_denial(self):
        self.assertEqual(self.post('/calendar').status_code, 401)
        for _ in range(120):
            self.quote()
        response = self.client.post('/api/storefront/park-a/quote', json=self.payload())
        self.assertEqual(response.status_code, 429)

    def test_parallel_guest_creation_is_idempotent_and_overlaps_rechecked(self):
        data = self.create_data()
        # Use the real service locks concurrently; HTTP adapter intentionally runs sync handlers directly.
        service = ParkBookingService(SimpleNamespace(provisioner=self.provisioner,
            clock=self.platform_auth.clock, tenant=PartnerBotService.tenant))
        request = ParkWebBookingRequest(**data)
        with ThreadPoolExecutor(max_workers=3) as pool:
            bookings = list(pool.map(lambda _: service.create_web(request), range(3)))
        self.assertEqual(len({item['id'] for item in bookings}), 1)
        records = JsonCollectionRepository(self.root, TenantContext('park-a'), 'bookings.json', Booking).list()
        self.assertEqual(len(records), 1)


if __name__ == '__main__':
    unittest.main()
