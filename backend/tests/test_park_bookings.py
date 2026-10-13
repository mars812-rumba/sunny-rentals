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
        return {**payload, 'quote_token': quote.json()['quote_token'], 'request_id': 'request_test_12345',
                'contact': {'channel': 'whatsapp', 'value': '+66123456789', 'consent': True}}

    def test_owner_and_admin_edit_only_one_booking_not_shared_customer_or_price(self):
        payload = self.booking_payload()
        first = self.client.post('/api/partners/bookings', json=payload).json()['booking']
        second_payload = self.booking_payload(start_date='2026-10-14', end_date='2026-10-17')
        second_payload['request_id'] = 'second_request_123456'
        second = self.client.post('/api/partners/bookings', json=second_payload).json()['booking']
        data = {'customer_name': 'Updated customer', 'contact_channel': 'phone', 'contact_value': '+66888888888',
                'note': 'Internal only', 'expected_updated_at': first['updated_at']}
        signed = {'tenant_id': 'park-a', 'init_data': self.token(), 'booking_id': first['id'], **data}
        self.assertEqual(self.client.post('/api/partners/bookings/edit', json=signed).status_code, 403)
        header = {'Authorization': f'Bearer {self.auth.issue_for_verified_actor("1")}'}
        endpoint = f'/api/partners/parks/park-a/bookings/{first["id"]}/details'
        changed = self.client.patch(endpoint, json=data, headers=header) if hasattr(self.client, 'patch') else self.client.request('PATCH', endpoint, json=data, headers=header)
        self.assertEqual(changed.status_code, 200, changed.text)
        self.assertEqual(changed.json()['booking']['pricing'], first['pricing'])
        self.service.handle_update(self.update(self.invite(), update_id=777))
        self.assertEqual(self.client.post('/api/partners/bookings/edit', json=signed).status_code, 409)
        signed['expected_updated_at'] = changed.json()['booking']['updated_at']
        signed['note'] = 'Changed by owner'
        self.assertEqual(self.client.post('/api/partners/bookings/edit', json=signed).status_code, 200)
        retry = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(retry.status_code, 201, retry.text)
        self.assertNotIn('Changed by owner', retry.text)
        private = self.client.post('/api/partners/calendar', json={'tenant_id': 'park-a', 'init_data': self.token()}).json()['bookings']
        untouched = next(item for item in private if item['id'] == second['id'])
        self.assertEqual(untouched['operator_details']['customer_name'], '')
        self.assertEqual(untouched['customer']['name'], 'Test')
        self.assertEqual(untouched['customer']['contact']['value'], '+66123456789')

    def test_quote_and_booking_use_server_price_customer_and_timezone(self):
        payload = self.booking_payload()
        result = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(result.status_code, 201, result.text)
        booking = result.json()['booking']
        self.assertEqual(booking['booking_number'], '100001')
        self.assertEqual(booking['pricing']['total_rental'], '2400.00')
        self.assertEqual(booking['deposit']['amount'], '5000.00')
        self.assertEqual(booking['start_at'], '2026-10-10T17:00:00+00:00')
        self.assertEqual(booking['status'], 'requested')
        self.assertEqual(len(json.loads((self.root / 'tenants/park-a/customers.json').read_text())['items']), 1)
        self.assertEqual(json.loads((self.root / 'tenants/park-b/bookings.json').read_text())['items'], [])

    def test_city_pickup_fee_time_and_address_are_server_snapshots(self):
        pickup = {'time': '14:30', 'location': 'city', 'address': '  Marina Hotel  '}
        payload = self.booking_payload(pickup=pickup)
        quote = self.client.post('/api/partners/bookings/quote', json=self.payload(pickup=pickup)).json()
        self.assertEqual(quote['total_rental'], '2400.00')
        self.assertEqual(quote['delivery_fee'], '500.00')
        self.assertEqual(quote['total_payable'], '2900.00')
        self.assertEqual(quote['deposit'], '5000.00')
        self.assertEqual(quote['pickup']['address'], 'Marina Hotel')
        changed = self.client.post('/api/partners/bookings', json={**payload, 'pickup': {**pickup, 'time': '15:30'}})
        self.assertEqual(changed.status_code, 409, changed.text)
        result = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(result.status_code, 201, result.text)
        saved = result.json()['booking']
        self.assertEqual(saved['start_at'], '2026-10-11T07:30:00+00:00')
        self.assertEqual(saved['end_at'], '2026-10-14T07:30:00+00:00')
        self.assertEqual(saved['pricing']['pickup'], quote['pickup'])
        self.assertEqual(saved['pricing']['delivery_fee'], '500.00')
        self.assertEqual(saved['pricing']['total_payable'], '2900.00')
        replay = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(replay.json()['booking']['id'], saved['id'])
        tampered = self.client.post('/api/partners/bookings', json={**payload, 'pickup': {**pickup, 'address': 'Different Hotel'}})
        self.assertEqual(tampered.status_code, 409, tampered.text)
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        private = self.client.get('/api/partners/parks/park-a/calendar', headers=headers).json()['bookings'][0]
        self.assertEqual(private['pricing']['pickup'], quote['pickup'])
        for pickup_time, free in [('09:00', False), ('14:30', True), ('15:00', True)]:
            available = self.client.post('/api/partners/parks/park-a/availability', json={'start_date': '2026-10-14', 'end_date': '2026-10-16', 'pickup_time': pickup_time})
            self.assertEqual(available.status_code, 200, available.text)
            self.assertEqual(self.asset.id in available.json()['available_asset_ids'], free)
            self.assertNotIn('Marina', available.text)

    def test_free_pickups_validation_and_fee_tampering(self):
        for location in ('airport', 'self_pickup'):
            result = self.client.post('/api/partners/bookings/quote', json=self.payload(pickup={'time': '09:00', 'location': location, 'address': 'Old city address'}))
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()['delivery_fee'], '0.00')
            self.assertEqual(result.json()['total_payable'], '2400.00')
            self.assertEqual(result.json()['pickup']['address'], '')
        for pickup in ({'time': '24:00', 'location': 'airport'}, {'time': '', 'location': 'airport'}, {'time': '12:00', 'location': 'city', 'address': 'a' * 501}, {'time': '12:00', 'location': 'city', 'address': 'Hotel', 'delivery_fee': 0}):
            response = self.client.post('/api/partners/bookings/quote', json=self.payload(pickup=pickup))
            self.assertEqual(response.status_code, 422, response.text)
        response = self.client.post('/api/partners/bookings/quote', json=self.payload(pickup={'time': '12:00', 'location': 'city', 'address': 'Hotel'}, delivery_fee=0))
        self.assertEqual(response.status_code, 422)

    def test_city_booking_can_omit_address_without_changing_delivery_fee(self):
        for address in (None, '', '  '):
            pickup = {'time': '12:00', 'location': 'city'}
            if address is not None:
                pickup['address'] = address
            result = self.client.post('/api/partners/bookings/quote', json=self.payload(pickup=pickup))
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.json()['pickup']['address'], '')
            self.assertEqual(result.json()['delivery_fee'], '500.00')
        created = self.client.post('/api/partners/bookings', json=self.booking_payload(pickup={'time': '12:00', 'location': 'city'}))
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()['booking']['pricing']['pickup']['address'], '')
        self.assertEqual(created.json()['booking']['pricing']['delivery_fee'], '500.00')

    def test_contacts_are_joined_only_into_private_scoped_operator_calendar(self):
        update = self.update('ppark-a', update_id=101)
        update['message']['from']['username'] = 'client_name'
        self.service.handle_update(update)
        payload = self.booking_payload(init_data=self.token(username='client_name'))
        payload.pop('contact')
        created = self.client.post('/api/partners/bookings', json=payload).json()['booking']
        self.assertNotIn('customer', created)
        owner_request = {'tenant_id': 'park-a', 'init_data': self.token()}
        self.assertEqual(self.client.post('/api/partners/calendar', json=owner_request).status_code, 403)
        self.service.handle_update(self.update(self.invite(), update_id=102))
        private = self.client.post('/api/partners/calendar', json=owner_request).json()['bookings'][0]
        self.assertEqual(private['customer'], {'name': 'Test', 'username': 'client_name', 'phone': None, 'telegram_user_id': '42'})
        self.assertNotIn('metadata', private['customer'])
        self.assertNotIn('chat_id', private['customer'])
        self.assertEqual(self.client.post('/api/partners/calendar', json={**owner_request, 'tenant_id': 'park-b'}).status_code, 403)
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        self.assertEqual(self.client.get('/api/partners/parks/park-a/calendar', headers=headers).json()['bookings'][0]['customer'], private['customer'])
        self.assertEqual(self.client.get('/api/partners/parks/park-b/calendar', headers=headers).json()['bookings'], [])
        available = self.client.post('/api/partners/parks/park-a/availability', json={'start_date': '2026-10-11', 'end_date': '2026-10-14'})
        self.assertNotIn('client_name', available.text)
        self.assertNotIn('customer', available.text)

    def test_idempotent_retry_and_parallel_conflict(self):
        payload = self.booking_payload()
        first = self.client.post('/api/partners/bookings', json=payload)
        self.assertEqual(self.client.post('/api/partners/bookings', json=payload).json(), first.json())
        another = {**payload, 'request_id': 'another_test_12345'}
        self.assertEqual(self.client.post('/api/partners/bookings', json=another).status_code, 409)

    def test_client_and_manual_bookings_share_number_sequence(self):
        from platform_core.park_bookings import ParkManualRequest
        first = self.client.post('/api/partners/bookings', json=self.booking_payload()).json()['booking']
        second = self.booking_service.create_manual('park-a', ParkManualRequest(
            asset_id=self.asset.id, start_date='2026-10-14', end_date='2026-10-17',
            request_id='mixed_number_12345', entry_type='rental', customer_name='Иван'), admin=self.admin)
        self.assertEqual(first['booking_number'], '100001')
        self.assertEqual(second['booking_number'], '100002')

    def test_tariff_change_rejects_stale_quote_and_keeps_created_booking_snapshot(self):
        from platform_core.vehicle_details import VehicleDetailsInput
        from test_vehicle_details import grid
        old = self.booking_payload()
        assets = TenantAssetAdmin(self.root, self.admin, 'park-a')
        assets.save_details(self.asset.id, VehicleDetailsInput(section='pricing', pricing=grid()))
        self.assertEqual(self.client.post('/api/partners/bookings', json=old).status_code, 409)
        fresh = self.booking_payload()
        created = self.client.post('/api/partners/bookings', json=fresh)
        self.assertEqual(created.status_code, 201, created.text)
        self.assertEqual(created.json()['booking']['pricing']['total_rental'], '2400.00')
        changed = grid(); changed['low_season']['price_1_6'] = 1200
        assets.save_details(self.asset.id, VehicleDetailsInput(section='pricing', pricing=changed))
        self.assertEqual(self.booking_service.calendar('park-a', admin=self.admin)[0]['pricing']['total_rental'], '2400.00')
        self.assertEqual(self.client.post('/api/partners/bookings', json=fresh).json(), created.json())

    def test_missing_username_requires_valid_consented_contact_without_writes(self):
        update = self.update('ppark-a', update_id=105)
        update['message']['from']['username'] = 'stale_username'
        self.service.handle_update(update)
        self.assertTrue(self.client.post('/api/partners/bookings/quote', json=self.payload()).json()['requires_contact'])
        payload = self.booking_payload()
        before = (self.root / 'tenants/park-a/bookings.json').read_bytes()
        for contact in (None, {'channel': 'email', 'value': '+66123456789', 'consent': True},
                        {'channel': 'phone', 'value': '123', 'consent': True},
                        {'channel': 'max', 'value': 'https://example.com', 'consent': True},
                        {'channel': 'whatsapp', 'value': '+66123456789', 'consent': False},
                        {'channel': 'phone', 'value': '+66123456789'}):
            with self.subTest(contact=contact):
                self.assertEqual(self.client.post('/api/partners/bookings', json={**payload, 'contact': contact}).status_code, 422)
                self.assertEqual((self.root / 'tenants/park-a/bookings.json').read_bytes(), before)
        self.assertEqual(json.loads((self.root / 'tenants/park-a/customers.json').read_text())['items'], [])

    def test_each_contact_channel_is_private_normalized_and_idempotent(self):
        headers = {'Authorization': 'Bearer ' + self.auth.issue_for_verified_actor('1')}
        for index, channel in enumerate(('whatsapp', 'max', 'phone')):
            payload = self.booking_payload(start_date=f'2026-10-{11 + index:02d}', end_date=f'2026-10-{12 + index:02d}')
            payload.update(request_id=f'contact_request_{index:02d}', contact={'channel': channel, 'value': '+66 (123) 456-789', 'consent': True})
            response = self.client.post('/api/partners/bookings', json=payload)
            self.assertEqual(response.status_code, 201, response.text)
            self.assertNotIn('contact', response.text)
            self.assertNotIn('66123456789', response.text)
            self.assertEqual(self.client.post('/api/partners/bookings', json=payload).json(), response.json())
            self.assertEqual(self.client.post('/api/partners/bookings', json={**payload, 'contact': {**payload['contact'], 'value': '+66123456788'}}).status_code, 409)
        items = self.client.get('/api/partners/parks/park-a/calendar', headers=headers).json()['bookings']
        self.assertEqual([item['customer']['contact'] for item in items],
            [{'channel': channel, 'value': '+66123456789'} for channel in ('whatsapp', 'max', 'phone')])
        self.assertTrue(all(item['customer']['username'] is None for item in items))

    def test_verified_username_does_not_require_contact(self):
        signed = self.token(username='verified_client')
        quote = self.client.post('/api/partners/bookings/quote', json=self.payload(init_data=signed)).json()
        self.assertFalse(quote['requires_contact'])
        payload = self.booking_payload(init_data=signed)
        payload.pop('contact')
        self.assertEqual(self.client.post('/api/partners/bookings', json=payload).status_code, 201)

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
            'end_date': '2026-10-14', 'days': 3, 'available_asset_ids': [self.asset.id],
            'pickup_time': None, 'return_time': None,
            'prices': {self.asset.id: {'days': 3, 'daily_rate': '800.00', 'total_rental': '2400.00',
                                      'deposit': '5000.00', 'currency': 'THB'}}})

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
