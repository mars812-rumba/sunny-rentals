import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchParkBotLink, ParkIdentity, verifyParkTelegramIdentity } from '@/api/park-telegram';
import { ParkOwnerFleet } from './ParkOwnerFleet';
import { resolveParkEntryView, type ParkView } from '@/lib/park-entry';

export function ParkTelegramEntry({ tenantId, ownerEntry = false, view = 'client', onViewChange }: { tenantId: string; ownerEntry?: boolean; view?: ParkView; onViewChange?: (view: ParkView) => void }) {
  const [link, setLink] = useState('');
  const [identity, setIdentity] = useState<ParkIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  const ownerControls = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ownerEntry || identity?.role !== 'owner') return;
    ownerControls.current?.querySelector<HTMLButtonElement>(view === 'client' ? 'button' : 'div:not([hidden]) button')?.focus();
  }, [view, identity, ownerEntry]);
  useEffect(() => {
    const controller = new AbortController();
    setLink(''); setIdentity(null); setError(''); setLoading(true);
    if (ownerEntry && window.Telegram?.WebApp?.initData) onViewChange?.('checking');
    const load = async () => {
      try {
        const url = await fetchParkBotLink(tenantId, controller.signal);
        if (controller.signal.aborted) return;
        setLink(url);
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          const verified = await verifyParkTelegramIdentity(tenantId, initData, controller.signal);
          if (!controller.signal.aborted) {
            setIdentity(verified);
            onViewChange?.(resolveParkEntryView(ownerEntry, verified.role));
          }
        } else {
          onViewChange?.('client');
        }
      } catch (failure) {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Не удалось проверить Telegram. Повторите попытку.');
          onViewChange?.('client');
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [tenantId, reload, onViewChange, ownerEntry]);

  if (resolveParkEntryView(ownerEntry, identity?.role) === 'owner') return <section ref={ownerControls} aria-label={view === 'client' ? 'Просмотр клиентской витрины' : 'Кабинет владельца'} className="py-4">
    {view === 'client' && <Button variant="outline" className="min-h-11 gap-2 rounded-lg" onClick={() => onViewChange?.('owner')}><ArrowLeft aria-hidden="true" className="h-4 w-4" />Вернуться в кабинет</Button>}
    <div hidden={view !== 'owner'}>
      <ParkOwnerFleet key={`fleet-${tenantId}`} tenantId={tenantId} onViewStorefront={() => onViewChange?.('client')} />
    </div>
  </section>;

  return <section aria-labelledby="park-telegram-entry" aria-busy={loading} className="mt-5 px-1 py-2">
    <h2 id="park-telegram-entry" className="font-semibold">{identity ? 'Telegram подключён к этому парку' : 'Открыть парк в Telegram'}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">{identity ? 'Ваш аккаунт подтверждён сервером. Откройте карточку транспорта, чтобы отправить заявку. Диалоги с менеджером пока не подключены.' : 'Запустите бота, затем нажмите «Открыть витрину» в его сообщении. Каталог можно смотреть и без Telegram.'}</p>
    {loading && <p role="status" className="mt-3 text-sm text-slate-600">Проверяем подключение…</p>}
    {!loading && link && !identity && <Button asChild variant="outline" className="mt-3"><a href={link} target="_blank" rel="noopener noreferrer" onClick={(event) => {
      const telegram = window.Telegram?.WebApp;
      if (telegram?.openTelegramLink) {
        try { telegram.openTelegramLink(link); event.preventDefault(); } catch { /* Native link remains a fallback. */ }
      }
    }}>Открыть бота парка</a></Button>}
    {error && <div className="mt-3"><p role="alert" className="text-sm text-rose-800">{error}</p><Button variant="outline" className="mt-3" onClick={() => setReload((value) => value + 1)}>Повторить проверку</Button></div>}
  </section>;
}
