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


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--expected-bookings')
    parser.add_argument('--expected-assets')
    args = parser.parse_args()
    print(json.dumps(run(args.root, args.source, args.apply, args.expected_bookings, args.expected_assets), ensure_ascii=False, indent=2))
