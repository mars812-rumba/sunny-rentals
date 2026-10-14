import { useState } from 'react';
import { Rocket, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { archivePlatformTenant, publishPlatformTenant, type PlatformTenant } from '@/api/platform-admin';

export function PlatformTenantActions({ tenant, onChanged, onArchived, hidePublish = false, disabled = false }: {
  tenant: PlatformTenant; onChanged?: (tenant: PlatformTenant) => void; onArchived: () => void; hidePublish?: boolean; disabled?: boolean;
}) {
  const [action, setAction] = useState<'publish' | 'archive' | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const draft = tenant.status === 'draft';
  const publishLabel = draft ? 'Опубликовать' : 'Опубликовать заново';
  const choose = (value: 'publish' | 'archive') => { setError(''); setAction(value); };
  const submit = async () => {
    if (!action || busy) return;
    setBusy(true); setError('');
    try {
      if (action === 'archive') { await archivePlatformTenant(tenant.tenant_id); onArchived(); }
      else { const updated = await publishPlatformTenant(tenant.tenant_id); onChanged?.(updated); }
      setAction(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Не удалось выполнить действие. Повторите попытку.'); }
    finally { setBusy(false); }
  };
  return <>
    <div className="flex flex-wrap items-center gap-2">
      {!hidePublish && ['draft', 'trial', 'active'].includes(tenant.status) && <Button type="button" variant="outline" className="min-h-11 gap-2" disabled={busy || disabled} onClick={() => choose('publish')}><Rocket aria-hidden="true" className="size-4" />{publishLabel}</Button>}
      <Button type="button" variant="outline" className="min-h-11 gap-2 border-red-200 text-red-700 hover:bg-red-50" disabled={busy || disabled} onClick={() => choose('archive')}><Trash2 aria-hidden="true" className="size-4" />Удалить парк</Button>
    </div>
    <AlertDialog open={!!action} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
      <AlertDialogContent aria-busy={busy}>
        <AlertDialogHeader>
          <AlertDialogTitle>{action === 'archive' ? 'Удалить парк' : publishLabel} «{tenant.name}»?</AlertDialogTitle>
          <AlertDialogDescription>{action === 'archive'
            ? 'Парк будет перемещён в архив и исчезнет из активного списка. Витрина и доступ владельца будут отключены. Машины, брони и история сохранятся; текущие брони не отменяются автоматически.'
            : draft ? 'Парк станет публичным, начнётся его настроенный пробный период.'
            : 'Проверим статус публикации парка. Срок триала, машины и брони не изменятся. Это не сборка сайта и не настройка серверных маршрутов.'}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Отмена</AlertDialogCancel>
          <AlertDialogAction disabled={busy || disabled} className={action === 'archive' ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'} onClick={event => { event.preventDefault(); void submit(); }}>{busy ? 'Сохраняем…' : action === 'archive' ? 'Удалить в архив' : publishLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}
