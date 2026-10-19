"""Scoped, hash-guarded completion of the owner's newly added AR cars."""
from copy import deepcopy
from datetime import date
import json
from pathlib import Path
import tempfile

from replace_ar_booking_schedule import TENANT, SOURCE, sha, plan
from platform_core.context import TenantContext
from platform_core.models import Booking, RentalAsset, utc_now
from platform_core.provisioning import TenantProvisioner
from platform_core.repositories import JsonCollectionRepository, JsonlEventRepository

# Explicit plate + source row disambiguates sedan 4551 from the other HB 4551.
TARGETS = {
    '2327': ('1403', 'Cross 2023 White', 'suv'),
    '4551': ('3787', 'City 2023 White', 'sedan'),
    '8393': ('8664', 'Mazda 2 Sedan 2023 White', 'sedan'),
    '4365': ('3432', 'Ative 2023 White Premium', 'sedan'),
    '9256': ('8664', 'Mazda 2 Sedan 2023 Grey', 'sedan'),
    '8391': ('8664', 'Mazda 2 HB 2023 Black', 'hatchback'),
    '1900': ('3787', 'City HB 2021 White', 'hatchback'),
    '3275': ('8664', 'Mazda 2 Sedan 2023 Blue', 'sedan'),
    '9050': ('8664', 'Mazda 2 Sedan 2023 Red', 'sedan'),
    '3475': ('3432', 'Ative 2024 White', 'sedan'),
    '8951': ('8323', 'Civic 2018 Silver', 'sedan'),
}


def complete(root, source_path, apply=False, expected_assets=None, expected_bookings=None):
    root = Path(root).resolve()
    context = TenantContext.for_actor(TENANT, 'AR-new-fleet-completion', {'platform_admin'})
    fleet = JsonCollectionRepository(root, context, 'assets.json', RentalAsset)
    bookings = JsonCollectionRepository(root, context, 'bookings.json', Booking)
    raw_source = Path(source_path).read_bytes()
    source = json.loads(raw_source)
    if source.get('source_id') != SOURCE:
        raise ValueError('Unexpected source snapshot')
    now = utc_now()
    with TenantProvisioner(root)._locked(), bookings.storage.exclusive(bookings.path), fleet.storage.exclusive(fleet.path):
        old_assets, old_bookings = fleet._read_document(), bookings._read_document()
        assets, document = deepcopy(old_assets), deepcopy(old_bookings)
        asset_bytes, booking_bytes = fleet.path.read_bytes(), bookings.path.read_bytes()
        hashes = {'assets_sha256': sha(asset_bytes), 'bookings_sha256': sha(booking_bytes)}
        by_plate = {}
        for item in assets['items']:
            context.require_record_tenant(item['tenant_id'])
            if not item.get('archived_at'):
                by_plate.setdefault(item.get('license_plate'), []).append(item)
        changed, selected, rows, skipped = [], [], [], []
        for plate, (template_plate, source_name, body) in TARGETS.items():
            if len(by_plate.get(plate, [])) != 1 or len(by_plate.get(template_plate, [])) != 1:
                raise ValueError(f'No unique active asset/template for {plate}')
            item, template = by_plate[plate][0], by_plate[template_plate][0]
            candidates = [row for row in source['vehicles'] if row['plate'] == plate and row['name'] == source_name]
            if len(candidates) != 1:
                raise ValueError(f'No exact source row for {plate}')
            row = deepcopy(candidates[0])
            valid = []
            for start, end in row['periods']:
                if date.fromisoformat(end) <= date.fromisoformat(start):
                    skipped.append({'plate': plate, 'period': [start, end], 'reason': 'missing same-day times'})
                else:
                    valid.append([start, end])
            row['periods'] = valid
            rows.append(row)
            before = deepcopy(item)
            if not item['pricing'].get('daily_rate'):
                item['pricing'] = {**deepcopy(template['pricing']), **{k: v for k, v in item['pricing'].items() if k != 'daily_rate'}}
            if not item.get('deposit_policy', {}).get('amount'):
                item['deposit_policy'] = deepcopy(template['deposit_policy'])
            # Identity/colour/year and existing technical fields always win.
            for key in ['fuel', 'transmission', 'engine', 'power']:
                if not item['specs'].get(key) and template['specs'].get(key):
                    if plate == '8951' and key in ('engine', 'power'):
                        continue  # 2018 1.8 is not the newer 1.5 Turbo.
                    item['specs'][key] = template['specs'][key]
            if plate == '8951':
                item['specs'].setdefault('engine', '1.8L')
            if not item['specs'].get('body_type'):
                item['specs']['body_type'] = body
            if item != before:
                item['legacy']['new_fleet_completion'] = {'template_asset_id': template['id'], 'at': now.isoformat()}
                item['updated_at'] = now.isoformat()
                changed.append(plate)
            selected.append(RentalAsset.parse_obj(item))
        old = [Booking.parse_obj(item) for item in document['items']]
        for record in old:
            context.require_record_tenant(record.tenant_id)
        records, _, _ = plan(selected, old, {'source_id': SOURCE, 'vehicles': rows}, sha(raw_source), 'Asia/Bangkok', now)
        added = []
        for record in records:
            overlapping = [other for other in old if other.asset_id == record.asset_id and not other.archived_at
                           and other.status.value not in ('cancelled', 'rejected')
                           and other.start_at < record.end_at and other.end_at > record.start_at]
            if any(other.start_at <= record.start_at and other.end_at >= record.end_at for other in overlapping):
                continue
            if overlapping:
                raise ValueError(f'Partial overlap for {record.asset_id}; review manually')
            record.entry_type = 'rental'
            record.legacy.update(new_fleet_completion=True, customer_not_provided=True, agreed_price_not_provided=True)
            record.pricing['pickup'] = {'time': '09:00', 'return_time': '09:00', 'address': '', 'return_address': ''}
            record.operator_details['note'] = record.operator_details['note'].replace(
                'Occupancy only; customer and rental price were not provided.',
                'Confirmed rental. Customer and agreed price were not provided; zero amounts are placeholders, not payments.')
            added.append(record)
        document['items'].extend(json.loads(item.json()) for item in added)
        report = {'applied': False, **hashes, 'updated_plates': changed, 'new_bookings': len(added),
                  'total_bookings': len(document['items']), 'skipped': skipped}
        if not apply or not (changed or added):
            return report
        if expected_assets != hashes['assets_sha256'] or expected_bookings != hashes['bookings_sha256']:
            raise ValueError('Stale or missing approval hashes')
        parent = root / 'backups' / TENANT
        if not parent.resolve().is_relative_to(root):
            raise ValueError('Invalid backup path')
        parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        backup = Path(tempfile.mkdtemp(prefix='new-fleet-', dir=parent))
        (backup / 'assets.json').write_bytes(asset_bytes)
        (backup / 'bookings.json').write_bytes(booking_bytes)
        audit = fleet.path.parent / 'audit.jsonl'
        if audit.exists():
            (backup / 'audit.jsonl').write_bytes(audit.read_bytes())
        try:
            fleet._write_document(assets)
            bookings._write_document(document)
            JsonlEventRepository(root, context, 'audit.jsonl').append({
                'schema_version': 1, 'type': 'new_fleet_completed', 'actor_id': context.actor_id,
                'timestamp': now.isoformat(), 'updated_plates': changed,
                'booking_ids': [item.id for item in added], 'backup': str(backup)})
        except Exception:
            fleet._write_document(old_assets)
            bookings._write_document(old_bookings)
            raise
        return {**report, 'applied': True, 'backup': str(backup)}
