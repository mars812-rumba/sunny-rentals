from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import unittest
from unittest.mock import patch

import test_platform_partner_bot as fixtures
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.park_bookings import ParkBookingService, ParkBookingRequest, BookingConflict


class ParkBookingTests(unittest.TestCase):
    state = fixtures.PartnerBotTests.state
    update = fixtures.PartnerBotTests.update
    token = fixtures.PartnerBotTests.token
    invite = fixtures.PartnerBotTests.invite
    tearDown = fixtures.PartnerBotTests.tearDown
    def setUp(self):
        fixtures.PartnerBotTests.setUp(self)
        self.now = int(datetime(2026, 10, 9, tzinfo=timezone.utc).timestamp())
        self.asset = TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Toyota', daily_rate=800, deposit=5000, public=True))
        self.service.handle_update(self.update('ppark-a'))
        self.booking_service = ParkBookingService(self.service)

    def payload(self, **fields):
        return {'tenant_id': 'park-a', 'init_data': self.token(), 'asset_id': self.asset.id,
                'start_date': '2026-10-11', 'end_date': '2026-10-14', **fields}

    def booking_payload(self, **fields):
        payload = self.payload(**fields)
        quote = self.client.post('/api/partners/bookings/quote', json=payload)
        self.assertEqual(quote.status_code, 200, quote.text)
        return {**payload, 'quote_token': quote.json()['quote_token'], 'request_id': 'request_test_12345'}

    def test_quote_and_booking_use_server_price_customer_and_timezone(self):
        payload = self.booking_payload()
        result = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(result.status_code, 201, result.text)
        booking = result.json()['booking']
        self.assertEqual(booking['pricing']['total_rental'], '2400.00')
        self.assertEqual(booking['deposit']['amount'], '5000.00')
        self.assertEqual(booking['start_at'], '2026-10-10T17:00:00+00:00')
        self.assertEqual(booking['status'], 'requested')
        self.assertEqual(len(json.loads((self.root / 'tenants/park-a/customers.json').read_text())['items']), 1)
        self.assertEqual(json.loads((self.root / 'tenants/park-b/bookings.json').read_text())['items'], [])

    def test_idempotent_retry_and_parallel_conflict(self):
        payload = self.booking_payload()
        first = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(self.client.post('/api/partners/bookings', json=payload).json(), first.json())
        another = {**payload, 'request_id': 'another_test_12345'}
        self.assertEqual(self.client.post('/api/partners/bookings', json=another).status_code, 409)

    def test_concurrent_requests_only_one_hold(self):
        payload = self.booking_payload()
        def create(i):
            try:
                self.booking_service.create(ParkBookingRequest(**{**payload, 'request_id': f'request_concurrent_{i}'}))
                return True
            except BookingConflict:
                return False
        with ThreadPoolExecutor(max_workers=4) as pool:
            self.assertEqual(sum(pool.map(create, range(4))), 1)

    def test_price_change_and_invalid_dates_are_rejected(self):
        payload = self.booking_payload()
        TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Toyota', daily_rate=900, public=True), self.asset.id)
        self.assertEqual(self.client.post('/api/partners/bookings', json=payload).status_code, 409)
        for fields in ({'start_date': '2020-01-01'}, {'end_date': '2026-10-11'}, {'end_date': '2028-01-01'}):
            self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload(**fields)).status_code, 422)

    def test_calendar_requires_owner_or_platform_admin_and_status_can_release_hold(self):
        payload = self.booking_payload()
        booking = self.client.post('/api/partners/bookings', json=payload).json()['booking']
        self.assertEqual(self.client.post('/api/partners/calendar', json={'tenant_id': 'park-a', 'init_data': self.token()}).status_code, 403)
        self.service.handle_update(self.update(self.invite(), update_id=102))
        calendar = self.client.post('/api/partners/calendar', json={'tenant_id': 'park-a', 'init_data': self.token()})
        self.assertEqual(len(calendar.json()['bookings']), 1)
        action = {'tenant_id': 'park-a', 'init_data': self.token(), 'booking_id': booking['id'], 'status': 'confirmed', 'expected_status': 'requested'}
        self.assertEqual(self.client.post('/api/partners/bookings/status', json=action).status_code, 200)
        self.assertEqual(self.client.post('/api/partners/bookings/status', json=action).status_code, 409)
        action.update(status='cancelled', expected_status='confirmed')
        self.assertEqual(self.client.post('/api/partners/bookings/status', json=action).status_code, 200)
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload()).status_code, 200)
        self.assertEqual(self.client.get('/api/partners/parks/park-a/calendar').status_code, 401)
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        self.assertEqual(self.client.get('/api/partners/parks/park-b/calendar', headers=headers).json()['bookings'], [])

    def test_foreign_asset_and_wrong_bot_have_no_writes(self):
        before = (self.root / 'tenants/park-a/bookings.json').read_bytes()
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload(tenant_id='park-b')).status_code, 403)
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload(init_data=self.token(bot_token='other'))).status_code, 403)
        self.assertEqual((self.root / 'tenants/park-a/bookings.json').read_bytes(), before)

    def test_booking_save_failure_has_no_hold(self):
        payload = self.booking_payload()
        from platform_core.repositories import JsonCollectionRepository
        original = JsonCollectionRepository._write_document
        def fail_bookings(repo, document):
            if repo.path.name == 'bookings.json': raise OSError('disk failure')
            return original(repo, document)
        with patch.object(JsonCollectionRepository, '_write_document', fail_bookings):
            with self.assertRaises(OSError): self.booking_service.create(ParkBookingRequest(**payload))
        self.assertEqual(json.loads((self.root / 'tenants/park-a/bookings.json').read_text())['items'], [])

    def test_adjacent_dates_do_not_overlap(self):
        self.client.post('/api/partners/bookings', json=self.booking_payload())
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload(start_date='2026-10-14', end_date='2026-10-16')).status_code, 200)

    def availability(self, **fields):
        return self.client.post('/api/partners/parks/park-a/availability', json={
            'start_date': '2026-10-11', 'end_date': '2026-10-14', **fields})

    def test_public_availability_is_scoped_and_contains_no_client_data(self):
        TenantAssetAdmin(self.root, self.admin, 'park-b').save(AssetInput(name='Foreign', daily_rate=900, public=True))
        TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Hidden', daily_rate=900, public=False))
        TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='No price', daily_rate=0, public=True))
        result = self.availability()
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(result.json(), {'tenant_id': 'park-a', 'start_date': '2026-10-11',
            'end_date': '2026-10-14', 'days': 3, 'available_asset_ids': [self.asset.id]})

    def test_availability_hold_adjacent_dates_and_cancel_release(self):
        booking = self.client.post('/api/partners/bookings', json=self.booking_payload()).json()['booking']
        self.assertEqual(self.availability().json()['available_asset_ids'], [])
        self.assertEqual(self.availability(start_date='2026-10-14', end_date='2026-10-16').json()['available_asset_ids'], [self.asset.id])
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        result = self.client.request('PATCH', f"/api/partners/parks/park-a/bookings/{booking['id']}/status", headers=headers,
            json={'status': 'cancelled', 'expected_status': 'requested'})
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.availability().json()['available_asset_ids'], [self.asset.id])

    def test_availability_rejects_invalid_dates_and_untrusted_fields(self):
        for fields in ({'start_date': '2020-01-01'}, {'end_date': '2026-10-11'},
                       {'end_date': '2028-01-01'}, {'role': 'owner'}, {'chat_id': '42'}):
            self.assertEqual(self.availability(**fields).status_code, 422)
        missing = self.client.post('/api/partners/parks/missing/availability', json={
            'start_date': '2026-10-11', 'end_date': '2026-10-14'})
        self.assertEqual(missing.status_code, 404)

    def test_hidden_and_foreign_assets_are_unavailable(self):
        foreign = TenantAssetAdmin(self.root, self.admin, 'park-b').save(AssetInput(name='Foreign', daily_rate=900, public=True))
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload(asset_id=foreign.id)).status_code, 409)
        TenantAssetAdmin(self.root, self.admin, 'park-a').save(AssetInput(name='Hidden', daily_rate=800, public=False), self.asset.id)
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload()).status_code, 409)

    def test_untrusted_price_role_and_chat_id_are_forbidden(self):
        payload = self.booking_payload()
        for field in ('total_rental', 'role', 'chat_id'):
            self.assertEqual(self.client.post('/api/partners/bookings', json={**payload, field: 'fake'}).status_code, 422)

    def test_idempotency_key_cannot_be_reused_for_other_dates(self):
        payload = self.booking_payload()
        self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(self.client.post('/api/partners/bookings', json={**payload, 'end_date': '2026-10-15'}).status_code, 409)

    def test_calendar_revocation_and_cross_park_status(self):
        booking = self.client.post('/api/partners/bookings', json=self.booking_payload()).json()['booking']
        self.service.handle_update(self.update(self.invite(), update_id=102))
        self.service.revoke_owner(self.admin, 'park-a', '42')
        self.assertEqual(self.client.post('/api/partners/calendar', json={'tenant_id': 'park-a', 'init_data': self.token()}).status_code, 403)
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        response = self.client.request('PATCH', f"/api/partners/parks/park-b/bookings/{booking['id']}/status", headers=headers, json={'status': 'cancelled', 'expected_status': 'requested'})
        self.assertEqual(response.status_code, 403)

    def test_symlink_booking_collection_cannot_read_another_park(self):
        path = self.root / 'tenants/park-a/bookings.json'
        path.unlink()
        path.symlink_to(self.root / 'tenants/park-b/bookings.json')
        self.assertEqual(self.client.post('/api/partners/bookings/quote', json=self.payload()).status_code, 403)
