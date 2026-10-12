export interface ParkPickup { time: string; location: 'airport' | 'city' | 'self_pickup'; address: string }
export const pickupLabels = { airport: 'Аэропорт', city: 'Город', self_pickup: 'Самовывоз' };
export function validParkPickup(pickup: ParkPickup): boolean {
  return /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(pickup.time)
    && pickup.address.length <= 500;
}
