"""First tenant booking slice: daily quotes, requested holds and private agenda."""

from datetime import date, datetime, time, timezone, timedelta
from typing import Literal, Optional
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import json
import re
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, constr, root_validator, validator
from .pydantic_compat import pattern_string
from .context import TenantContext
from .models import AssetStatus, Booking, BookingStatus, Customer, RentalAsset
from .partner_bot import PartnerBotError
from .repositories import JsonCollectionRepository
from .vehicle_details import calculate_rental


class BookingConflict(ValueError):
    pass


class ParkPickupInput(BaseModel):
    time: pattern_string(r'^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')
    location: Literal['airport', 'city', 'self_pickup']
    address: constr(strip_whitespace=True, max_length=500) = ''
    return_time: Optional[pattern_string(r'^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')] = None
    return_location: Optional[Literal['airport', 'city', 'self_pickup']] = None
    return_address: constr(strip_whitespace=True, max_length=500) = ''

    @root_validator(skip_on_failure=True)
    def city_address(cls, values):
        if values.get('location') != 'city':
            values['address'] = ''
        if values.get('return_location') != 'city':
            values['return_address'] = ''
        return values

    class Config:
        extra = 'forbid'

    def payload(self):
        data = self.dict(exclude_none=True)
        if self.return_location is None and self.return_time is None:
            data.pop('return_address', None)
        return data


class ParkWebQuoteRequest(BaseModel):
    tenant_id: constr(min_length=1, max_length=63)
    asset_id: pattern_string(r'^[a-f0-9]{32}$')
    start_date: date
    end_date: date
    pickup: Optional[ParkPickupInput] = None

    class Config:
        extra = 'forbid'


class ParkQuoteRequest(ParkWebQuoteRequest):
    init_data: constr(min_length=1, max_length=8192)


class ParkContact(BaseModel):
    channel: Literal['whatsapp', 'max', 'phone']
    value: constr(strip_whitespace=True, min_length=1, max_length=32)
    consent: Literal[True]

    @validator('value')
    def international_number(cls, value):
        number = re.sub(r'[ ()-]', '', value)
        if not re.fullmatch(r'\+[1-9][0-9]{6,14}', number):
            raise ValueError('Enter a phone number with country code')
        return number

    class Config:
        extra = 'forbid'


class ParkBookingRequest(ParkQuoteRequest):
    request_id: pattern_string(r'^[A-Za-z0-9_-]{16,64}$')
    quote_token: pattern_string(r'^[a-f0-9]{64}$')
    contact: Optional[ParkContact] = None


class ParkWebBookingRequest(ParkWebQuoteRequest):
    request_id: pattern_string(r'^[A-Za-z0-9_-]{16,64}$')
    quote_token: pattern_string(r'^[a-f0-9]{64}$')
    contact: ParkContact
    customer_name: constr(strip_whitespace=True, min_length=1, max_length=160)
    pickup: ParkPickupInput


class ParkStatusRequest(BaseModel):
    status: pattern_string(r'^(confirmed|cancelled)$')
    expected_status: pattern_string(r'^(requested|confirmed)$')

    class Config:
        extra = 'forbid'


class ParkOwnerStatusRequest(ParkStatusRequest):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)
    booking_id: pattern_string(r'^[a-f0-9]{64}$')


class ParkAvailabilityRequest(BaseModel):
    start_date: date
    end_date: date
    pickup_time: Optional[pattern_string(r'^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')] = None
    return_time: Optional[pattern_string(r'^(?:[01][0-9]|2[0-3]):[0-5][0-9]$')] = None

    class Config:
        extra = 'forbid'


class ParkManualRequest(BaseModel):
    asset_id: pattern_string(r'^[a-f0-9]{32}$')
    start_date: date
    end_date: date
    request_id: pattern_string(r'^[A-Za-z0-9_-]{16,64}$')
    entry_type: Literal['rental', 'block'] = 'rental'
    booking_status: Literal['confirmed', 'requested'] = 'confirmed'
    customer_name: constr(strip_whitespace=True, max_length=160) = ''
    note: constr(strip_whitespace=True, max_length=1000) = ''
    daily_rate: Optional[constr(strip_whitespace=True, min_length=1, max_length=24)] = None
    deposit: Optional[constr(strip_whitespace=True, min_length=1, max_length=24)] = None
    pickup: Optional[ParkPickupInput] = None
    contact_channel: Literal['whatsapp', 'max', 'phone'] = 'phone'
    contact_value: constr(strip_whitespace=True, max_length=32) = ''

    @validator('contact_value')
    def valid_contact(cls, value):
        return ParkContact.international_number(value) if value else ''

    class Config:
        extra = 'forbid'


class ParkOwnerManualRequest(ParkManualRequest):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)


class ParkBookingEditRequest(BaseModel):
    customer_name: constr(strip_whitespace=True, min_length=1, max_length=160)
    contact_channel: Literal['whatsapp', 'max', 'phone'] = 'phone'
    contact_value: constr(strip_whitespace=True, max_length=32) = ''
    note: constr(strip_whitespace=True, max_length=1000) = ''
    expected_updated_at: datetime

    @validator('contact_value')
    def valid_contact(cls, value):
        return ParkContact.international_number(value) if value else ''

    class Config:
        extra = 'forbid'


class ParkOwnerBookingEditRequest(ParkBookingEditRequest):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)
    booking_id: pattern_string(r'^[a-f0-9]{64}$')


class ParkBookingService:
    BLOCKING = {BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS}

    def __init__(self, partners):
        self.partners = partners
        self.root = partners.provisioner.root

    def repo(self, context, filename, model):
        repository = JsonCollectionRepository(self.root, context, filename, model)
        if repository.path.is_symlink():
            raise PartnerBotError('Invalid tenant collection')
        return repository

    @staticmethod
    def money(value):
        try:
            amount = Decimal(str(value))
            if not amount.is_finite() or amount < 0 or amount > 100000000:
                raise ValueError()
            return amount.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        except (InvalidOperation, ValueError):
            raise ValueError('Price is not configured') from None

    @staticmethod
    def records(repo):
        # Caller holds the collection lock. Reserve numbers for legacy/archived
        # entries too, so status changes and retries never recycle a number.
        document = repo._read_document()
        records = [repo.model_type.parse_obj(item) for item in document['items']]
        for record in records:
            repo.context.require_record_tenant(record.tenant_id)
        numbers = [record.booking_number for record in records if record.booking_number]
        if len(numbers) != len(set(numbers)):
            raise BookingConflict('Duplicate booking numbers. Calendar needs repair')
        next_number = max([100000] + [int(number) for number in numbers]) + 1
        changed = False
        for record, item in zip(records, document['items']):
            if record.booking_number is None:
                if next_number > 999999:
                    raise BookingConflict('Six-digit booking numbers are exhausted')
                record.booking_number = str(next_number)
                item['booking_number'] = record.booking_number
                next_number += 1
                changed = True
        if changed:
            repo._write_document(document)
        return records

    @staticmethod
    def next_booking_number(records):
        value = max([100000] + [int(item.booking_number) for item in records if item.booking_number]) + 1
        if value > 999999:
            raise BookingConflict('Six-digit booking numbers are exhausted')
        return str(value)

    def period_bounds(self, tenant, request, manual=False):
        try:
            zone = ZoneInfo(tenant.timezone)
        except ZoneInfoNotFoundError:
            raise ValueError('Park timezone is not configured') from None
        today = datetime.fromtimestamp(self.partners.clock(), zone).date()
        days = (request.end_date - request.start_date).days
        earliest = today - timedelta(days=365) if manual else today
        if request.start_date < earliest or not 1 <= days <= 365:
            raise ValueError('Choose 1 to 365 days, starting no earlier than a year ago' if manual else 'Choose future dates, from 1 to 365 days')
        pickup = getattr(request, 'pickup', None)
        pickup_time = pickup.time if pickup else getattr(request, 'pickup_time', None)
        clock = time.fromisoformat(pickup_time) if pickup_time else time.min
        return_time = pickup.return_time if pickup else getattr(request, 'return_time', None)
        return_clock = time.fromisoformat(return_time) if return_time else clock
        if return_clock > clock:
            days += 1
        if days > 365:
            raise ValueError('Rental cannot exceed 365 paid days')
        start = datetime.combine(request.start_date, clock, zone).astimezone(timezone.utc)
        end = datetime.combine(request.end_date, return_clock, zone).astimezone(timezone.utc)
        return days, start, end

    def prepare(self, request, context):
        tenant = self.partners.tenant(self.partners.provisioner._load_state(), context.tenant_id, public=True)
        days, start, end = self.period_bounds(tenant, request)
        asset = self.repo(context, 'assets.json', RentalAsset).get(request.asset_id)
        if asset is None or not asset.public or asset.status != AssetStatus.AVAILABLE:
            raise BookingConflict('Vehicle is unavailable')
        rental = calculate_rental(asset.pricing, request.start_date, days)
        deposit = self.money(asset.deposit_policy.get('amount', 0))
        quote = {'asset_id': asset.id, 'asset_name': asset.name, 'start_date': request.start_date.isoformat(),
                 'end_date': request.end_date.isoformat(), 'days': days, **rental,
                 'deposit': str(deposit), 'currency': tenant.currency,
                 'timezone': tenant.timezone}
        if request.pickup is not None:
            if (request.pickup.location == 'city' or request.pickup.return_location == 'city') and tenant.currency != 'THB':
                raise ValueError('Городская доставка 500 THB доступна только для парков с валютой THB')
            delivery = Decimal('500.00') if request.pickup.location == 'city' else Decimal('0.00')
            return_fee = Decimal('500.00') if request.pickup.return_location == 'city' else Decimal('0.00')
            pickup_data = request.pickup.payload()
            # Preserve quote tokens/fingerprints for old clients without return settings.
            if request.pickup.return_location is None and request.pickup.return_time is None:
                pickup_data.pop('return_address', None)
            quote.update(pickup=pickup_data, delivery_fee=str(delivery),
                         total_payable=str(Decimal(rental['total_rental']) + delivery + return_fee))
            if request.pickup.return_location is not None or request.pickup.return_time is not None:
                quote.update(return_fee=str(return_fee), extra_day=request.pickup.return_time is not None and request.pickup.return_time > request.pickup.time)
        # This is a change detector, not authentication. Identity is verified separately.
        quote['quote_token'] = hashlib.sha256(json.dumps(quote, sort_keys=True).encode()).hexdigest()
        return quote, start, end

    def availability(self, tenant_id, request):
        # Public read projection: never expose bookings, contacts or preview assets.
        with self.partners.provisioner._locked():
            tenant = self.partners.tenant(self.partners.provisioner._load_state(), tenant_id, public=True)
            context = TenantContext(tenant_id=tenant.tenant_id)
            days, start, end = self.period_bounds(tenant, request)
            records = self.repo(context, 'bookings.json', Booking).list()
            available = []
            prices = {}
            for asset in self.repo(context, 'assets.json', RentalAsset).list():
                if not asset.public or asset.status != AssetStatus.AVAILABLE:
                    continue
                try:
                    rental = calculate_rental(asset.pricing, request.start_date, days)
                    self.check_overlap(records, asset.id, start, end)
                except (ValueError, BookingConflict):
                    continue
                available.append(asset.id)
                prices[asset.id] = {**rental, 'days': days, 'currency': tenant.currency,
                                    'deposit': str(self.money(asset.deposit_policy.get('amount', 0)))}
            return {'tenant_id': tenant.tenant_id, 'start_date': request.start_date.isoformat(),
                    'end_date': request.end_date.isoformat(), 'days': days,
                    'available_asset_ids': available, 'prices': prices,
                    'pickup_time': request.pickup_time, 'return_time': request.return_time}

    def check_overlap(self, records, asset_id, start, end):
        for booking in records:
            if booking.archived_at is None and booking.asset_id == asset_id and booking.status in self.BLOCKING:
                if booking.start_at.tzinfo is None or booking.end_at.tzinfo is None:
                    raise BookingConflict('Existing calendar needs timezone migration')
                if start < booking.end_at and booking.start_at < end:
                    raise BookingConflict('These dates are occupied. Choose another period')

    def quote(self, request):
        with self.partners.provisioner._locked():
            _, context = self.partners.resolve_identity(request.tenant_id, request.init_data)
            quote, start, end = self.prepare(request, context)
            self.check_overlap(self.repo(context, 'bookings.json', Booking).list(), request.asset_id, start, end)
            quote['requires_contact'] = not bool(self.partners.verifier.verify(request.init_data).get('username'))
            return quote

    @staticmethod
    def dto(booking, private=False):
        return {'id': booking.id, 'booking_number': booking.booking_number, 'asset_id': booking.asset_id, 'status': booking.status,
                'start_at': booking.start_at, 'end_at': booking.end_at,
                'pricing': {k: booking.pricing.get(k) for k in ('asset_name', 'start_date', 'end_date', 'days', 'daily_rate', 'total_rental', 'timezone', 'tariff_breakdown', 'pickup', 'delivery_fee', 'return_fee', 'extra_day', 'total_payable') if k in booking.pricing},
                'deposit': {'amount': booking.deposit.get('amount')}, 'currency': booking.currency,
                'entry_type': booking.entry_type, 'source': booking.source,
                'updated_at': booking.updated_at,
                'operator_details': {k: booking.operator_details.get(k, '') for k in ('customer_name', 'note')} if private else {}}

    def operator_context(self, tenant_id, init_data=None, admin=None, owner_context=None):
        if owner_context is not None:
            context = owner_context()
            context.require_role('owner')
            context.require_record_tenant(tenant_id)
            return context
        if admin is not None:
            admin.require_platform_admin()
            self.partners.tenant(self.partners.provisioner._load_state(), tenant_id)
            return TenantContext(tenant_id=tenant_id, actor_id=admin.actor_id, roles=frozenset({'platform_admin'}))
        _, context = self.partners.resolve_identity(tenant_id, init_data, require_owner=True)
        return context

    def create_manual(self, tenant_id, request, init_data=None, admin=None, owner_context=None):
        # Same lock and booking collection as Telegram requests: no race or second calendar.
        with self.partners.provisioner._locked():
            context = self.operator_context(tenant_id, init_data, admin, owner_context)
            tenant = self.partners.tenant(self.partners.provisioner._load_state(), context.tenant_id)
            repo = self.repo(context, 'bookings.json', Booking)
            key = hashlib.sha256(f'calendar:{context.actor_id}:{request.request_id}'.encode()).hexdigest()
            payload = json.loads(request.json(exclude={'request_id', 'init_data', 'tenant_id'}))
            if request.pickup is None:
                payload.pop('pickup', None)
            if not request.contact_value:
                payload.pop('contact_value', None)
                payload.pop('contact_channel', None)
            # Preserve fingerprints of confirmed entries created before this field existed.
            if request.booking_status == 'confirmed':
                payload.pop('booking_status', None)
            fingerprint = hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                previous = next((item for item in records if item.id == key), None)
                if previous:
                    if previous.legacy.get('request_fingerprint') != fingerprint:
                        raise BookingConflict('Request ID already used for another calendar entry')
                    return self.dto(previous, private=True)
                days, start, end = self.period_bounds(tenant, request, manual=True)
                asset = self.repo(context, 'assets.json', RentalAsset).get(request.asset_id)
                if asset is None or asset.archived_at is not None or asset.status == AssetStatus.ARCHIVED:
                    raise BookingConflict('Vehicle is unavailable')
                self.check_overlap(records, asset.id, start, end)
                if request.entry_type == 'block':
                    if request.booking_status != 'confirmed' or not request.note or request.customer_name or request.daily_rate is not None or request.deposit is not None or request.pickup is not None or request.contact_value:
                        raise ValueError('A block needs a reason and must not contain rental prices or a customer')
                    rate = deposit = Decimal('0.00')
                    rental = {'daily_rate': str(rate), 'total_rental': str(rate * days)}
                else:
                    if not request.customer_name:
                        raise ValueError('Customer name is required for a manual rental')
                    if request.daily_rate is None:
                        rental = calculate_rental(asset.pricing, request.start_date, days)
                    else:
                        rate = self.money(request.daily_rate)
                        if rate <= 0:
                            raise ValueError('Rental rate must be positive')
                        rental = {'daily_rate': str(rate), 'total_rental': str(rate * days)}
                    deposit = self.money(request.deposit if request.deposit is not None else asset.deposit_policy.get('amount', 0))
                    if request.pickup is not None:
                        if (request.pickup.location == 'city' or request.pickup.return_location == 'city') and tenant.currency != 'THB':
                            raise ValueError('Городская доставка 500 THB доступна только для парков с валютой THB')
                        delivery = Decimal('500.00') if request.pickup.location == 'city' else Decimal('0.00')
                        return_fee = Decimal('500.00') if request.pickup.return_location == 'city' else Decimal('0.00')
                        rental.update(pickup=request.pickup.payload(), delivery_fee=str(delivery), return_fee=str(return_fee),
                            extra_day=bool(request.pickup.return_time and request.pickup.return_time > request.pickup.time),
                            total_payable=str(Decimal(rental['total_rental']) + delivery + return_fee))
                operator_details = {'customer_name': request.customer_name, 'note': request.note, 'created_by': context.actor_id}
                if request.contact_value:
                    operator_details.update(contact_channel=request.contact_channel, contact_value=request.contact_value, contact_override='1')
                timestamp = datetime.fromtimestamp(self.partners.clock(), timezone.utc)
                booking = Booking(id=key, booking_number=self.next_booking_number(records), tenant_id=context.tenant_id, asset_id=asset.id,
                    customer_id=None, status=BookingStatus(request.booking_status), start_at=start, end_at=end,
                    currency=tenant.currency, entry_type=request.entry_type,
                    source='platform_manual' if admin is not None else 'owner_manual',
                    operator_details=operator_details,
                    pricing={'asset_name': asset.name, 'start_date': request.start_date.isoformat(), 'end_date': request.end_date.isoformat(),
                             'days': days, **rental, 'timezone': tenant.timezone},
                    deposit={'amount': str(deposit)}, legacy={'request_fingerprint': fingerprint},
                    created_at=timestamp, updated_at=timestamp)
                document = repo._read_document()
                document['items'].append(json.loads(booking.json()))
                repo._write_document(document)
                return self.dto(booking, private=True)

    def create(self, request):
        with self.partners.provisioner._locked():
            identity, context = self.partners.resolve_identity(request.tenant_id, request.init_data)
            repo = self.repo(context, 'bookings.json', Booking)
            key = hashlib.sha256(f'{context.actor_id}:{request.request_id}'.encode()).hexdigest()
            fingerprint = f'{request.asset_id}:{request.start_date}:{request.end_date}:{request.quote_token}'
            if request.pickup is not None:
                fingerprint += ':' + json.dumps(request.pickup.payload(), sort_keys=True)
            if request.contact is not None:
                fingerprint += ':' + json.dumps(request.contact.dict(), sort_keys=True)
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                previous = next((b for b in records if b.id == key), None)
                if previous:
                    if previous.legacy.get('request_fingerprint') != fingerprint:
                        raise BookingConflict('Request ID already used for another booking')
                    return self.dto(previous)
                user = self.partners.verifier.verify(request.init_data)
                if not user.get('username') and request.contact is None:
                    raise ValueError('Contact is required without Telegram username')
                quote, start, end = self.prepare(request, context)
                if quote['quote_token'] != request.quote_token:
                    raise BookingConflict('Price changed. Request a new quote')
                self.check_overlap(records, request.asset_id, start, end)
                customers = self.repo(context, 'customers.json', Customer)
                customer_id = hashlib.sha256(context.actor_id.encode()).hexdigest()
                customer = customers.get(customer_id) or Customer(id=customer_id, tenant_id=context.tenant_id, external_id=context.actor_id)
                customer.name = identity.first_name
                customer.username = user.get('username') or None
                customer.source = 'telegram_partner'
                customer.metadata = {**customer.metadata, 'bot_id': identity.bot_id, 'chat_id': identity.chat_id}
                customers.upsert(customer)
                booking = Booking(id=key, booking_number=self.next_booking_number(records), tenant_id=context.tenant_id, asset_id=request.asset_id, customer_id=customer_id,
                    start_at=start, end_at=end, currency=quote['currency'], source='telegram_partner',
                    pricing={k: quote[k] for k in ('asset_name', 'start_date', 'end_date', 'days', 'daily_rate', 'total_rental', 'timezone', 'tariff_breakdown', 'pickup', 'delivery_fee', 'return_fee', 'extra_day', 'total_payable') if k in quote},
                    deposit={'amount': quote['deposit']}, legacy={'request_fingerprint': fingerprint})
                if request.contact is not None:
                    booking.operator_details.update(contact_channel=request.contact.channel, contact_value=request.contact.value,
                        contact_consent_at=datetime.fromtimestamp(self.partners.clock(), timezone.utc).isoformat())
                document = repo._read_document()
                document['items'].append(json.loads(booking.json()))
                repo._write_document(document)
                return self.dto(booking)

    def calendar(self, tenant_id, init_data=None, admin=None, owner_context=None):
        with self.partners.provisioner._locked():
            context = self.operator_context(tenant_id, init_data, admin, owner_context)
            customers = {customer.id: customer for customer in self.repo(context, 'customers.json', Customer).list()}
            result = []
            repo = self.repo(context, 'bookings.json', Booking)
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
            for booking in records:
                if booking.archived_at is not None:
                    continue
                item = self.dto(booking, private=True)
                customer = customers.get(booking.customer_id)
                if customer is not None:
                    # Contact data belongs only to this private operator projection.
                    # Never expose metadata/chat_id or join another tenant's records.
                    prefix = f'telegram:{self.partners.config.bot_id}:'
                    external = customer.external_id or ''
                    telegram_id = external[len(prefix):] if external.startswith(prefix) else ''
                    item['customer'] = {'name': customer.name, 'username': customer.username,
                        'phone': customer.phone, 'telegram_user_id': telegram_id if telegram_id.isdigit() else None}
                    if booking.operator_details.get('contact_value'):
                        item['customer']['contact'] = {'channel': booking.operator_details.get('contact_channel'),
                            'value': booking.operator_details['contact_value']}
                if booking.operator_details.get('contact_override'):
                    item.setdefault('customer', {'name': None, 'username': None, 'phone': None, 'telegram_user_id': None})
                    item['customer']['phone'] = None
                    item['customer'].pop('contact', None)
                    if booking.operator_details.get('contact_value'):
                        item['customer']['contact'] = {'channel': booking.operator_details['contact_channel'], 'value': booking.operator_details['contact_value']}
                result.append(item)
            return result

    def edit_booking(self, tenant_id, booking_id, request, init_data=None, admin=None, owner_context=None):
        with self.partners.provisioner._locked():
            context = self.operator_context(tenant_id, init_data, admin, owner_context)
            repo = self.repo(context, 'bookings.json', Booking)
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                booking = next((item for item in records if item.id == booking_id and item.archived_at is None), None)
                if booking is None:
                    raise PartnerBotError('Booking unavailable')
                if booking.entry_type == 'block':
                    raise ValueError('Blocks do not have customer details')
                if booking.updated_at != request.expected_updated_at:
                    raise BookingConflict('Заявка уже изменена. Обновите список перед сохранением.')
                booking.operator_details.update(customer_name=request.customer_name, note=request.note,
                    contact_channel=request.contact_channel, contact_value=request.contact_value, contact_override='1')
                booking.updated_at = max(datetime.fromtimestamp(self.partners.clock(), timezone.utc), booking.updated_at + timedelta(microseconds=1))
                document = repo._read_document()
                document['items'] = [json.loads(item.json()) for item in records]
                repo._write_document(document)
                return self.dto(booking, private=True)

    def change_status(self, tenant_id, booking_id, request, init_data=None, admin=None, owner_context=None):
        with self.partners.provisioner._locked():
            context = self.operator_context(tenant_id, init_data, admin, owner_context)
            repo = self.repo(context, 'bookings.json', Booking)
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                booking = next((b for b in records if b.id == booking_id and b.archived_at is None), None)
                if booking is None:
                    raise PartnerBotError('Booking unavailable')
                if booking.status != request.expected_status:
                    raise BookingConflict('Booking status changed. Refresh calendar')
                if request.status == 'confirmed' and booking.status != BookingStatus.REQUESTED:
                    raise BookingConflict('Only a request can be confirmed')
                booking.status = request.status
                booking.updated_at = max(datetime.fromtimestamp(self.partners.clock(), timezone.utc), booking.updated_at + timedelta(microseconds=1))
                document = repo._read_document()
                document['items'] = [json.loads(b.json()) for b in records]
                repo._write_document(document)
                return self.dto(booking, private=True)

    def web_quote(self, request):
        with self.partners.provisioner._locked():
            context = TenantContext(tenant_id=request.tenant_id)
            quote, start, end = self.prepare(request, context)
            self.check_overlap(self.repo(context, 'bookings.json', Booking).list(), request.asset_id, start, end)
            quote.update(requires_contact=True, customer_name_required=True)
            return quote

    def create_web(self, request):
        with self.partners.provisioner._locked():
            tenant = self.partners.tenant(self.partners.provisioner._load_state(), request.tenant_id, public=True)
            context = TenantContext.for_actor(tenant.tenant_id, f'web-customer:{request.request_id}', {'customer'})
            key = hashlib.sha256(f'web:{request.request_id}'.encode()).hexdigest()
            fingerprint = hashlib.sha256(json.dumps(json.loads(request.json(exclude={'request_id'})), sort_keys=True, separators=(',', ':')).encode()).hexdigest()
            repo = self.repo(context, 'bookings.json', Booking)
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                previous = next((item for item in records if item.id == key), None)
                if previous:
                    if previous.legacy.get('request_fingerprint') != fingerprint:
                        raise BookingConflict('Request ID already used for another booking')
                    return self.dto(previous)  # Never expose later operator edits/notes on a public retry.
                quote, start, end = self.prepare(request, context)
                if request.quote_token != quote['quote_token']:
                    raise BookingConflict('Price changed. Request a new quote')
                self.check_overlap(records, request.asset_id, start, end)
                customer = Customer(id=key, tenant_id=context.tenant_id, name=request.customer_name, source='web_storefront')
                self.repo(context, 'customers.json', Customer).upsert(customer)
                booking = Booking(id=key, booking_number=self.next_booking_number(records), tenant_id=context.tenant_id,
                    asset_id=request.asset_id, customer_id=customer.id, start_at=start, end_at=end,
                    currency=quote['currency'], source='web_storefront',
                    pricing={k: v for k, v in quote.items() if k not in ('asset_id', 'deposit', 'currency', 'quote_token')},
                    deposit={'amount': quote['deposit']}, legacy={'request_fingerprint': fingerprint},
                    operator_details={'customer_name': request.customer_name, 'contact_channel': request.contact.channel,
                        'contact_value': request.contact.value, 'contact_consent_at': datetime.fromtimestamp(self.partners.clock(), timezone.utc).isoformat()})
                document = repo._read_document()
                document['items'].append(json.loads(booking.json()))
                repo._write_document(document)
                return self.dto(booking)
