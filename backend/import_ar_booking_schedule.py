"""Scoped import of the owner's 12.10.2026 booking-on-hand list.

No invented customers/contacts; unknown rental starts become zero-price blocks.
Default is read-only planning. --apply writes only AR bookings and audit.
"""
import argparse
from datetime import date, datetime, time, timezone
from decimal import Decimal
import hashlib
import json
from pathlib import Path
import tempfile
from zoneinfo import ZoneInfo

from platform_core.context import TenantContext
from platform_core.models import Booking, BookingStatus, RentalAsset, utc_now
from platform_core.provisioning import PlatformContext, TenantProvisioner
from platform_core.repositories import JsonCollectionRepository, JsonlEventRepository
from platform_core.vehicle_details import calculate_rental

SOURCE = 'AR-booking-on-hand-2026-10-12'
TENANT = 'ar-rentals'
NOTE_TRANSLATIONS = {
    'Агент:': 'Agent:',
    'Источник: сводка парка от 12.10.2026.': 'Source: Fleet summary dated 12 October 2026.',
    'Даты начала неизвестны. Блок поставлен с ': 'The rental start date is unknown. The block was created from ',
    '; фактическая дата начала аренды не указана.': '; the actual rental start date was not provided.',
    'Имя клиента и контакты заполнит владелец.': 'The owner will fill in the customer name and contact details.',
    'Стоимость рассчитана по текущему тарифу; требуется подтверждение владельцем.': 'The price is estimated using the current rate and requires owner confirmation.',
    'Время 09:00 задано по умолчанию; место передачи не указано.': 'The default pickup and return time is 09:00; the handover location was not provided.',
    'Замена с City RS.': 'Vehicle change from City RS.',
    'Замена с Mazda2.': 'Vehicle change from Mazda2.',
}


def english_note(note):
    """Translate only our import text, preserving agent names and owner additions."""
    for original, translated in NOTE_TRANSLATIONS.items():
        note = note.replace(original, translated)
    return note


VEHICLES = {
    'Fortuner grey': 'toyota_fortuner_2023_gray',
    'Veloz': 'Ar_veloz_gray_2024', 'Xpander': 'Ar_xpander_hev_white_2024',
    'CX30': 'mazda_cx30_2023_bege', 'Cross 2327 white': 'toyota_corolla_2024_white',
    'HRV RS': 'ar_hrvrs_black_2024', 'HRV black': 'honda_hrv_2025_blackv',
    'X-Force': 'mitsubishi_xforce_2025_white', 'CX3': 'mazda_cx3_2023_bege',
    'Altis': 'toyota_altis_2023_gray', 'Civic RS': 'honda_civic_2024_black',
    'City RS': 'Ar_city_rs_black_2025', 'Mazda2 ceramic grey': 'mazda_mazda2_2023_gray',
    'Ativ grey': 'toyota_ativ_2024_gray',
}
# Missing/ambiguous cars are intentionally not mapped to a different vehicle.
MISSING = {
    'Cross 1403 grey': 'В кабинете нет серого Cross; синий не подставляем без подтверждения.',
    'Civic white 2020': 'В кабинете нет Civic white 2020; есть белые 2023 и 2024.',
    'Mazda2 white 8393': 'Белых Mazda2 две; на фото номера 8392 и 7043, не 8393.',
    'Mazda2 grey 9256': 'Серая Mazda2 на фото имеет номер 8664; её используем только для указанной ceramic.',
    'Mazda2 red': 'Красной Mazda2 в кабинете нет.',
}
CURRENT = [
    ('Fortuner grey', '2026-10-20', 'Mar'), ('Veloz', '2026-12-07', 'Day'),
    ('Xpander', '2026-10-13', 'F'), ('CX30', '2026-10-21', 'Jay'),
    ('Cross 1403 grey', '2026-11-01', 'Day'), ('Cross 2327 white', '2026-10-13', 'Day'),
    ('HRV RS', '2026-11-30', 'Day'), ('HRV black', '2026-11-02', 'Jay'),
    ('X-Force', '2026-10-28', 'Day'), ('CX3', '2026-10-14', 'Day'),
    ('Altis', '2026-10-19', 'Eva'), ('Civic RS', '2026-10-15', 'Day'),
    ('Civic white 2020', '2026-10-11', 'Eva'), ('City RS', '2026-11-30', 'Day'),
    ('Mazda2 white 8393', '2026-10-22', 'Eva'), ('Mazda2 grey 9256', '2026-11-30', 'Day'),
    ('Mazda2 ceramic grey', '2026-11-26', 'Mei'), ('Mazda2 red', '2026-10-14', ''),
    ('Ativ grey', '2026-10-15', 'Eva'),
]
FUTURE = [
    ('Fortuner grey', '2026-10-20', '2026-11-03', 'Eva', ''),
    ('Fortuner grey', '2026-12-25', '2027-01-25', 'F', ''),
    ('Veloz', '2026-12-19', '2027-01-18', 'Eva', ''),
    ('Xpander', '2026-10-16', '2026-10-20', 'F', ''),
    ('Xpander', '2026-12-16', '2027-01-14', 'Eva', ''),
    ('Xpander', '2027-01-31', '2027-02-22', 'Eva', ''),
    ('Cross 1403 grey', '2027-01-03', '2027-01-10', 'Eva', ''),
    ('Cross 2327 white', '2026-10-19', '2026-10-22', 'Jay', ''),
    ('Cross 2327 white', '2026-10-25', '2026-10-28', 'Jay', ''),
    ('X-Force', '2026-11-15', '2026-12-15', 'Eva', ''),
    ('X-Force', '2026-12-30', '2027-01-30', 'Jay', ''),
    ('CX3', '2026-10-19', '2026-10-22', 'Jay', ''),
    ('CX3', '2026-10-23', '2026-11-02', 'Jay', ''),
    ('Altis', '2026-12-19', '2027-01-05', 'Eva', ''),
    ('Civic RS', '2026-10-19', '2026-10-22', 'Jay', ''),
    ('Civic RS', '2026-10-25', '2026-11-04', 'Eva', 'Замена с City RS.'),
    ('Civic white 2020', '2026-10-16', '2026-10-22', 'Eva', 'Замена с Mazda2.'),
    ('City RS', '2026-12-25', '2027-01-25', 'Eva', ''),
    ('Ativ grey', '2026-12-07', '2026-12-29', 'Mar', ''),
]


def plan(assets, existing, zone_name, now):
    zone = ZoneInfo(zone_name)
    today = now.astimezone(zone).date()
    by_legacy = {asset.legacy.get('car_id'): asset for asset in assets if asset.archived_at is None}
    old_ids = {booking.id for booking in existing}
    numbers = [int(booking.booking_number) for booking in existing if booking.booking_number]
    if len(numbers) != len(set(numbers)):
        raise ValueError('Existing booking numbers are duplicated; stop import')
    number = max([100000, *numbers])
    planned, skipped = [], [{'vehicle': 'Volvo V60', 'reason': 'В сводке нет дат брони.'}]

    def add(vehicle, start, end, agent, entry_type, extra=''):
        nonlocal number
        if vehicle in MISSING:
            skipped.append({'vehicle': vehicle, 'period': f'{start or "?"} — {end}', 'reason': MISSING[vehicle]})
            return
        car_id = VEHICLES[vehicle]
        asset = by_legacy.get(car_id)
        if asset is None:
            skipped.append({'vehicle': vehicle, 'reason': 'Машина отсутствует в активном автопарке.'})
            return
        # Unknown start marker is stable across retries on later days. Never resurrect a cancelled import.
        canonical_start = 'unknown' if entry_type == 'block' else start
        key = hashlib.sha256(f'{SOURCE}:{TENANT}:{car_id}:{entry_type}:{canonical_start}:{end}:{agent}'.encode()).hexdigest()
        if key in old_ids:
            skipped.append({'vehicle': vehicle, 'reason': 'Уже импортировано.', 'id': key})
            return
        start_date = today if entry_type == 'block' else date.fromisoformat(start)
        end_date = date.fromisoformat(end)
        if end_date <= start_date:
            skipped.append({'vehicle': vehicle, 'reason': 'Дата окончания уже наступила; блок не создаём.', 'end': end})
            return
        start_at = datetime.combine(start_date, time(9), zone).astimezone(timezone.utc)
        end_at = datetime.combine(end_date, time(9), zone).astimezone(timezone.utc)
        days = (end_date - start_date).days
        if not 1 <= days <= 365:
            raise ValueError('Invalid duration in source schedule')
        for booking in [*existing, *planned]:
            if booking.tenant_id != TENANT:
                raise ValueError('Cross-tenant booking in input')
            if booking.asset_id == asset.id and not booking.archived_at and booking.status in {BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS}:
                if start_at < booking.end_at and end_at > booking.start_at:
                    raise ValueError(f'Occupied-period conflict for {vehicle}: {start_date} — {end_date}')
        note = f'Агент: {agent}. ' if agent else ''
        note += 'Источник: сводка парка от 12.10.2026. '
        if entry_type == 'block':
            rental = {'daily_rate': '0.00', 'total_rental': '0.00'}
            deposit = '0.00'
            note += f'Даты начала неизвестны. Блок поставлен с {today.strftime("%d.%m.%Y")}; фактическая дата начала аренды не указана.'
        else:
            rental = calculate_rental(asset.pricing, start_date, days)
            deposit = str(Decimal(str(asset.deposit_policy.get('amount', 0))).quantize(Decimal('.01')))
            note += 'Имя клиента и контакты заполнит владелец. Стоимость рассчитана по текущему тарифу; требуется подтверждение владельцем. '
            note += 'Время 09:00 задано по умолчанию; место передачи не указано. ' + extra
            rental.update(total_payable=rental['total_rental'])
        # Keep locations unset rather than inventing airport/self-pickup or delivery fees.
        rental['pickup'] = {'time': '09:00', 'return_time': '09:00', 'address': '', 'return_address': ''}
        number += 1
        if number > 999999:
            raise ValueError('Booking numbers exhausted')
        planned.append(Booking(id=key, booking_number=str(number), tenant_id=TENANT, asset_id=asset.id,
            customer_id=None, status=BookingStatus.CONFIRMED, start_at=start_at, end_at=end_at,
            currency='THB', source='platform_manual', entry_type=entry_type,
            operator_details={'customer_name': '', 'note': english_note(note.strip()), 'created_by': 'AR-schedule-import'},
            pricing={'asset_name': asset.name, 'start_date': start_date.isoformat(), 'end_date': end,
                'days': days, 'timezone': zone_name, **rental}, deposit={'amount': deposit},
            legacy={'schedule_import': SOURCE, 'agent': agent, 'original_start_unknown': entry_type == 'block',
                'pricing_estimated': entry_type == 'rental', 'time_defaulted': True}, created_at=now, updated_at=now))

    for vehicle, end, agent in CURRENT:
        add(vehicle, None, end, agent, 'block')
    for vehicle, start, end, agent, note in FUTURE:
        add(vehicle, start, end, agent, 'rental', note)
    return planned, skipped


def run(root, apply=False, now=None, translate_notes=False):
    root = Path(root)
    admin = PlatformContext.for_admin('AR-schedule-import')
    provisioner = TenantProvisioner(root)
    tenant = provisioner.get_tenant(admin, TENANT)
    if tenant.currency != 'THB':
        raise ValueError('Target park currency mismatch')
    context = TenantContext.for_actor(TENANT, admin.actor_id, {'platform_admin'})
    repo = JsonCollectionRepository(root, context, 'bookings.json', Booking)
    assets = JsonCollectionRepository(root, context, 'assets.json', RentalAsset)
    timestamp = now or utc_now()
    with provisioner._locked(), repo.storage.exclusive(repo.path):
        current = next((item for item in provisioner._load_state().tenants if item.tenant_id == TENANT and item.archived_at is None), None)
        if current is None:
            raise ValueError('Target park no longer available')
        document = repo._read_document()
        if translate_notes:
            # Do not re-import, recalculate prices, change agents, or overwrite owner edits.
            result = json.loads(json.dumps(document))
            changed = []
            for item in result['items']:
                if item.get('tenant_id') != TENANT or item.get('legacy', {}).get('schedule_import') != SOURCE:
                    continue
                details = item.get('operator_details', {})
                original = details.get('note', '')
                translated = english_note(original)
                if original != translated:
                    details['note'] = translated
                    item['updated_at'] = timestamp.isoformat()
                    Booking.parse_obj(item)
                    changed.append(item['id'])
            backup = None
            if apply and changed:
                backup = Path(tempfile.mkdtemp(prefix='ar-notes-backup-'))
                (backup / 'bookings.json').write_bytes(repo.path.read_bytes())
                try:
                    repo._write_document(result)
                    JsonlEventRepository(root, context, 'audit.jsonl').append({
                        'type': 'schedule_notes_translated', 'schema_version': 1,
                        'source': SOURCE, 'timestamp': timestamp.isoformat(),
                        'actor_id': admin.actor_id, 'booking_ids': changed, 'language': 'en'})
                except Exception:
                    repo._write_document(document)
                    raise
            return {'applied': apply, 'translated_notes': len(changed), 'backup': str(backup) if backup else None}
        existing = [Booking.parse_obj(item) for item in document['items']]
        planned, skipped = plan(assets.list(), existing, current.timezone, timestamp)
        backup = None
        if apply and planned:
            backup = Path(tempfile.mkdtemp(prefix='ar-schedule-backup-'))
            (backup / 'bookings.json').write_bytes(repo.path.read_bytes())
            audit = repo.path.parent / 'audit.jsonl'
            if audit.exists():
                (backup / 'audit.jsonl').write_bytes(audit.read_bytes())
            result = {**document, 'items': [*document['items'], *[json.loads(item.json()) for item in planned]]}
            try:
                repo._write_document(result)
                JsonlEventRepository(root, context, 'audit.jsonl').append({'type': 'schedule_imported',
                    'schema_version': 1, 'source': SOURCE, 'timestamp': timestamp.isoformat(),
                    'actor_id': admin.actor_id, 'booking_ids': [item.id for item in planned]})
            except Exception:
                repo._write_document(document)
                raise
        return {'applied': apply, 'today': timestamp.astimezone(ZoneInfo(current.timezone)).date().isoformat(),
            'bookings': sum(item.entry_type == 'rental' for item in planned), 'blocks': sum(item.entry_type == 'block' for item in planned),
            'backup': str(backup) if backup else None,
            'records': [{'number': item.booking_number, 'vehicle': item.pricing['asset_name'],
                'type': item.entry_type, 'start': item.pricing['start_date'], 'end': item.pricing['end_date'],
                'agent': item.legacy['agent']} for item in planned], 'skipped': skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--translate-notes', action='store_true')
    args = parser.parse_args()
    print(json.dumps(run(args.root, args.apply, translate_notes=args.translate_notes), ensure_ascii=False, indent=2))
