import { CalendarDays, CarFront, ClipboardList } from 'lucide-react';
import { useParkLocale } from '@/contexts/park-locale';

export type ParkWorkspaceSection = 'calendar' | 'requests' | 'fleet';
const screens = [
  ['calendar', 'Календарь', CalendarDays],
  ['requests', 'Заявки', ClipboardList],
  ['fleet', 'Автопарк', CarFront],
] as const;

export function ParkWorkspaceNavigation({ section, onSelect }: { section: ParkWorkspaceSection; onSelect: (section: ParkWorkspaceSection) => void }) {
  const { pt } = useParkLocale();
  return <nav aria-label={pt('Управление парком')} className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-1 border-t border-slate-200 bg-white px-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 md:static md:mx-auto md:w-full md:max-w-xl md:rounded-xl md:border-0 md:bg-slate-200/70 md:p-1">
    {screens.map(([value, label, Icon]) => <button key={value} type="button" aria-current={section === value ? 'page' : undefined} onClick={() => onSelect(value)} className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 aria-[current=page]:bg-blue-50 aria-[current=page]:text-blue-700 md:min-h-12 md:flex-row md:gap-2 md:text-sm md:aria-[current=page]:bg-blue-700 md:aria-[current=page]:text-white"><Icon aria-hidden="true" className="size-5 shrink-0" /><span className="max-w-full break-words">{pt(label)}</span></button>)}
  </nav>;
}
