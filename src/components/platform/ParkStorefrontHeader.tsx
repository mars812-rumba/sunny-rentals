import type { ReactNode } from 'react';
import { Store } from 'lucide-react';
import { ParkLanguageSwitcher } from '@/contexts/ParkLocaleContext';

export function ParkStorefrontHeader({ name, logo }: { name: string; logo?: ReactNode }) {
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-950">
    <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 text-left sm:px-6 lg:px-8">
      <div className="size-11 shrink-0 overflow-hidden rounded-lg">{logo || <span role="img" aria-label={name} className="grid h-full w-full place-items-center bg-blue-50 text-blue-700"><Store aria-hidden="true" className="size-6" /></span>}</div>
      <div className="ml-auto"><ParkLanguageSwitcher compact /></div>
    </div>
  </header>;
}
