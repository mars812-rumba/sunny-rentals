import type { ParkPickup } from './park-pickup';
import { parkIntlLocale } from './park-locale';
export interface ParkRentalPeriod { start: string; end: string; pickup?: ParkPickup }

export function paidRentalDays(period: ParkRentalPeriod): number {
  const pickup = period.pickup;
  return rentalDays(period) + (pickup?.time && pickup.return_time && pickup.return_time > pickup.time ? 1 : 0);
}

export function rentalDays({ start, end }: ParkRentalPeriod): number {
  const parse = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const time = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : NaN;
  };
  return (parse(end) - parse(start)) / 86400000;
}

export function parkToday(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat(parkIntlLocale(), { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

export function rentalMoney(value: number | string, currency: string): string {
  try { return new Intl.NumberFormat(parkIntlLocale(), { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}
