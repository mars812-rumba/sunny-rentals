import type { PlatformTenant } from '@/api/platform-admin';
import { Clock3 } from 'lucide-react';

export function ParkTrialStatus({ tenant }: { tenant: PlatformTenant }) {
  const trial = tenant.trial;
  if (!trial) return null;
  const display = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeZone: tenant.timezone }).format(new Date(value));
  return <p className="mt-2 flex items-center gap-2 text-sm tabular-nums text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
    {trial.status === 'draft' ? `Триал ${trial.days} дней начнётся при публикации парка.`
      : trial.status === 'trialing' && trial.ends_at ? `${trial.expired ? 'Триал завершён' : 'Триал до'} ${display(trial.ends_at)}`
        : `Подписка: ${trial.status === 'active' ? 'активна' : trial.status}.`}
  </p>;
}
