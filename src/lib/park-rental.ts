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

// Assemble the parts explicitly: even an en-US/browser locale must never
// change the product's day-first display. ISO values remain unchanged.
export function parkDateDisplay(date: Date, locale = parkIntlLocale(), month: 'long' | 'short' = 'long', timeZone = 'UTC'): string {
  if (!Number.isFinite(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month, year: 'numeric', timeZone }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value;
  return `${get('day')} ${get('month')} ${get('year')}`;
}

export function dateLabel(value: string, month: 'long' | 'short' = 'long', locale = parkIntlLocale()): string {
  return parkDateDisplay(new Date(`${value}T00:00:00Z`), locale, month);
}

// Seasonal boundaries recur each year. Use a leap year to allow 29 February,
// but never display that artificial year or change the MM-DD API contract.
export function seasonDateLabel(value: string, locale = parkIntlLocale()): string {
  if (!/^\d{2}-\d{2}$/.test(value)) return '—';
  const date = new Date(`2000-${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(5, 10) !== value) return '—';
  const parts = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', timeZone: 'UTC' }).formatToParts(date);
  return `${parts.find(part => part.type === 'day')?.value} ${parts.find(part => part.type === 'month')?.value}`;
}

export function rentalMoney(value: number | string, currency: string): string {
  try { return new Intl.NumberFormat(parkIntlLocale(), { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number(value)); }
  catch { return `${value} ${currency}`; }
}
