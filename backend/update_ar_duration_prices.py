"""AR rate-sheet update: confirmed tier mapping, +10%, no seasonality.

The source's monthly amount becomes a two-decimal daily rate for 30+ days.
Default is a read-only plan. --apply is the explicit scoped data operation.
"""
import argparse
from decimal import Decimal, ROUND_HALF_UP
import json
from pathlib import Path
import tempfile

from platform_core.asset_admin import TenantAssetAdmin
from platform_core.provisioning import PlatformContext
from platform_core.models import utc_now
from platform_core.vehicle_details import TariffGrid, calculate_rental
from datetime import date

# Source columns: Monthly, 16-29 days, 6-15 days, 1-5 days.
ROWS = {
    'volvo': (40000, 1400, 1500, 1600),
    'fortuner': (30000, 1100, 1250, 1400),
    'medium': (24000, 850, 950, 1100),
    'xforce': (24000, 900, 1100, 1300),
    'yaris_cross_cx3': (21000, 750, 850, 1000),
    'hrv_rs': (27000, 1000, 1100, 1200),
    'camry_altis': (21000, 700, 850, 1000),
    'city_ativ': (15000, 500, 600, 700),
    'mazda2_yaris': (14000, 500, 550, 650),
}
GROUPS = {
    'volvo': ['volvo_v60_2020_white'],
    'fortuner': ['toyota_fortuner_2019_white', 'toyota_fortuner_2023_gray'],
    'medium': ['Ar_veloz_gray_2024', 'Ar_xpander_hev_white_2024', 'ar_corolla_cross_blue_2024',
        'toyota_corolla_2024_white', 'mazda_cx30_2023_bege', 'honda_hrv_2025_blackv',
        'honda_civic_2024_black', 'honda_civic_2024_white', 'honda_civic_2023_white'],
    'xforce': ['mitsubishi_xforce_2025_white'],
    'yaris_cross_cx3': ['Ar_yaris_cross_white_2024', 'mazda_cx3_2023_bege'],
    'hrv_rs': ['ar_hrvrs_black_2024'],
    'camry_altis': ['toyota_camry_2020_black', 'toyota_altis_2023_gray'],
    'city_ativ': ['Ar_city_rs_black_2025', 'honda_city_2023_gray', 'toyota_ativ_2024_gray'],
    'mazda2_yaris': ['mazda_mazda2_2024_white', 'mazda_mazda2_2023_gray', 'mazda_mazda2_2023_white',
        'toyota_yaris_2023_blue', 'toyota_yaris_2024_gray'],
}
MAPPING = {car_id: group for group, ids in GROUPS.items() for car_id in ids}


def money(value):
    return Decimal(value).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)


def rates_for(group):
    monthly, long, middle, short = [Decimal(value) * Decimal('1.10') for value in ROWS[group]]
    return {'price_1_6': float(money(short)), 'price_7_14': float(money(middle)),
        'price_15_29': float(money(long)), 'price_30': float(money(monthly / 30))}


def updated_document(document):
    result = json.loads(json.dumps(document))
    imported = [item for item in result['items'] if not item.get('archived_at')
        and item.get('legacy', {}).get('source') == 'legacy-owner-AR-v1']
    if document.get('tenant_id') != 'ar-rentals' or len(imported) != 26:
        raise ValueError('Expected exactly 26 active imported AR vehicles')
    if {item['legacy']['car_id'] for item in imported} != set(MAPPING):
        raise ValueError('Imported AR fleet does not match the reviewed rate-sheet mapping')
    report = []
    for item in imported:
        if item.get('tenant_id') != 'ar-rentals' or item['pricing'].get('currency') != 'THB':
            raise ValueError('Wrong tenant or currency')
        car_id = item['legacy']['car_id']
        rates = rates_for(MAPPING[car_id])
        old_grid = item['pricing'].get('tariff_grid') or {}
        grid = TariffGrid(low_season=rates, high_season=rates,
            high_start=old_grid.get('high_start', '11-01'), high_end=old_grid.get('high_end', '03-31'))
        pricing = {**item['pricing'], 'pricing_mode': 'duration', 'daily_rate': rates['price_1_6'],
            'tariff_grid': json.loads(grid.json())}
        changed = pricing != item['pricing']
        item['pricing'] = pricing
        if changed:
            item['updated_at'] = utc_now().isoformat()
        # Verify all boundary days and that seasons do not affect the quote.
        for days in [1, 6, 7, 14, 15, 29, 30, 31]:
            key = 'price_1_6' if days <= 6 else 'price_7_14' if days <= 14 else 'price_15_29' if days <= 29 else 'price_30'
            april = calculate_rental(pricing, date(2027, 4, 1), days)
            january = calculate_rental(pricing, date(2027, 1, 1), days)
            if april != january or Decimal(april['daily_rate']) != Decimal(str(rates[key])):
                raise ValueError(f'Price validation failed: {car_id}')
        report.append({'car_id': car_id, 'name': item['name'], 'rates': rates, 'changed': changed,
            'monthly_source_plus_10': float(money(Decimal(ROWS[MAPPING[car_id]][0]) * Decimal('1.10'))),
            'quoted_30_days': calculate_rental(pricing, date(2027, 4, 1), 30)['total_rental']})
    return result, report


def run(root, apply=False):
    service = TenantAssetAdmin(Path(root), PlatformContext.for_admin('ar-rate-sheet-update'), 'ar-rentals')
    with service.provisioner._locked(), service.assets.storage.exclusive(service.assets.path):
        previous = service.assets._read_document()
        document, report = updated_document(previous)
        backup = None
        if apply and document != previous:
            backup = Path(tempfile.mkdtemp(prefix='ar-prices-backup-')) / 'assets.json'
            backup.write_bytes(service.assets.path.read_bytes())
            try:
                service.assets._write_document(document)
                service._event('fleet_prices_updated', source='AR October-November rate sheet',
                    markup_percent=10, pricing_mode='duration', tier_mapping='1-5:1-6;6-15:7-14;16-29:15-29;monthly:30+',
                    car_ids=[row['car_id'] for row in report])
            except Exception:
                service.assets._write_document(previous)
                raise
        return {'applied': apply, 'changed': sum(row['changed'] for row in report),
            'backup': str(backup) if backup else None, 'vehicles': report}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    print(json.dumps(run(args.root, args.apply), ensure_ascii=False, indent=2))
