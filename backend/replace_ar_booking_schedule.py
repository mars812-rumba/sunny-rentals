"""Replace only AR's manual occupancy from the owner's registration-number snapshot.

Default: locked dry run. Applying requires both dry-run hashes; always backs up
the old document before a single atomic replacement and preserves audit history.
"""
import argparse
from collections import defaultdict
from datetime import date, datetime, time, timezone
import hashlib
import json
from pathlib import Path
import re
import tempfile
from zoneinfo import ZoneInfo

from platform_core.context import TenantContext
from platform_core.models import Booking, BookingStatus, RentalAsset, utc_now
from platform_core.provisioning import PlatformContext, TenantProvisioner
from platform_core.repositories import JsonCollectionRepository, JsonlEventRepository

TENANT = 'ar-rentals'
SOURCE = 'AR-owner-schedule-2026-10-19'


def sha(content):
    return hashlib.sha256(content).hexdigest()


def plate_digits(value):
    # The owner entered numeric plate suffixes. Never match by model or colour.
    groups = re.findall(r'\d+', value or '')
    return groups[-1] if groups else None


def merged_periods(periods):
    result = []
    for original in sorted(periods):
        start, end = map(date.fromisoformat, original)
        if end <= start:
            raise ValueError(f'Invalid source period: {original}')
        # Only overlaps; adjacent rentals stay separate records.
        if result and start < result[-1][1]:
            result[-1][1] = max(result[-1][1], end)
            result[-1][2].append(original)
        else:
            result.append([start, end, [original]])
    return result


def plan(assets, existing, source, source_hash, zone_name, now):
    if source.get('source_id') != SOURCE:
        raise ValueError('Unexpected source snapshot')
    by_plate = defaultdict(list)
    for row in source['vehicles']:
        by_plate[plate_digits(row.get('plate'))].append(row)
    active = [asset for asset in assets if asset.archived_at is None]
    target_plates = [plate_digits(asset.license_plate) for asset in active]
    if None in target_plates or len(target_plates) != len(set(target_plates)):
        raise ValueError('Active AR assets have missing or duplicated registration numbers')
    maximum = max([100000, *[int(item.booking_number) for item in existing if item.booking_number]])
    zone = ZoneInfo(zone_name)
    records, matched = [], []
    for asset in active:
        number = plate_digits(asset.license_plate)
        candidates = by_plate.get(number, [])
        if len(candidates) != 1:
            raise ValueError(f'No unique source vehicle for plate {number}')
        row = candidates[0]
        periods = merged_periods(row['periods'])
        matched.append({'asset_id': asset.id, 'vehicle': asset.name, 'plate': number,
                        'source_periods': len(row['periods']), 'records': len(periods)})
        for start, end, originals in periods:
            maximum += 1
            if maximum > 999999:
                raise ValueError('Booking number space exhausted')
            start_at = datetime.combine(start, time(9), zone).astimezone(timezone.utc)
            end_at = datetime.combine(end, time(9), zone).astimezone(timezone.utc)
            identifier = sha(f'{source_hash}:{asset.id}:{start}:{end}'.encode())
            records.append(Booking(id=identifier, booking_number=str(maximum), tenant_id=TENANT,
                asset_id=asset.id, customer_id=None, status=BookingStatus.CONFIRMED,
                start_at=start_at, end_at=end_at, currency='THB', entry_type='block', source='platform_manual',
                pricing={'asset_name': asset.name, 'start_date': str(start), 'end_date': str(end),
                         'days': (end - start).days, 'timezone': zone_name,
                         'daily_rate': '0.00', 'total_rental': '0.00'},
                deposit={'amount': '0.00'},
                operator_details={'customer_name': '', 'created_by': 'AR-schedule-replacement',
                    'note': f'Owner schedule snapshot, 19 October 2026. Registration: {number}. '
                            'Occupancy only; customer and rental price were not provided. '
                            'Dates retained literally; pickup/return time defaults to 09:00 Asia/Bangkok. '
                            f'Original periods: {json.dumps(originals)}'},
                legacy={'schedule_replacement': SOURCE, 'source_sha256': source_hash,
                        'registration_number': number, 'source_vehicle_name': row['name'],
                        'source_periods': originals, 'time_defaulted': True},
                created_at=now, updated_at=now))
    missing = [{'vehicle': row['name'], 'plate': row.get('plate'), 'periods': row['periods']}
               for row in source['vehicles'] if plate_digits(row.get('plate')) not in target_plates]
    return records, matched, missing


def run(root, source_path, apply=False, expected_bookings=None, expected_assets=None, now=None):
    root = Path(root).resolve()
    raw_source = Path(source_path).read_bytes()
    source = json.loads(raw_source)
    source_hash = sha(raw_source)
    timestamp = now or utc_now()
    admin = PlatformContext.for_admin('AR-schedule-replacement')
    provisioner = TenantProvisioner(root)
    context = TenantContext.for_actor(TENANT, admin.actor_id, {'platform_admin'})
    bookings = JsonCollectionRepository(root, context, 'bookings.json', Booking)
    fleet = JsonCollectionRepository(root, context, 'assets.json', RentalAsset)
    with provisioner._locked(), bookings.storage.exclusive(bookings.path), fleet.storage.exclusive(fleet.path):
        tenant = next((item for item in provisioner._load_state().tenants if item.tenant_id == TENANT and item.archived_at is None), None)
        if tenant is None or tenant.currency != 'THB' or tenant.timezone != 'Asia/Bangkok':
            raise ValueError('Unexpected AR tenant settings')
        document = bookings._read_document()
        assets_document = fleet._read_document()
        old = [Booking.parse_obj(item) for item in document['items']]
        assets = [RentalAsset.parse_obj(item) for item in assets_document['items']]
        for item in [*old, *assets]:
            context.require_record_tenant(item.tenant_id)
        if any(item.legacy.get('schedule_replacement') == SOURCE for item in old):
            if any(item.legacy.get('source_sha256') != source_hash for item in old if item.legacy.get('schedule_replacement') == SOURCE):
                raise ValueError('Snapshot source changed after import; stop')
            return {'applied': False, 'already_applied': True, 'bookings': len(old)}
        if any(item.customer_id or item.source not in {'owner_manual', 'platform_manual'}
               or item.status not in {BookingStatus.CONFIRMED, BookingStatus.CANCELLED}
               or item.deposit.get('paid') or item.pricing.get('paid') for item in old):
            raise ValueError('Existing records are no longer only the approved manual schedule')
        before_bookings = bookings.path.read_bytes()
        before_assets = fleet.path.read_bytes()
        hashes = {'bookings_sha256': sha(before_bookings), 'assets_sha256': sha(before_assets)}
        records, matched, missing = plan(assets, old, source, source_hash, tenant.timezone, timestamp)
        if not records:
            raise ValueError('Refuse to replace schedule with an empty import')
        report = {'applied': False, 'removed_records': len(old), 'new_records': len(records),
                  'matched_assets': len(matched), 'occupied_assets': sum(item['records'] > 0 for item in matched),
                  'source_sha256': source_hash, **hashes, 'matched': matched, 'not_in_park': missing}
        if not apply:
            return report
        if expected_bookings != hashes['bookings_sha256'] or expected_assets != hashes['assets_sha256']:
            raise ValueError('Data changed or approval hashes missing; repeat the dry run')
        backup_parent = root / 'backups' / TENANT
        if not backup_parent.resolve().is_relative_to(root):
            raise ValueError('Invalid backup path')
        backup_parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix='schedule-2026-10-19-', dir=backup_parent))
        (backup / 'bookings.json').write_bytes(before_bookings)
        (backup / 'assets.json').write_bytes(before_assets)
        (backup / 'source.json').write_bytes(raw_source)
        audit = bookings.path.parent / 'audit.jsonl'
        if audit.exists():
            (backup / 'audit.jsonl').write_bytes(audit.read_bytes())
        (backup / 'manifest.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
        replacement = {**document, 'items': [json.loads(item.json()) for item in records]}
        try:
            bookings._write_document(replacement)
            JsonlEventRepository(root, context, 'audit.jsonl').append({
                'schema_version': 1, 'type': 'schedule_replaced', 'actor_id': admin.actor_id,
                'timestamp': timestamp.isoformat(), 'source': SOURCE, 'source_sha256': source_hash,
                'old_booking_ids': [item.id for item in old], 'new_booking_ids': [item.id for item in records],
                'backup': str(backup)})
        except Exception:
            bookings._write_document(document)
            raise
        report.update(applied=True, backup=str(backup))
        return report


def confirm_imported_rentals(root, apply=False, expected_bookings=None, expected_count=48, now=None):
    """Change the imported entry type only; never invent clients, charges or payments."""
    root = Path(root).resolve()
    context = TenantContext.for_actor(TENANT, 'AR-schedule-replacement', {'platform_admin'})
    provisioner = TenantProvisioner(root)
    repo = JsonCollectionRepository(root, context, 'bookings.json', Booking)
    timestamp = now or utc_now()
    with provisioner._locked(), repo.storage.exclusive(repo.path):
        tenant = next((item for item in provisioner._load_state().tenants if item.tenant_id == TENANT and item.archived_at is None), None)
        if tenant is None:
            raise ValueError('AR tenant unavailable')
        original = repo.path.read_bytes()
        previous = repo._read_document()
        document = json.loads(json.dumps(previous))
        targets = [item for item in document['items'] if item.get('legacy', {}).get('schedule_replacement') == SOURCE]
        if len(targets) != expected_count:
            raise ValueError('Unexpected imported record count; stop')
        changed = []
        for item in targets:
            context.require_record_tenant(item.get('tenant_id'))
            if item['entry_type'] == 'rental':
                continue
            if item['entry_type'] != 'block' or item['status'] != 'confirmed' or item.get('archived_at'):
                raise ValueError('Imported record was changed; stop instead of resurrecting it')
            item['entry_type'] = 'rental'
            item['legacy'].update(converted_to_rental=True, customer_not_provided=not bool(item.get('customer_id')),
                                  agreed_price_not_provided=True)
            item['pricing'].setdefault('pickup', {'time': '09:00', 'return_time': '09:00', 'address': '', 'return_address': ''})
            note = item['operator_details'].get('note', '')
            item['operator_details']['note'] = note.replace(
                'Occupancy only; customer and rental price were not provided.',
                'Confirmed rental. Customer and agreed rental price were not provided; zero amounts are placeholders, not a recorded payment.')
            item['updated_at'] = timestamp.isoformat()
            Booking.parse_obj(item)
            changed.append(item['id'])
        report = {'applied': False, 'converted': len(changed), 'bookings_sha256': sha(original)}
        if not apply or not changed:
            return report
        if expected_bookings != sha(original):
            raise ValueError('Approval hash missing or schedule changed; repeat dry run')
        backup_parent = root / 'backups' / TENANT
        if not backup_parent.resolve().is_relative_to(root):
            raise ValueError('Invalid backup path')
        backup_parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix='confirmed-rentals-', dir=backup_parent))
        (backup / 'bookings.json').write_bytes(original)
        audit = repo.path.parent / 'audit.jsonl'
        if audit.exists():
            (backup / 'audit.jsonl').write_bytes(audit.read_bytes())
        try:
            repo._write_document(document)
            JsonlEventRepository(root, context, 'audit.jsonl').append({
                'schema_version': 1, 'type': 'imported_blocks_converted_to_rentals',
                'actor_id': context.actor_id, 'timestamp': timestamp.isoformat(),
                'source': SOURCE, 'booking_ids': changed, 'backup': str(backup)})
        except Exception:
            repo._write_document(previous)
            raise
        return {**report, 'applied': True, 'backup': str(backup)}


def correct_xpander_year(root, apply=False, expected_bookings=None, now=None):
    """Owner-confirmed correction of one imported rental, not a schedule reimport."""
    root = Path(root).resolve()
    context = TenantContext.for_actor(TENANT, 'AR-owner-date-correction', {'platform_admin'})
    repo = JsonCollectionRepository(root, context, 'bookings.json', Booking)
    timestamp = now or utc_now()
    old_dates = ('2026-01-31', '2026-02-22')
    new_dates = ('2027-01-31', '2027-02-22')
    with TenantProvisioner(root)._locked(), repo.storage.exclusive(repo.path):
        original = repo.path.read_bytes()
        previous = repo._read_document()
        document = json.loads(json.dumps(previous))
        candidates = [item for item in document['items']
                      if item.get('legacy', {}).get('schedule_replacement') == SOURCE
                      and item['legacy'].get('registration_number') == '2600'
                      and (item.get('pricing', {}).get('start_date'), item.get('pricing', {}).get('end_date'))
                      in (old_dates, new_dates)]
        if len(candidates) != 1:
            raise ValueError('No unique imported Xpander period; stop')
        item = candidates[0]
        context.require_record_tenant(item.get('tenant_id'))
        if item.get('entry_type') != 'rental' or item.get('status') != 'confirmed' or item.get('archived_at'):
            raise ValueError('Rental changed; stop')
        corrected = item['pricing']['start_date'] == new_dates[0]
        report = {'applied': False, 'already_corrected': corrected, 'booking_id': item['id'],
                  'bookings_sha256': sha(original), 'old_dates': old_dates, 'new_dates': new_dates}
        if corrected:
            return report
        before = Booking.parse_obj(item)
        zone = ZoneInfo('Asia/Bangkok')
        if (before.start_at.astimezone(zone).date().isoformat(), before.end_at.astimezone(zone).date().isoformat()) != old_dates:
            raise ValueError('Stored timestamps differ from expected dates; stop')
        start = before.start_at.astimezone(zone).replace(year=2027).astimezone(timezone.utc)
        end = before.end_at.astimezone(zone).replace(year=2027).astimezone(timezone.utc)
        for other in document['items']:
            record = Booking.parse_obj(other)
            if record.id != before.id and record.asset_id == before.asset_id and not record.archived_at and record.status != BookingStatus.CANCELLED:
                if record.start_at < end and record.end_at > start:
                    raise ValueError('Corrected dates overlap another rental; stop')
        item.update(start_at=start.isoformat(), end_at=end.isoformat(), updated_at=timestamp.isoformat())
        item['pricing'].update(start_date=new_dates[0], end_date=new_dates[1], days=(end - start).days)
        # Preserve the source snapshot literally and record the owner's later correction separately.
        item['legacy']['owner_date_correction'] = {'old_dates': old_dates, 'new_dates': new_dates,
                                                  'confirmed_at': timestamp.isoformat()}
        item['operator_details']['note'] = item['operator_details'].get('note', '') + ' Owner confirmed year correction: 31 Jan–22 Feb 2027 (not 2026).'
        Booking.parse_obj(item)
        if not apply:
            return report
        if expected_bookings != sha(original):
            raise ValueError('Approval hash missing or schedule changed; repeat dry run')
        parent = root / 'backups' / TENANT
        if not parent.resolve().is_relative_to(root):
            raise ValueError('Invalid backup path')
        parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix='xpander-year-', dir=parent))
        (backup / 'bookings.json').write_bytes(original)
        audit = repo.path.parent / 'audit.jsonl'
        if audit.exists():
            (backup / 'audit.jsonl').write_bytes(audit.read_bytes())
        try:
            repo._write_document(document)
            JsonlEventRepository(root, context, 'audit.jsonl').append({
                'schema_version': 1, 'type': 'owner_booking_year_corrected', 'actor_id': context.actor_id,
                'timestamp': timestamp.isoformat(), 'booking_id': item['id'],
                'old_dates': old_dates, 'new_dates': new_dates, 'backup': str(backup)})
        except Exception:
            repo._write_document(previous)
            raise
        return {**report, 'applied': True, 'backup': str(backup)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--expected-bookings')
    parser.add_argument('--expected-assets')
    args = parser.parse_args()
    print(json.dumps(run(args.root, args.source, args.apply, args.expected_bookings, args.expected_assets), ensure_ascii=False, indent=2))
