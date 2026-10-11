"""Validated public vehicle details and server-side seasonal rental pricing."""
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, root_validator, validator


class StrictDetails(BaseModel):
    class Config:
        extra = 'forbid'
        allow_inf_nan = False


class SeasonRates(StrictDetails):
    price_1_6: float = Field(ge=0.01, le=100000000)
    price_7_14: float = Field(ge=0.01, le=100000000)
    price_15_29: float = Field(ge=0.01, le=100000000)
    price_30: float = Field(ge=0.01, le=100000000)


class TariffGrid(StrictDetails):
    low_season: SeasonRates
    high_season: SeasonRates
    high_start: str = '11-01'
    high_end: str = '03-31'

    @validator('high_start', 'high_end')
    def calendar_day(cls, value):
        try:
            parsed = date.fromisoformat('2001-' + value)
        except ValueError:
            raise ValueError('Укажите день сезона в формате ММ-ДД (кроме 29 февраля)') from None
        if parsed.strftime('%m-%d') != value:
            raise ValueError('Укажите день сезона в формате ММ-ДД')
        return value


class VehicleSpecs(StrictDetails):
    fuel: Literal['', 'Бензин', 'Дизель', 'Электро', 'Гибрид'] = ''
    transmission: Literal['', 'Автомат', 'Механика', 'CVT', 'Робот'] = ''
    power: str = Field(default='', max_length=80)
    engine: str = Field(default='', max_length=80)
    drive: str = Field(default='', max_length=80)
    body_type: str = Field(default='', max_length=80)
    seats: Optional[int] = Field(default=None, ge=1, le=20)
    doors: Optional[int] = Field(default=None, ge=1, le=8)
    mileage: Optional[int] = Field(default=None, ge=0, le=5000000)
    air_conditioning: Optional[bool] = None
    features: List[str] = Field(default_factory=list)

    @validator('features')
    def bounded_features(cls, value):
        values = [item.strip() for item in value if item.strip()]
        if len(values) > 20 or any(len(item) > 80 for item in values):
            raise ValueError('Название опции — не более 80 символов')
        return list(dict.fromkeys(values))


class VehicleDetailsInput(StrictDetails):
    section: Literal['pricing', 'specs', 'description']
    pricing: Optional[TariffGrid] = None
    deposit: Optional[float] = Field(default=None, ge=0, le=100000000)
    pricing_mode: Optional[Literal['flat', 'duration', 'seasonal']] = None
    daily_rate: Optional[float] = Field(default=None, ge=0.01, le=100000000)
    specs: Optional[VehicleSpecs] = None
    description: Optional[str] = Field(default=None, max_length=5000)

    @root_validator(skip_on_failure=True)
    def one_section(cls, values):
        section = values.get('section')
        mode = values.get('pricing_mode')
        if section != 'pricing' and (mode is not None or values.get('daily_rate') is not None):
            raise ValueError('Режим и цена изменяются только в разделе тарифов')
        if mode in ('duration', 'seasonal') and values.get('pricing') is None:
            raise ValueError('Заполните тарифы по сроку аренды')
        if mode == 'flat' and values.get('daily_rate') is None:
            raise ValueError('Укажите цену за сутки')
        if section != 'pricing' and values.get('deposit') is not None:
            raise ValueError('Депозит изменяется только вместе с тарифами')
        if any(values.get(key) is not None for key in ('pricing', 'specs', 'description') if key != section):
            raise ValueError('Сохраняйте один раздел за раз')
        if section != 'pricing' and values.get(section) is None:
            raise ValueError('Заполните выбранный раздел')
        return values


PUBLIC_SPEC_KEYS = {'brand', 'model', 'year', 'color', *VehicleSpecs.__fields__.keys()}


def active_tariff_grid(pricing):
    """Inactive grids stay private and are not advertised or used for quotes."""
    if pricing.get('pricing_mode') == 'flat' or not pricing.get('tariff_grid'):
        return None
    grid = TariffGrid.parse_obj(pricing['tariff_grid'])
    import json
    data = json.loads(grid.json())
    if pricing.get('pricing_mode') == 'duration':
        data['mode'] = 'duration'
    return data


def calculate_rental(pricing, start: date, days: int):
    """Tier is chosen by total duration; each rental day uses its own season.

    The return day is excluded. Decimal arithmetic rounds only the final total.
    Flat legacy rates keep their old quote format (no breakdown).
    """
    if not 1 <= days <= 365:
        raise ValueError('Choose 1 to 365 days')
    grid_data = None if pricing.get('pricing_mode') == 'flat' else pricing.get('tariff_grid')
    if not grid_data:
        rate = Decimal(str(pricing.get('daily_rate', 0)))
        if not rate.is_finite() or not 0 < rate <= 100000000:
            raise ValueError('Price is not configured')
        rate = rate.quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        return {'daily_rate': str(rate), 'total_rental': str(rate * days)}
    grid = TariffGrid.parse_obj(grid_data)
    tier = 'price_1_6' if days <= 6 else 'price_7_14' if days <= 14 else 'price_15_29' if days <= 29 else 'price_30'
    if pricing.get('pricing_mode') == 'duration':
        rate = Decimal(str(getattr(grid.low_season, tier))).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        return {'daily_rate': str(rate), 'total_rental': str(rate * days)}
    counts = {'low_season': 0, 'high_season': 0}
    for offset in range(days):
        current = (start + timedelta(days=offset)).strftime('%m-%d')
        high = (grid.high_start <= current <= grid.high_end if grid.high_start <= grid.high_end
                else current >= grid.high_start or current <= grid.high_end)
        counts['high_season' if high else 'low_season'] += 1
    breakdown = []
    total = Decimal('0')
    for season, count in counts.items():
        if not count:
            continue
        rate = Decimal(str(getattr(getattr(grid, season), tier))).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        subtotal = rate * count
        total += subtotal
        breakdown.append({'season': season, 'days': count, 'daily_rate': str(rate), 'subtotal': str(subtotal)})
    return {'daily_rate': str((total / days).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)),
            'total_rental': str(total), 'tariff_breakdown': breakdown}
