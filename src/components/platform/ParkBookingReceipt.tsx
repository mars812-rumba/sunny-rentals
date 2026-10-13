import { CalendarDays, CarFront, CircleCheck, Clock3, WalletCards } from 'lucide-react';
import type { ParkBooking } from '@/api/park-telegram';
import { useParkLocale } from '@/contexts/park-locale';
import { dateLabel, rentalMoney } from '@/lib/park-rental';

// Compact receipt; the containing Dialog owns the title, focus and close action.
export function ParkBookingReceipt({ booking }: { booking: ParkBooking }) {
  const { pt } = useParkLocale();
  return <div className="space-y-3">
    <p className="flex items-center gap-2 rounded-lg bg-emerald-50 p-3 font-semibold text-emerald-950"><CircleCheck aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />{pt('Номер: ')}<span className="break-all select-all">{booking.booking_number || booking.id}</span></p>
    <p className="flex items-start gap-2 font-semibold"><CarFront aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-blue-700" />{booking.pricing.asset_name}</p>
    <p className="flex items-start gap-2 text-sm leading-6"><CalendarDays aria-hidden="true" className="mt-1 size-4 shrink-0 text-blue-700" /><span>{dateLabel(booking.pricing.start_date)} — {dateLabel(booking.pricing.end_date)}<span className="block text-slate-600">{booking.pricing.days} {pt(' суток', [booking.pricing.days])}</span></span></p>
    <dl className="space-y-2 rounded-lg bg-blue-50 p-3 text-sm tabular-nums text-blue-950"><div className="flex flex-wrap justify-between gap-2"><dt>{pt('Итого аренда и доставка: ')}</dt><dd className="font-semibold">{rentalMoney(booking.pricing.total_payable ?? booking.pricing.total_rental, booking.currency)}</dd></div><div className="flex flex-wrap justify-between gap-2"><dt className="flex items-center gap-2"><WalletCards aria-hidden="true" className="size-4" />{pt('Возвратный депозит отдельно')}</dt><dd className="font-medium">{rentalMoney(booking.deposit.amount, booking.currency)}</dd></div></dl>
    <p className="flex items-start gap-2 rounded-lg bg-purple-50 p-3 text-sm leading-6 text-purple-950"><Clock3 aria-hidden="true" className="mt-1 size-4 shrink-0 text-purple-700" />{pt('Ожидает подтверждения парком — это ещё не подтверждённая бронь.')}</p>
  </div>;
}
