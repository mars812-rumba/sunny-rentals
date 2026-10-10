import type { PlatformTenant } from '@/api/platform-admin';

export function ParkTrialStatus({ tenant }: { tenant: PlatformTenant }) {
  const trial = tenant.trial;
  if (!trial) return null;
  const display = (value: string) => new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short', timeZone: tenant.timezone }).format(new Date(value));
  return <p className="mt-2 text-sm tabular-nums text-slate-700">
    {trial.status === 'draft' ? `Триал ${trial.days} дней начнётся при публикации парка.`
      : trial.status === 'trialing' && trial.started_at && trial.ends_at ? `${trial.expired ? 'Триал завершён' : 'Триал идёт'}: ${display(trial.started_at)} — ${display(trial.ends_at)} (${tenant.timezone}).`
        : `Подписка: ${trial.status === 'active' ? 'активна' : trial.status}.`}
  </p>;
}
