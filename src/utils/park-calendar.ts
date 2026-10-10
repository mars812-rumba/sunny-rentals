import type { Booking, Car, LogisticsDate } from '@/api/api';
import type { PlatformAsset } from '@/api/platform-admin';
import type { ParkBooking } from '@/api/park-telegram';

// A view adapter only: no calls to legacy Sunny APIs, no second booking store.
// Use park-local civil dates, not UTC timestamps converted by the visitor's timezone.
export function calendarBooking(item: ParkBooking): Booking {
  return {
    booking_id: item.id, user_id: '', source: 'telegram_webapp', created_at: item.start_at,
    status: item.status === 'requested' ? 'pre_booking' : ['in_progress', 'completed'].includes(item.status) ? 'confirmed' : item.status,
    form_data: {
      car: { id: item.asset_id, name: item.pricing.asset_name, brand: '', model: '', year: '', color: '' },
      dates: { start: `${item.pricing.start_date}T00:00:00`, end: `${item.pricing.end_date}T00:00:00`, days: item.pricing.days, pickupTime: '', returnTime: '' },
      locations: { pickupLocation: '', returnLocation: '' }, contact: { value: '', type: '' },
      pricing: { dailyRate: Number(item.pricing.daily_rate), totalRental: Number(item.pricing.total_rental), deposit: Number(item.deposit.amount), deliveryPickup: 0, deliveryReturn: 0, totalDelivery: 0, grandTotal: Number(item.pricing.total_rental) },
      timestamp: item.start_at,
    },
  };
}

export function calendarLogistics(item: ParkBooking): LogisticsDate {
  return { booking_id: item.id, car_id: item.asset_id, car_name: item.pricing.asset_name,
    pickup_date: `${item.pricing.start_date}T00:00:00`, return_date: `${item.pricing.end_date}T00:00:00`, client_name: '', location: '' };
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
