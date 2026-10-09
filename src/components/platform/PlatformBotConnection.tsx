import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { connectPlatformWebhook, fetchPlatformWebhook, PlatformWebhookStatus } from '@/api/park-telegram';

export function PlatformBotConnection() {
  const [status, setStatus] = useState<PlatformWebhookStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const active = useRef<AbortController | null>(null);

  async function run(connect = false) {
    if (active.current) return;
    if (connect && !window.confirm('Подключить общего бота для всех парков? Очередь сообщений будет сохранена.')) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await (connect ? connectPlatformWebhook(controller.signal) : fetchPlatformWebhook(controller.signal));
      if (!controller.signal.aborted) {
        setStatus(result);
        setMessage(connect ? 'Webhook установлен. Отправьте /start боту и проверьте ответ.' : 'Статус проверен в Telegram.');
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setStatus(null);
        setError(cause instanceof Error ? cause.message : 'Не удалось проверить подключение. Повторите попытку.');
      }
    } finally {
      if (active.current === controller) active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  useEffect(() => () => { active.current?.abort(); }, []);

  const label = !status ? 'Статус не проверен' : status.state === 'configured' ? 'Наш webhook установлен' : status.state === 'other' ? 'Установлен другой webhook' : 'Webhook не установлен';
  return (
    <section aria-labelledby="platform-bot-title" aria-busy={busy} className="mt-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="platform-bot-title" className="text-lg font-semibold">Общий бот парков</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">Одно подключение для всех парков. Клиентская ссылка и приглашение владельца находятся внутри каждого парка.</p>
      <div className="mt-4" role="status">
        <p className="font-medium">{busy ? 'Связываемся с Telegram…' : label}</p>
        {status && <><p className="mt-1 break-all text-sm text-slate-600">@{status.username} · В очереди: {status.pending_updates}</p><p className="mt-1 break-all text-sm text-slate-600">{status.expected_url}</p></>}
        {message && <p className="mt-2 text-sm text-slate-700">{message}</p>}
      </div>
      {status?.state === 'other' && <p className="mt-3 text-sm text-amber-800">Другой адрес не будет заменён. Проверьте, что выбран нужный бот, и разберите прежнее подключение отдельно.</p>}
      {status?.delivery_error && <p className="mt-3 text-sm text-amber-800">Telegram зафиксировал ошибку доставки{status.last_error_at ? ` (${new Date(status.last_error_at * 1000).toLocaleString('ru-RU')})` : ''}. Это может быть прежняя ошибка; проверьте ответ на новую команду /start.</p>}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="outline" disabled={busy} onClick={() => void run()}>Проверить подключение</Button>
        <Button type="button" disabled={busy || !status || status.state === 'other'} onClick={() => void run(true)} className="bg-[#0d1b2a] text-white hover:bg-[#17324a]">{status?.state === 'configured' ? 'Обновить подключение' : 'Подключить бота'}</Button>
      </div>
      {!status && !busy && <p className="mt-2 text-sm text-slate-600">Сначала проверьте статус, затем подключите бота.</p>}
    </section>
  );
}
