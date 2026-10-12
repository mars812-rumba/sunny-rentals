import { isSameDay } from 'date-fns';

export function schedulerInitialOffset(dates: Date[], focusDate: Date | undefined, dayWidth: number): number {
  const index = focusDate ? dates.findIndex(date => isSameDay(date, focusDate)) : -1;
  return (index >= 0 ? index : 7) * dayWidth;
}

export function timetableFocusDay(month: string, parkToday: string): string {
  return parkToday.slice(0, 7) === month ? parkToday : `${month}-01`;
}
