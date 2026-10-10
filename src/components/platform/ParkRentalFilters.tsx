import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarDays, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RentalDateCalendar } from '@/components/RentalDateCalendar';
import { useIsMobile } from '@/hooks/use-mobile';
import { dateLabel, parkToday, ParkRentalPeriod, rentalDays } from '@/lib/park-rental';

const parkAssetTypes: Record<string, string> = {
  car: 'Автомобили', scooter: 'Электросамокаты', motorcycle: 'Мотоциклы / скутеры',
  bicycle: 'Велосипеды', snowmobile: 'Снегоходы', other: 'Другой транспорт',
};

export function ParkRentalFilters({ period, onPeriodChange, search, onSearchChange, type, onTypeChange, types, timezone, datesEnabled }: {
  period: ParkRentalPeriod | null; onPeriodChange: (period: ParkRentalPeriod | null) => void;
  search: string; onSearchChange: (value: string) => void;
  type: string; onTypeChange: (value: string) => void; types: string[];
  timezone: string; datesEnabled: boolean;
}) {
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
    if (days < 1 || days > 365) { setError('Выберите период от 1 до 365 суток.'); return; }
    onPeriodChange(next); setOpen(false);
  };
  return <section aria-labelledby="park-filters-title" className="relative -mt-6 rounded-xl bg-white p-5 shadow-soft sm:p-6">
    <h2 id="park-filters-title" className="text-lg font-semibold">Подберите транспорт</h2>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      {datesEnabled && minimumDate && <div><p className="mb-2 text-sm font-medium">Даты аренды</p><Dialog open={open} onOpenChange={(value) => {
        if (value) { setRange(period ? { from: parseISO(period.start), to: parseISO(period.end) } : undefined); setError(''); }
        setOpen(value);
      }}>
        <DialogTrigger asChild><Button variant="outline" className="min-h-12 w-full justify-start whitespace-normal rounded-xl text-left"><CalendarDays aria-hidden="true" className="mr-2 shrink-0" />{period ? `${dateLabel(period.start)} — ${dateLabel(period.end)} · ${rentalDays(period)} суток` : 'Выберите получение и возврат'}</Button></DialogTrigger>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl p-4 sm:p-6">
          <DialogTitle>Даты аренды</DialogTitle>
          <DialogDescription>Часовой пояс: {timezone}. День возврата не оплачивается. Период — от 1 до 365 суток.</DialogDescription>
          <RentalDateCalendar dateRange={range} setDateRange={(value) => { setRange(value); setError(''); }} onApply={apply} onCancel={() => setOpen(false)} isMobile={mobile} minimumDate={minimumDate} allowSameDay={false} t={(key) => key === 'cancel' ? 'Отмена' : 'Показать транспорт'} />
          {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
        </DialogContent>
      </Dialog>{period && <Button type="button" variant="ghost" className="mt-1 text-sm" onClick={() => onPeriodChange(null)}>Смотреть без дат</Button>}</div>}
      <div><label htmlFor="park-search" className="mb-2 block text-sm font-medium">Марка или модель</label><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-4 h-4 w-4 text-slate-500" /><Input id="park-search" value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Например, Toyota Yaris" className="min-h-12 rounded-xl pl-9 text-base" /></div></div>
    </div>
    {datesEnabled && !minimumDate && <p role="alert" className="mt-3 text-sm text-rose-800">Парк ещё не настроил часовой пояс. Поиск по датам временно недоступен.</p>}
    <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Тип транспорта">
      {['all', ...types].map((value) => <Button key={value} type="button" variant={type === value ? 'default' : 'outline'} aria-pressed={type === value} className="min-h-11 rounded-xl" onClick={() => onTypeChange(value)}>{value === 'all' ? 'Весь транспорт' : parkAssetTypes[value] || 'Другой транспорт'}</Button>)}
    </div>
    {datesEnabled && <p className="mt-3 text-sm leading-6 text-slate-600">Выберите даты, чтобы увидеть доступные варианты. В этом парке пока действует базовая цена за сутки; время и доставка отдельно не настроены.</p>}
  </section>;
}
