import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, ArrowRight, CarFront, Bike, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParkPickupFields } from './ParkPickupFields';
import type { ParkPickup } from '@/lib/park-pickup';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RentalDateCalendar } from '@/components/RentalDateCalendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { dateLabel, parkToday, ParkRentalPeriod, rentalDays } from '@/lib/park-rental';

const parkAssetTypes: Record<string, string> = {
  car: 'Автомобили', scooter: 'Электросамокаты', motorcycle: 'Мотоциклы / скутеры',
  bicycle: 'Велосипеды', snowmobile: 'Снегоходы', other: 'Другой транспорт',
};

export function ParkRentalFilters({ period, onPeriodChange, pickup, onPickupChange, currency, type, onTypeChange, types, timezone, datesEnabled }: {
  period: ParkRentalPeriod | null; onPeriodChange: (period: ParkRentalPeriod | null) => void;
  pickup: ParkPickup; onPickupChange: (pickup: ParkPickup) => void; currency: string;
  type: string; onTypeChange: (value: string) => void; types: string[];
  timezone: string; datesEnabled: boolean;
}) {
  const { pt, dateLocale } = useParkLocale();
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [error, setError] = useState('');
  const mobile = useIsMobile();
  let minimumDate: Date | undefined;
  try { minimumDate = parseISO(parkToday(timezone)); } catch { /* Fail closed if park timezone is not configured. */ }
  const apply = () => {
    if (!range?.from || !range.to) return;
    const next = { start: format(range.from, 'yyyy-MM-dd'), end: format(range.to, 'yyyy-MM-dd') };
    const days = rentalDays(next);
    if (days < 1 || days > 365) { setError(pt("Выберите период от 1 до 365 суток.")); return; }
    onPeriodChange(next); setOpen(false);
  };
  return <section id="park-rental-filters" tabIndex={-1} aria-labelledby="park-filters-title" className="relative -mt-6 rounded-xl bg-white p-5 shadow-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700 sm:p-6">
    <h2 id="park-filters-title" className="text-lg font-semibold">{pt("Подберите транспорт")}</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {datesEnabled && minimumDate && <div><p className="mb-2 text-sm font-medium">{pt("Даты аренды")}</p><Dialog open={open} onOpenChange={(value) => {
        if (value) { setRange(period ? { from: parseISO(period.start), to: parseISO(period.end) } : undefined); setError(''); }
        setOpen(value);
      }}>
        <DialogTrigger asChild><Button variant="outline" className="min-h-16 w-full justify-between gap-2 whitespace-normal rounded-xl px-3 py-3 text-left" aria-label={period ? pt("Изменить даты: {0} — {1}", [dateLabel(period.start), dateLabel(period.end)]) : pt("Выбрать даты получения и возврата")}><CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" /><span className="flex-1"><span className="block text-xs font-normal text-slate-600">{pt("Получение")}</span><span className="block">{period ? dateLabel(period.start) : pt("Выберите дату")}</span></span><ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" /><span className="flex-1"><span className="block text-xs font-normal text-slate-600">{pt("Возврат")}</span><span className="block">{period ? dateLabel(period.end) : pt("Выберите дату")}</span></span></Button></DialogTrigger>
        <DialogContent closeLabel={pt("Закрыть")} className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogTitle>{pt("Даты аренды")}</DialogTitle>
          <DialogDescription>{pt("Часовой пояс: ")}{timezone}{pt(". От 1 до 365 оплачиваемых суток. Если время возврата позже времени получения, добавляется 1 сутки.")}</DialogDescription>
          <RentalDateCalendar dateRange={range} setDateRange={(value) => { setRange(value); setError(''); }} onApply={apply} onCancel={() => setOpen(false)} isMobile={mobile} minimumDate={minimumDate} allowSameDay={false} locale={dateLocale} t={(key) => key === 'cancel' ? pt("Отмена") : pt("Показать транспорт")} />
          {error && <p role="alert" className="text-sm text-rose-800">{pt(error)}</p>}
        </DialogContent>
      </Dialog>{period && <Button type="button" variant="ghost" className="mt-1 text-sm" onClick={() => onPeriodChange(null)}>{pt("Смотреть без дат")}</Button>}</div>}
    </div>
    {datesEnabled && <div className="mt-4"><ParkPickupFields id="park-pickup" pickup={pickup} onChange={onPickupChange} currency={currency} /></div>}
    {datesEnabled && !minimumDate && <p role="alert" className="mt-3 text-sm text-rose-800">{pt("Парк ещё не настроил часовой пояс. Поиск по датам временно недоступен.")}</p>}
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={pt("Тип транспорта")}>
      {['all', ...types].map((value) => { const Icon = value === 'all' ? LayoutGrid : value === 'car' ? CarFront : Bike; return <Button key={value} type="button" variant={type === value ? 'default' : 'outline'} aria-pressed={type === value} className="min-h-12 rounded-xl" onClick={() => onTypeChange(value)}><Icon aria-hidden="true" className="mr-2 h-4 w-4" />{value === 'all' ? pt("Весь транспорт") : pt(parkAssetTypes[value] || "Другой транспорт")}</Button>; })}
    </div>
    {datesEnabled && <p className="mt-3 text-sm leading-6 text-slate-600">{pt("Выберите даты, чтобы увидеть доступные варианты. Городская доставка — 500 THB за получение и отдельно 500 THB за возврат.")}</p>}
  </section>;
}
