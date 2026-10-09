"""First tenant booking slice: daily quotes, requested holds and private agenda."""

from datetime import date, datetime, time, timezone
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import hashlib
import json
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, constr
from .context import TenantContext
from .models import AssetStatus, Booking, BookingStatus, Customer, RentalAsset
from .partner_bot import PartnerBotError
from .repositories import JsonCollectionRepository


class BookingConflict(ValueError):
    pass


class ParkQuoteRequest(BaseModel):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)
    asset_id: constr(regex=r'^[a-f0-9]{32}$')
    start_date: date
    end_date: date

    class Config:
        extra = 'forbid'


class ParkBookingRequest(ParkQuoteRequest):
    request_id: constr(regex=r'^[A-Za-z0-9_-]{16,64}$')
    quote_token: constr(regex=r'^[a-f0-9]{64}$')


class ParkStatusRequest(BaseModel):
    status: constr(regex=r'^(confirmed|cancelled)$')
    expected_status: constr(regex=r'^(requested|confirmed)$')

    class Config:
        extra = 'forbid'


class ParkOwnerStatusRequest(ParkStatusRequest):
    tenant_id: constr(min_length=1, max_length=63)
    init_data: constr(min_length=1, max_length=8192)
    booking_id: constr(regex=r'^[a-f0-9]{64}$')


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
        records = [repo.model_type.parse_obj(item) for item in repo._read_document()['items']]
        for record in records:
            repo.context.require_record_tenant(record.tenant_id)
        return records

    def prepare(self, request, context):
        tenant = self.partners.tenant(self.partners.provisioner._load_state(), context.tenant_id, public=True)
        try:
            zone = ZoneInfo(tenant.timezone)
        except ZoneInfoNotFoundError:
            raise ValueError('Park timezone is not configured') from None
        today = datetime.fromtimestamp(self.partners.clock(), zone).date()
        days = (request.end_date - request.start_date).days
        if request.start_date < today or not 1 <= days <= 365:
            raise ValueError('Choose future dates, from 1 to 365 days')
        asset = self.repo(context, 'assets.json', RentalAsset).get(request.asset_id)
        if asset is None or not asset.public or asset.status != AssetStatus.AVAILABLE:
            raise BookingConflict('Vehicle is unavailable')
        rate = self.money(asset.pricing.get('daily_rate'))
        if rate <= 0:
            raise ValueError('Price is not configured')
        deposit = self.money(asset.deposit_policy.get('amount', 0))
        start = datetime.combine(request.start_date, time.min, zone).astimezone(timezone.utc)
        end = datetime.combine(request.end_date, time.min, zone).astimezone(timezone.utc)
        quote = {'asset_id': asset.id, 'asset_name': asset.name, 'start_date': request.start_date.isoformat(),
                 'end_date': request.end_date.isoformat(), 'days': days, 'daily_rate': str(rate),
                 'total_rental': str(rate * days), 'deposit': str(deposit), 'currency': tenant.currency,
                 'timezone': tenant.timezone}
        # This is a change detector, not authentication. Identity is verified separately.
        quote['quote_token'] = hashlib.sha256(json.dumps(quote, sort_keys=True).encode()).hexdigest()
        return quote, start, end

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
            return quote

    @staticmethod
    def dto(booking):
        return {'id': booking.id, 'asset_id': booking.asset_id, 'status': booking.status,
                'start_at': booking.start_at, 'end_at': booking.end_at,
                'pricing': {k: booking.pricing.get(k) for k in ('asset_name', 'start_date', 'end_date', 'days', 'daily_rate', 'total_rental', 'timezone')},
                'deposit': {'amount': booking.deposit.get('amount')}, 'currency': booking.currency}

    def create(self, request):
        with self.partners.provisioner._locked():
            identity, context = self.partners.resolve_identity(request.tenant_id, request.init_data)
            repo = self.repo(context, 'bookings.json', Booking)
            key = hashlib.sha256(f'{context.actor_id}:{request.request_id}'.encode()).hexdigest()
            fingerprint = f'{request.asset_id}:{request.start_date}:{request.end_date}:{request.quote_token}'
            with repo.storage.exclusive(repo.path):
                records = self.records(repo)
                previous = next((b for b in records if b.id == key), None)
                if previous:
                    if previous.legacy.get('request_fingerprint') != fingerprint:
                        raise BookingConflict('Request ID already used for another booking')
                    return self.dto(previous)
                quote, start, end = self.prepare(request, context)
                if quote['quote_token'] != request.quote_token:
                    raise BookingConflict('Price changed. Request a new quote')
                self.check_overlap(records, request.asset_id, start, end)
                customers = self.repo(context, 'customers.json', Customer)
                customer_id = hashlib.sha256(context.actor_id.encode()).hexdigest()
                customer = customers.get(customer_id) or Customer(id=customer_id, tenant_id=context.tenant_id, external_id=context.actor_id)
                customer.name = identity.first_name
                customer.username = identity.username
                customer.source = 'telegram_partner'
                customer.metadata = {**customer.metadata, 'bot_id': identity.bot_id, 'chat_id': identity.chat_id}
                customers.upsert(customer)
                booking = Booking(id=key, tenant_id=context.tenant_id, asset_id=request.asset_id, customer_id=customer_id,
                    start_at=start, end_at=end, currency=quote['currency'], source='telegram_partner',
                    pricing={k: quote[k] for k in ('asset_name', 'start_date', 'end_date', 'days', 'daily_rate', 'total_rental', 'timezone')},
                    deposit={'amount': quote['deposit']}, legacy={'request_fingerprint': fingerprint})
                document = repo._read_document()
                document['items'].append(json.loads(booking.json()))
                repo._write_document(document)
                return self.dto(booking)

    def calendar(self, tenant_id, init_data=None, admin=None):
        with self.partners.provisioner._locked():
            if admin is not None:
                admin.require_platform_admin()
                self.partners.tenant(self.partners.provisioner._load_state(), tenant_id)
                context = TenantContext(tenant_id=tenant_id, actor_id=admin.actor_id, roles=frozenset({'platform_admin'}))
            else:
                _, context = self.partners.resolve_identity(tenant_id, init_data, require_owner=True)
            return [self.dto(b) for b in self.repo(context, 'bookings.json', Booking).list()]

    def change_status(self, tenant_id, booking_id, request, init_data=None, admin=None):
        with self.partners.provisioner._locked():
            if admin is not None:
                admin.require_platform_admin()
                self.partners.tenant(self.partners.provisioner._load_state(), tenant_id)
                context = TenantContext(tenant_id=tenant_id, actor_id=admin.actor_id, roles=frozenset({'platform_admin'}))
            else:
                _, context = self.partners.resolve_identity(tenant_id, init_data, require_owner=True)
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
                booking.updated_at = datetime.fromtimestamp(self.partners.clock(), timezone.utc)
                document = repo._read_document()
                document['items'] = [json.loads(b.json()) for b in records]
                repo._write_document(document)
                return self.dto(booking)
