import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import type { TariffBreakdown } from '@/api/park-telegram';
import { rentalMoney } from '@/lib/park-rental';

export function ParkTariffBreakdown({ items, currency }: { items?: TariffBreakdown[]; currency: string }) {
  const { pt, intlLocale } = useParkLocale();
  if (!items?.length) return null;
  return <ul className="mt-3 space-y-2 text-sm tabular-nums text-slate-700" aria-label={pt("Расчёт по сезонам")}>{items.map(item => <li key={item.season} className="flex flex-wrap justify-between gap-2"><span>{item.season === 'high_season' ? pt("Высокий сезон") : pt("Низкий сезон")}: {item.days} {pt(" суток × ")}{rentalMoney(item.daily_rate, currency)}</span><span className="font-medium">{rentalMoney(item.subtotal, currency)}</span></li>)}</ul>;
}
