export function CRMStatusButton({ label, count, unread, active, onSelect }: { label: string; count: number; unread: number; active: boolean; onSelect: () => void }) {
  return <button type="button" onClick={onSelect} aria-pressed={active}
    aria-label={`${label}: лидов ${count}, чатов с непрочитанными ${unread}`}
    className={`relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl bg-white p-1.5 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${active ? 'ring-2 ring-blue-500' : 'hover:bg-slate-100'}`}>
    <span className="text-[7px] font-bold uppercase tracking-tighter text-slate-500">{label}</span>
    <span className="text-sm font-black leading-none text-slate-800">{count}</span>
    {unread > 0 && <span aria-hidden="true" title={`Чатов с непрочитанными: ${unread}`} className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-700 px-1 text-center text-[9px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}
  </button>;
}
