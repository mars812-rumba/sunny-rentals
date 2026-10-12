import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { useEffect, useState } from 'react';
import { fetchOwnerFleet } from '@/api/park-owner-fleet';
import type { PlatformTenant } from '@/api/platform-admin';
import { Button } from '@/components/ui/button';
import { PlatformTenantWorkspace } from './PlatformTenantWorkspace';
export function ParkOwnerFleet({ tenantId, onViewStorefront }: { tenantId: string; onViewStorefront?: () => void }) {
  const { pt, intlLocale } = useParkLocale();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [error, setError] = useState(''); const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setTenant(null); setError('');
    fetchOwnerFleet(tenantId, controller.signal).then((result) => { if (!controller.signal.aborted) setTenant(result.tenant); }).catch((failure) => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : parkText("Не удалось открыть автопарк.")); });
    return () => controller.abort();
  }, [tenantId, reload]);
  if (error) return <div role="alert" className="py-4"><p>{pt(error)}</p><Button variant="outline" className="mt-3" onClick={() => setReload((value) => value + 1)}>{pt("Повторить загрузку")}</Button></div>;
  if (!tenant) return <p role="status" className="py-4">{pt("Загружаем ваш автопарк…")}</p>;
  return <PlatformTenantWorkspace key={tenant.tenant_id} tenant={tenant} owner onViewStorefront={onViewStorefront} onBack={() => setReload((value) => value + 1)} onTenantChanged={setTenant} />;
}
