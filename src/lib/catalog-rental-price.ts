import type { ParkAvailability } from '@/api/park-telegram';
import { paidRentalDays, type ParkRentalPeriod } from './park-rental';

export function catalogRentalPrice(availability: ParkAvailability | null, period: ParkRentalPeriod | null, assetId: string) {
  if (!availability || !period || availability.start_date !== period.start || availability.end_date !== period.end
    || (availability.pickup_time || '') !== (period.pickup?.time || '')
    || (availability.return_time || '') !== (period.pickup?.return_time || '')
    || !availability.available_asset_ids.includes(assetId)) return undefined;
  const price = availability.prices?.[assetId];
  return price?.days === paidRentalDays(period) ? price : undefined;
}
