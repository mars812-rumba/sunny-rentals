import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { fetchParkBotLink, ParkIdentity, verifyParkTelegramIdentity } from '@/api/park-telegram';
import { ParkBookingCalendar } from './ParkBookingCalendar';

export function ParkTelegramEntry({ tenantId }: { tenantId: string }) {
  const [link, setLink] = useState('');
  const [identity, setIdentity] = useState<ParkIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLink(''); setIdentity(null); setError(''); setLoading(true);
    const load = async () => {
      try {
        const url = await fetchParkBotLink(tenantId, controller.signal);
        if (controller.signal.aborted) return;
        setLink(url);
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          const verified = await verifyParkTelegramIdentity(tenantId, initData, controller.signal);
          if (!controller.signal.aborted) setIdentity(verified);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Не удалось проверить Telegram. Повторите попытку.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [tenantId, reload]);

  return <section aria-labelledby="park-telegram-entry" aria-busy={loading} className="mt-5 rounded-xl bg-white p-4 shadow-soft">
    <h2 id="park-telegram-entry" className="font-semibold">{identity ? 'Telegram подключён к этому парку' : 'Открыть парк в Telegram'}</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">{identity ? identity.role === 'owner' ? 'Ваш доступ владельца подтверждён сервером. Ниже — заявки этого парка.' : 'Ваш аккаунт подтверждён сервером. Откройте карточку транспорта, чтобы отправить заявку. Диалоги с менеджером пока не подключены.' : 'Запустите бота, затем нажмите «Открыть витрину» в его сообщении. Каталог можно смотреть и без Telegram.'}</p>
    {loading && <p role="status" className="mt-3 text-sm text-slate-600">Проверяем подключение…</p>}
    {!loading && link && !identity && <Button asChild variant="outline" className="mt-3"><a href={link} target="_blank" rel="noopener noreferrer" onClick={(event) => {
      const telegram = window.Telegram?.WebApp;
      if (telegram?.openTelegramLink) {
        try { telegram.openTelegramLink(link); event.preventDefault(); } catch { /* Native link remains a fallback. */ }
      }
    }}>Открыть бота парка</a></Button>}
    {error && <div className="mt-3"><p role="alert" className="text-sm text-rose-800">{error}</p><Button variant="outline" className="mt-3" onClick={() => setReload((value) => value + 1)}>Повторить проверку</Button></div>}
    {identity?.role === 'owner' && <ParkBookingCalendar key={tenantId} tenantId={tenantId} />}
  </section>;
}
