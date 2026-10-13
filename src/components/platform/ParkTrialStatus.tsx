import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import type { PlatformTenant } from '@/api/platform-admin';
import { Clock3 } from 'lucide-react';
import { parkDateDisplay } from '@/lib/park-rental';

export function ParkTrialStatus({ tenant }: { tenant: PlatformTenant }) {
  const { pt, intlLocale } = useParkLocale();
  const trial = tenant.trial;
  if (!trial) return null;
  const display = (value: string) => parkDateDisplay(new Date(value), intlLocale, 'long', tenant.timezone);
  return <p className="mt-2 flex items-center gap-2 text-sm tabular-nums text-slate-600"><Clock3 aria-hidden="true" className="h-4 w-4 shrink-0" />
    {trial.status === 'draft' ? pt("Триал {0} дней начнётся при публикации парка.", [trial.days])
      : trial.status === 'trialing' && trial.ends_at ? `${trial.expired ? pt("Триал завершён") : pt("Триал до")} ${display(trial.ends_at)}`
        : pt("Подписка: {0}.", [trial.status === 'active' ? pt("активна") : trial.status])}
  </p>;
}
