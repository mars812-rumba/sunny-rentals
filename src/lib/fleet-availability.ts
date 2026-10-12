import { parkText as pt } from '@/lib/park-locale';
import type { ParkBooking } from '@/api/park-telegram';
import { rentalDays, type ParkRentalPeriod } from '@/lib/park-rental';

export function fleetPeriodError(period: ParkRentalPeriod): string {
  if (!period.start || !period.end) return '';
  const days = rentalDays(period);
  if (!Number.isFinite(days)) return pt("Укажите корректные даты начала и окончания.");
  if (days <= 0) return pt("Дата окончания должна быть позже даты начала.");
  if (days > 365) return pt("Выберите период не больше 365 суток.");
  return '';
}

export function isFleetAssetFree(assetId: string, bookings: ParkBooking[], period: ParkRentalPeriod): boolean {
  return !bookings.some(booking => booking.asset_id === assetId
    && ['requested', 'confirmed', 'in_progress'].includes(booking.status)
    && booking.pricing.start_date < period.end && booking.pricing.end_date > period.start);
}
