from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import unittest
from unittest.mock import patch
import test_platform_partner_bot as fixtures
from platform_core.asset_admin import AssetInput, TenantAssetAdmin
from platform_core.park_bookings import ParkBookingService, ParkManualRequest, ParkBookingRequest, BookingConflict
from platform_core.repositories import JsonCollectionRepository


class ManualCalendarTests(unittest.TestCase):
    state = fixtures.PartnerBotTests.state
    update = fixtures.PartnerBotTests.update
    token = fixtures.PartnerBotTests.token
    invite = fixtures.PartnerBotTests.invite
    tearDown = fixtures.PartnerBotTests.tearDown

    def setUp(self):
        fixtures.PartnerBotTests.setUp(self)
        self.now = int(datetime(2026, 10, 9, tzinfo=timezone.utc).timestamp())
        self.service.handle_update(self.update(self.invite()))
        self.assets = TenantAssetAdmin(self.root, self.admin, 'park-a')
        self.asset = self.assets.save(AssetInput(name='Toyota', daily_rate=800, deposit=5000, public=True))
        self.bookings = ParkBookingService(self.service)

    def payload(self, **extra):
        return {'asset_id': self.asset.id, 'start_date': '2026-10-11', 'end_date': '2026-10-14',
                'request_id': 'manual_request_12345', 'entry_type': 'rental', 'customer_name': 'Иван', 'note': 'Из телефона', **extra}

    def create(self, **extra):
        return self.client.post('/api/partners/calendar/manual', json={
            'tenant_id': 'park-a', 'init_data': self.token(), **self.payload(**extra)})

    def documents(self):
        return json.loads((self.root / 'tenants/park-a/bookings.json').read_text())['items']

    def test_short_numbers_are_persisted_unique_and_stable_on_retry_and_cancellation(self):
        first = self.create().json()['booking']
        self.assertEqual(first['booking_number'], '100001')
        self.assertEqual(len(first['id']), 64)
        self.assertEqual(self.create().json()['booking'], first)
        second = self.create(request_id='manual_request_67890', start_date='2026-10-14', end_date='2026-10-17').json()['booking']
        self.assertEqual(second['booking_number'], '100002')
        from platform_core.park_bookings import ParkStatusRequest
        cancelled = self.bookings.change_status('park-a', first['id'],
            ParkStatusRequest(status='cancelled', expected_status='confirmed'), init_data=self.token())
        self.assertEqual(cancelled['booking_number'], first['booking_number'])
        self.assertEqual([item['booking_number'] for item in self.documents()], ['100001', '100002'])

    def test_legacy_numbers_are_backfilled_once_without_changing_ids_or_fields(self):
        first = self.create().json()['booking']
        path = self.root / 'tenants/park-a/bookings.json'
        document = json.loads(path.read_text())
        document['items'][0].pop('booking_number')
        document['items'][0]['legacy']['future_metadata'] = {'preserve': True}
        path.write_text(json.dumps(document))
        items = self.bookings.calendar('park-a', init_data=self.token())
        self.assertEqual(items[0]['booking_number'], '100001')
        self.assertEqual(items[0]['id'], first['id'])
        saved = path.read_bytes()
        self.assertEqual(self.bookings.calendar('park-a', init_data=self.token()), items)
        self.assertEqual(path.read_bytes(), saved)
        self.assertEqual(self.documents()[0]['legacy']['future_metadata'], {'preserve': True})

    def test_parallel_manual_requests_get_distinct_numbers(self):
        def create(index):
            return self.bookings.create_manual('park-a', ParkManualRequest(**self.payload(
                request_id=f'parallel_number_{index:02d}', start_date=f'2026-10-{11 + index:02d}',
                end_date=f'2026-10-{12 + index:02d}')), init_data=self.token())
        with ThreadPoolExecutor(max_workers=4) as pool:
            results = list(pool.map(create, range(4)))
        self.assertEqual({item['booking_number'] for item in results}, {'100001', '100002', '100003', '100004'})

    def test_manual_rental_is_confirmed_scoped_and_not_a_fake_telegram_customer(self):
        result = self.create()
        self.assertEqual(result.status_code, 201, result.text)
        booking = result.json()['booking']
        self.assertEqual(booking['status'], 'confirmed')
        self.assertEqual(booking['source'], 'owner_manual')
        self.assertEqual(booking['pricing']['total_rental'], '2400.00')
        self.assertEqual(booking['operator_details']['customer_name'], 'Иван')
        self.assertEqual(booking['start_at'], '2026-10-10T17:00:00+00:00')
        record = self.documents()[0]
        self.assertEqual(record['operator_details']['created_by'], self.service.actor_id('42'))
        self.assertIsNone(record['customer_id'])
        self.assertEqual(json.loads((self.root / 'tenants/park-a/customers.json').read_text())['items'], [])
        listing = self.client.post('/api/partners/calendar', json={'tenant_id': 'park-a', 'init_data': self.token()})
        self.assertEqual(listing.json()['bookings'][0], booking)
        self.assertNotIn('created_by', booking['operator_details'])
        self.assertEqual(json.loads((self.root / 'tenants/park-b/bookings.json').read_text())['items'], [])

    def test_manual_prices_do_not_change_catalog_and_hidden_assets_can_be_scheduled(self):
        hidden = self.assets.save(AssetInput(name='Hidden', daily_rate=0, public=False))
        result = self.create(asset_id=hidden.id, daily_rate='700.005', deposit='1000.01')
        self.assertEqual(result.status_code, 201, result.text)
        self.assertEqual(result.json()['booking']['pricing']['total_rental'], '2100.03')
        self.assertEqual(self.assets.assets.get(hidden.id).pricing['daily_rate'], 0)
        self.assertFalse(self.assets.assets.get(hidden.id).public)

    def test_block_holds_dates_and_cancel_releases_without_exposing_private_reason(self):
        result = self.create(entry_type='block', customer_name='', note='Ремонт двигателя')
        self.assertEqual(result.status_code, 201, result.text)
        booking = result.json()['booking']
        self.assertEqual(booking['pricing']['total_rental'], '0.00')
        self.assertEqual(booking['deposit']['amount'], '0.00')
        period = {'start_date': '2026-10-11', 'end_date': '2026-10-14'}
        available = self.client.post('/api/partners/parks/park-a/availability', json=period)
        self.assertEqual(available.json()['available_asset_ids'], [])
        self.assertNotIn('Ремонт', available.text)
        self.assertEqual(self.client.post('/api/partners/parks/park-a/availability', json={
            'start_date': '2026-10-14', 'end_date': '2026-10-16'}).json()['available_asset_ids'], [self.asset.id])
        cancelled = self.client.post('/api/partners/bookings/status', json={'tenant_id': 'park-a', 'init_data': self.token(),
            'booking_id': booking['id'], 'status': 'cancelled', 'expected_status': 'confirmed'})
        self.assertEqual(cancelled.status_code, 200, cancelled.text)
        self.assertEqual(self.client.post('/api/partners/parks/park-a/availability', json=period).json()['available_asset_ids'], [self.asset.id])

    def test_retries_are_idempotent_and_changed_payload_is_conflict(self):
        first = self.create()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(self.create().json(), first.json())
        self.assertEqual(self.create(note='Другой клиент').status_code, 409)
        self.assertEqual(len(self.documents()), 1)

    def test_manual_prebooking_holds_dates_is_idempotent_and_can_be_confirmed(self):
        first = self.create(booking_status='requested')
        self.assertEqual(first.status_code, 201, first.text)
        booking = first.json()['booking']
        self.assertEqual(booking['status'], 'requested')
        self.assertEqual(booking['pricing']['total_rental'], '2400.00')
        self.assertEqual(self.create(booking_status='requested').json(), first.json())
        self.assertEqual(self.create(booking_status='confirmed').status_code, 409)
        self.assertEqual(self.create(request_id='other_request_12345').status_code, 409)
        period = {'start_date': '2026-10-11', 'end_date': '2026-10-14'}
        self.assertEqual(self.client.post('/api/partners/parks/park-a/availability', json=period).json()['available_asset_ids'], [])
        confirmed = self.client.post('/api/partners/bookings/status', json={'tenant_id': 'park-a', 'init_data': self.token(),
            'booking_id': booking['id'], 'status': 'confirmed', 'expected_status': 'requested'})
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        self.assertEqual(confirmed.json()['booking']['status'], 'confirmed')
        self.assertEqual(len(self.documents()), 1)

    def test_admin_prebooking_can_be_cancelled_and_releases_period(self):
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        route = '/api/partners/parks/park-a'
        first = self.client.post(route + '/calendar/manual', json=self.payload(booking_status='requested'), headers=headers)
        self.assertEqual(first.status_code, 201, first.text)
        booking = first.json()['booking']
        cancelled = self.client.request('PATCH', route + '/bookings/' + booking['id'] + '/status', headers=headers,
            json={'status': 'cancelled', 'expected_status': 'requested'})
        self.assertEqual(cancelled.status_code, 200, cancelled.text)
        self.assertEqual(self.client.post('/api/partners/parks/park-a/availability', json={
            'start_date': '2026-10-11', 'end_date': '2026-10-14'}).json()['available_asset_ids'], [self.asset.id])

    def test_manual_status_is_bounded_and_blocks_cannot_be_prebookings(self):
        for status in ['draft', 'cancelled', 'in_progress', 'owner', '']:
            self.assertEqual(self.create(booking_status=status).status_code, 422)
        self.assertEqual(self.create(entry_type='block', customer_name='', note='Ремонт', booking_status='requested').status_code, 422)
        self.assertEqual(self.documents(), [])

    def test_confirmed_retry_keeps_the_pre_status_field_fingerprint(self):
        first = self.create()
        self.assertEqual(first.status_code, 201)
        self.assertEqual(self.create(booking_status='confirmed').json(), first.json())
        self.assertEqual(len(self.documents()), 1)

    def test_owner_customer_foreign_asset_and_untrusted_fields_fail_closed(self):
        self.service.handle_update(self.update('ppark-a', uid=43, update_id=101))
        self.assertEqual(self.create(init_data=self.token(uid=43)).status_code, 403)
        self.assertEqual(self.create(init_data=self.token(bot_token='wrong')).status_code, 403)
        self.assertEqual(self.create(tenant_id='park-b').status_code, 403)
        foreign = TenantAssetAdmin(self.root, self.admin, 'park-b').save(AssetInput(name='Other'))
        self.assertEqual(self.create(asset_id=foreign.id).status_code, 409)
        for extra in ({'role': 'owner'}, {'status': 'confirmed'}, {'source': 'telegram_partner'}, {'operator_details': {'created_by': '1'}}):
            self.assertEqual(self.create(**extra).status_code, 422)
        self.service.revoke_owner(self.admin, 'park-a', '42')
        self.assertEqual(self.create().status_code, 403)
        self.assertEqual(self.documents(), [])

    def test_admin_can_create_for_park_but_needs_session_and_scoped_asset(self):
        route = '/api/partners/parks/park-a/calendar/manual'
        self.assertEqual(self.client.post(route, json=self.payload()).status_code, 401)
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        result = self.client.post(route, json=self.payload(), headers=headers)
        self.assertEqual(result.status_code, 201, result.text)
        self.assertEqual(result.json()['booking']['source'], 'platform_manual')
        self.assertEqual(self.client.post('/api/partners/parks/park-b/calendar/manual', json=self.payload(), headers=headers).status_code, 409)

    def test_invalid_dates_and_fields_never_write(self):
        for extra in ({'end_date': '2026-10-11'}, {'start_date': '2025-10-01'}, {'end_date': '2028-01-01'},
                      {'daily_rate': 'NaN'}, {'daily_rate': '-1'}, {'daily_rate': '0.001'}, {'deposit': '-1'},
                      {'customer_name': ' '}, {'note': 'x' * 1001}, {'entry_type': 'block', 'customer_name': '', 'note': ''},
                      {'entry_type': 'block', 'customer_name': '', 'daily_rate': '0'}, {'entry_type': 'other'}):
            result = self.create(**extra)
            self.assertEqual(result.status_code, 422, result.text)
        self.assertEqual(self.documents(), [])
        self.assertEqual(self.create(start_date='2026-10-01', end_date='2026-10-05').status_code, 201)

    def test_overlap_with_bot_is_serialized_under_same_lock(self):
        public = {'tenant_id': 'park-a', 'init_data': self.token(), 'asset_id': self.asset.id,
                  'start_date': '2026-10-11', 'end_date': '2026-10-14'}
        quote = self.client.post('/api/partners/bookings/quote', json=public).json()
        bot = ParkBookingRequest(**{**public, 'quote_token': quote['quote_token'], 'request_id': 'bot_request_123456',
            'contact': {'channel': 'phone', 'value': '+66123456789', 'consent': True}})
        manual = ParkManualRequest(**self.payload(entry_type='block', customer_name='', note='Обслуживание'))
        def create(method):
            try:
                method()
                return True
            except BookingConflict:
                return False
        methods = [lambda: self.bookings.create(bot), lambda: self.bookings.create_manual('park-a', manual, init_data=self.token())]
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sum(pool.map(create, methods)), 1)
        self.assertEqual(len(self.documents()), 1)

    def test_archived_vehicle_and_disk_failure_have_no_hold(self):
        original = JsonCollectionRepository._write_document
        def fail(repo, document):
            if repo.path.name == 'bookings.json':
                raise OSError('disk failure')
            return original(repo, document)
        with patch.object(JsonCollectionRepository, '_write_document', fail):
            with self.assertRaises(OSError):
                self.bookings.create_manual('park-a', ParkManualRequest(**self.payload()), init_data=self.token())
        self.assertEqual(self.documents(), [])
        self.assets.archive(self.asset.id)
        self.assertEqual(self.create().status_code, 409)
        self.assertEqual(self.documents(), [])
