import type { Booking, Car, LogisticsDate } from '@/api/api';
import type { PlatformAsset } from '@/api/platform-admin';
import type { ParkBooking } from '@/api/park-telegram';
import { pickupLabels } from '@/lib/park-pickup';

// A view adapter only: no calls to legacy Sunny APIs, no second booking store.
// Use park-local civil dates, not UTC timestamps converted by the visitor's timezone.
export function calendarThumbnail(asset: PlatformAsset): string | undefined {
  return asset.photos.thumbnail || asset.photos.main?.replace(/\/([a-f0-9]{32}\.webp)$/, '/thumb/$1');
}

export function calendarBooking(item: ParkBooking): Booking {
  return {
    booking_id: item.id, user_id: '', source: item.source?.endsWith('_manual') ? 'manager' : item.source === 'web_storefront' ? 'web_browser' : 'telegram_webapp', created_at: item.start_at,
    status: item.entry_type === 'block' && item.status !== 'cancelled' ? 'blocked' : item.status === 'requested' ? 'pre_booking' : ['in_progress', 'completed'].includes(item.status) ? 'confirmed' : item.status,
    form_data: {
      car: { id: item.asset_id, name: item.pricing.asset_name, brand: '', model: '', year: '', color: '' },
      dates: { start: `${item.pricing.start_date}T${item.pricing.pickup?.time || '00:00'}:00`, end: `${item.pricing.end_date}T${item.pricing.pickup?.return_time || item.pricing.pickup?.time || '00:00'}:00`, days: item.pricing.days, pickupTime: item.pricing.pickup?.time || '', returnTime: item.pricing.pickup?.return_time || item.pricing.pickup?.time || '' },
      locations: { pickupLocation: item.pricing.pickup ? item.pricing.pickup.address || pickupLabels[item.pricing.pickup.location] : '', returnLocation: item.pricing.pickup?.return_location ? item.pricing.pickup.return_address || pickupLabels[item.pricing.pickup.return_location] : '' }, contact: { value: '', type: '', name: item.operator_details?.customer_name || '' },
      pricing: { dailyRate: Number(item.pricing.daily_rate), totalRental: Number(item.pricing.total_rental), deposit: Number(item.deposit.amount), deliveryPickup: Number(item.pricing.delivery_fee || 0), deliveryReturn: Number(item.pricing.return_fee || 0), totalDelivery: Number(item.pricing.delivery_fee || 0) + Number(item.pricing.return_fee || 0), grandTotal: Number(item.pricing.total_payable || item.pricing.total_rental) },
      timestamp: item.start_at,
      personalInfo: item.entry_type === 'block' ? { notes: item.operator_details?.note } : undefined,
    },
  };
}

export function calendarLogistics(item: ParkBooking): LogisticsDate {
  return { booking_id: item.id, car_id: item.asset_id, car_name: item.pricing.asset_name,
    pickup_date: `${item.pricing.start_date}T${item.pricing.pickup?.time || '00:00'}:00`, return_date: `${item.pricing.end_date}T${item.pricing.pickup?.return_time || item.pricing.pickup?.time || '00:00'}:00`, client_name: item.operator_details?.customer_name || item.customer?.name || '', return_location: item.pricing.pickup?.return_location ? item.pricing.pickup.return_address || pickupLabels[item.pricing.pickup.return_location] : undefined, location: item.pricing.pickup ? item.pricing.pickup.address || pickupLabels[item.pricing.pickup.location] : '' };
}

export function calendarBookingWithAsset(item: ParkBooking, asset?: PlatformAsset): Booking {
  const booking = calendarBooking(item);
  booking.form_data.car.brand = String(asset?.specs.brand || '');
  booking.form_data.car.model = String(asset?.specs.model || '');
  return booking;
}

export function calendarCars(assets: PlatformAsset[], bookings: ParkBooking[]): Car[] {
  const names = new Map(assets.map(asset => [asset.id, asset.name]));
  // Archived cars still have bookings: keep their historical rows visible.
  for (const item of bookings) if (!names.has(item.asset_id)) names.set(item.asset_id, item.pricing.asset_name || item.asset_id);
  return [...names].map(([id, name]) => ({ id, name, class: '', brand: '', model: '', year: '', color: '', available: true,
    photos: { main: '', gallery: [] }, specs: { fuel: '', engine: '', power: '', transmission: '' }, supplier: '', rating: 0,
    pricing: { low_season: { price_1_6: 0, price_7_14: 0, price_15_29: 0, price_30: 0 }, high_season: { price_1_6: 0, price_7_14: 0, price_15_29: 0, price_30: 0 }, deposit: 0 } }));
}

export function bookingsOnDay(bookings: ParkBooking[], day: string): ParkBooking[] {
  // Include return events, but the occupancy range itself remains [start, end).
  return bookings.filter(item => item.status !== 'cancelled' && item.pricing.start_date <= day && item.pricing.end_date >= day);
}

export function timetableCellBooking(bookings: ParkBooking[], assetId: string, day: string): ParkBooking | undefined {
  return bookingsOnDay(bookings, day).find(item => item.asset_id === assetId);
}
