import type { ReactNode } from 'react';

export function ParkStorefrontHeader({ name, logo }: { name: string; logo?: ReactNode }) {
  return <header className="sticky top-0 z-30 border-b border-slate-200 bg-white text-slate-950">
    <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 py-2 text-left sm:px-6 lg:px-8">
      {logo && <div className="size-11 shrink-0 overflow-hidden rounded-lg">{logo}</div>}
      <p className="min-w-0 break-words text-lg font-semibold leading-snug">{name}</p>
    </div>
  </header>;
}
