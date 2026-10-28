import { differenceInCalendarDays, isValid } from 'date-fns';

// Calendar selections represent Phuket wall dates, not UTC instants.
export function appRentalDays(start?: Date | null, end?: Date | null, pickupTime = '13:00', returnTime = '13:00'): number {
  if (!start || !end || !isValid(start) || !isValid(end)) return 0;
  const minutes = (value: string) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
    ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
  const days = differenceInCalendarDays(end, start);
  const elapsed = days * 1440 + minutes(returnTime) - minutes(pickupTime);
  return Number.isFinite(elapsed) && days >= 0 && elapsed > 0 ? Math.ceil(elapsed / 1440) : 0;
}

// Match the public website and the existing /app confirmation: Nov–Apr.
export function appRentalSeason(start: Date = new Date()): 'high_season' | 'low_season' {
  const month = start.getMonth() + 1;
  return month >= 11 || month <= 4 ? 'high_season' : 'low_season';
}

type Rates = Partial<Record<'price_1_6' | 'price_7_14' | 'price_15_29' | 'price_30', number>>;
export function appRentalDailyPrice(pricing: { low_season?: Rates; high_season?: Rates }, days: number, start?: Date | null): number {
  const date = start && isValid(start) ? start : new Date();
  const rates = pricing[appRentalSeason(date)] ?? pricing.low_season ?? pricing.high_season;
  const tier = days >= 30 ? 'price_30' : days >= 15 ? 'price_15_29' : days >= 7 ? 'price_7_14' : 'price_1_6';
  return rates?.[tier] ?? 0;
}
