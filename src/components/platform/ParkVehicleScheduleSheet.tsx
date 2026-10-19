import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useParkLocale } from '@/contexts/park-locale';
import type { PlatformAsset } from '@/api/platform-admin';
import type { ParkBooking } from '@/api/park-telegram';
import { dateLabel } from '@/lib/park-rental';
import { ParkFormSheet, ParkFormSheetContent } from './ParkFormSheet';
import { ParkCalendarPhoto } from './ParkCalendarPhoto';

export function scheduleVehicle(assets: PlatformAsset[], bookings: ParkBooking[], assetId: string, tenantId: string): PlatformAsset | undefined {
  const asset = assets.find(item => item.id === assetId);
  if (asset) return asset;
  const historical = bookings.find(item => item.asset_id === assetId);
  return historical ? { id: assetId, tenant_id: tenantId, name: historical.pricing.asset_name || assetId,
    asset_type: 'car', public: false, photos: {}, specs: {}, pricing: {}, deposit_policy: {} } : undefined;
}

export function vehicleSchedule(bookings: ParkBooking[], assetId: string): ParkBooking[] {
  return bookings.filter(item => item.asset_id === assetId && !['cancelled', 'rejected'].includes(item.status))
    .sort((a, b) => Date.parse(a.start_at) - Date.parse(b.start_at) || a.id.localeCompare(b.id));
}

const labels: Record<string, string> = {
  requested: 'Ожидает подтверждения', confirmed: 'Подтверждено', in_progress: 'В аренде',
  completed: 'Завершено', cancellation_requested: 'Запрошена отмена', draft: 'Черновик',
};

export function ParkVehicleScheduleDetails({ asset, bookings, tenantId, admin }: {
  asset: PlatformAsset; bookings: ParkBooking[]; tenantId: string; admin: boolean;
}) {
  const { pt, intlLocale } = useParkLocale();
  const photos = [...new Set([asset.photos?.main, ...(asset.photos?.gallery || [])].filter((value): value is string => !!value))];
  const schedule = vehicleSchedule(bookings, asset.id);
  const time = (booking: ParkBooking, end: boolean) => {
    const pickup = booking.pricing.pickup;
    const explicit = end ? pickup?.return_time : pickup?.time;
    if (explicit) return explicit;
    const value = new Date(end ? booking.end_at : booking.start_at);
    return Number.isNaN(value.getTime()) ? '—' : new Intl.DateTimeFormat(intlLocale, {
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: booking.pricing.timezone || 'Asia/Bangkok',
    }).format(value);
  };
  return <>
    <section aria-label={pt('Фотографии машины')}>
      {photos.length ? <ul tabIndex={0} aria-label={pt('Фотографии машины')} className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">
        {photos.map((reference, index) => <li key={reference} aria-label={pt('Фото {0} из {1}', [String(index + 1), String(photos.length)])} className="aspect-video w-[85%] shrink-0 snap-start overflow-hidden rounded-xl bg-slate-100 sm:w-80">
          <ParkCalendarPhoto tenantId={tenantId} reference={reference} admin={admin} />
        </li>)}
      </ul> : <p className="text-sm text-slate-600">{pt('Фото пока нет')}</p>}
    </section>
    <section>
      <h3 className="text-base font-semibold">{pt('Брони автомобиля')}</h3>
      {!schedule.length ? <p className="mt-2 text-sm text-slate-600">{pt('У этого автомобиля пока нет броней.')}</p> :
        <ol className="mt-2 divide-y divide-slate-200">{schedule.map(booking => <li key={booking.id} className="py-4 first:pt-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
            <p className="font-medium">{booking.entry_type === 'block' ? pt('Блокировка занятости') : pt('Бронь №{0}', [booking.booking_number || booking.id])}</p>
            <p className="text-slate-600">{pt(labels[booking.status] || booking.status)}</p>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm tabular-nums">
            <dt className="text-slate-600">{pt('Выдача')}</dt><dd className="min-w-0 break-words">{dateLabel(booking.pricing.start_date)} · {time(booking, false)}</dd>
            <dt className="text-slate-600">{pt('Возврат')}</dt><dd className="min-w-0 break-words">{dateLabel(booking.pricing.end_date)} · {time(booking, true)}</dd>
          </dl>
          {(booking.customer?.name || booking.operator_details?.customer_name) && <p className="mt-2 break-words text-sm">{pt('Клиент: ')}{booking.customer?.name || booking.operator_details?.customer_name}</p>}
        </li>)}</ol>}
    </section>
  </>;
}

export function ParkVehicleScheduleSheet({ asset, bookings, tenantId, admin, onClose }: {
  asset: PlatformAsset; bookings: ParkBooking[]; tenantId: string; admin: boolean; onClose: () => void;
}) {
  const { pt } = useParkLocale();
  return <ParkFormSheet open onOpenChange={open => { if (!open) onClose(); }}>
    <ParkFormSheetContent aria-describedby={undefined} className="park-vehicle-schedule-sheet" closeButtonClassName="flex" header={
      <DialogHeader className="pr-10 text-left"><DialogTitle className="break-words">{asset.name}</DialogTitle>
        {asset.license_plate && <p className="text-sm text-slate-600">{pt('Госномер')}: {asset.license_plate}</p>}
      </DialogHeader>
    }>
      <ParkVehicleScheduleDetails asset={asset} bookings={bookings} tenantId={tenantId} admin={admin} />
    </ParkFormSheetContent>
  </ParkFormSheet>;
}
