import { forwardRef, type InputHTMLAttributes } from 'react';
import { CalendarDays } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useParkLocale } from '@/contexts/park-locale';
import { cn } from '@/lib/utils';
import { openParkDatePicker } from '@/lib/park-date-picker';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value'> & { value: string };

// The real date input covers the field: native validation, labels and keyboard
// access are preserved, while the visible date follows the app's RU/EN locale.
export const ParkDateField = forwardRef<HTMLInputElement, Props>(({ value, className, disabled, ...props }, ref) => {
  const { pt, dateLocale } = useParkLocale();
  const date = value ? parseISO(value) : null;
  const display = date && isValid(date) ? format(date, 'd MMM yyyy', { locale: dateLocale }) : pt('Выберите дату');
  return <div className={cn('relative flex h-11 min-w-0 items-center gap-2 rounded-md border border-slate-300 bg-white px-2 text-sm focus-within:ring-2 focus-within:ring-blue-700 focus-within:ring-offset-2', disabled && 'opacity-50', className)}>
    <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-blue-700" />
    <span aria-hidden="true" className={cn('min-w-0 truncate', value ? 'text-slate-900' : 'text-slate-600')}>{display}</span>
    <input {...props} ref={ref} type="date" value={value} disabled={disabled} title={display}
      className="absolute inset-0 h-full w-full min-w-0 cursor-pointer text-base opacity-0 disabled:cursor-not-allowed"
      onClick={event => { props.onClick?.(event); if (!event.defaultPrevented) openParkDatePicker(event.currentTarget); }}
      onKeyDown={event => { props.onKeyDown?.(event); if (!event.defaultPrevented && (event.key === 'Enter' || event.key === ' ') && openParkDatePicker(event.currentTarget)) event.preventDefault(); }}
    />
  </div>;
});
ParkDateField.displayName = 'ParkDateField';
