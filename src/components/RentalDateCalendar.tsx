import { startOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { DrawerFooter } from '@/components/ui/drawer';

export function RentalDateCalendar({ dateRange, setDateRange, onApply, onCancel, isMobile, t, minimumDate = startOfDay(new Date()), allowSameDay = true }: {
  dateRange: DateRange | undefined;
  setDateRange: (range: DateRange | undefined) => void;
  onApply: () => void;
  onCancel: () => void;
  isMobile: boolean;
  t: (key: string) => string;
  minimumDate?: Date;
  allowSameDay?: boolean;
}) {
  const complete = Boolean(dateRange?.from && dateRange.to && (allowSameDay || dateRange.to > dateRange.from));
  return <>
    <div className="flex justify-center"><Calendar mode="range" selected={dateRange} onSelect={setDateRange}
      disabled={(date) => date < minimumDate} initialFocus numberOfMonths={isMobile ? 1 : 2} fromMonth={minimumDate} /></div>
    <DrawerFooter className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-center">
      <Button type="button" variant="outline" onClick={onCancel}>{t('cancel')}</Button>
      <Button type="button" onClick={onApply} disabled={!complete}>{t('select_dates')}</Button>
    </DrawerFooter>
  </>;
}
