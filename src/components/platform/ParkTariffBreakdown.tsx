import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import type { TariffBreakdown } from '@/api/park-telegram';
import { rentalMoney } from '@/lib/park-rental';
import { CloudSun, Sun } from 'lucide-react';

export function ParkTariffBreakdown({ items, currency }: { items?: TariffBreakdown[]; currency: string }) {
  const { pt, intlLocale } = useParkLocale();
  if (!items?.length) return null;
  return <ul className="mt-3 space-y-2 text-sm tabular-nums" aria-label={pt("Расчёт по сезонам")}>{items.map(item => { const high = item.season === 'high_season'; const Icon = high ? Sun : CloudSun; return <li key={item.season} className={`flex flex-wrap items-start justify-between gap-2 rounded-lg p-3 ${high ? 'bg-amber-50 text-amber-950' : 'bg-emerald-50 text-emerald-950'}`}><span><span className="flex items-center gap-2 font-medium"><Icon aria-hidden="true" className="size-4 shrink-0" />{high ? pt("Высокий сезон") : pt("Низкий сезон")}</span><span className="mt-1 block">{item.days} {pt(" суток × ")}{rentalMoney(item.daily_rate, currency)}</span></span><span className="font-semibold">{rentalMoney(item.subtotal, currency)}</span></li>; })}</ul>;
}
