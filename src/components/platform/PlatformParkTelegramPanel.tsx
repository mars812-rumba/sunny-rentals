import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlatformTenant } from '@/api/platform-admin';
import { createParkOwnerInvitation, fetchParkBotLink, ParkInvitation, revokeParkOwnerInvitation } from '@/api/park-telegram';

const failureText = (error: unknown) => error instanceof Error ? error.message : 'Не удалось подготовить ссылку. Повторите попытку.';

export function PlatformParkTelegramPanel({ tenant }: { tenant: PlatformTenant }) {
  const [invitation, setInvitation] = useState<ParkInvitation | null>(null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [clientLink, setClientLink] = useState('');
  const linkInput = useRef<HTMLInputElement>(null);
  const remaining = Math.max(0, Math.ceil((expiresAt - now) / 60000));
  const enabled = ['draft', 'trial', 'active'].includes(tenant.status);
  useEffect(() => {
    if (!invitation) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [invitation]);

  const create = async () => {
    setBusy(true); setError(''); setStatus('');
    try {
      const result = await createParkOwnerInvitation(tenant.tenant_id);
      setInvitation(result); setNow(Date.now()); setExpiresAt(Date.now() + result.expires_in * 1000);
      setStatus('Приглашение готово. Передайте ссылку лично владельцу.');
    } catch (error) { setError(failureText(error)); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!invitation) return;
    setBusy(true); setError(''); setStatus('');
    try {
      await revokeParkOwnerInvitation(tenant.tenant_id, invitation.invitation_id);
      setInvitation(null); setStatus('Приглашение отозвано. Ранее выданный доступ владельца не изменён.');
    } catch (error) { setError(failureText(error)); }
    finally { setBusy(false); }
  };
  const copy = async () => {
    if (!invitation || Date.now() >= expiresAt) { setNow(Date.now()); return; }
    setError(''); setStatus('');
    try { await navigator.clipboard.writeText(invitation.url); setStatus('Ссылка скопирована. Отправьте её лично владельцу.'); }
    catch { linkInput.current?.focus(); linkInput.current?.select(); setError('Автоматическое копирование недоступно. Скопируйте выделенную ссылку вручную.'); }
  };
  const prepareClientLink = async () => {
    setBusy(true); setError(''); setStatus('');
    try { setClientLink(await fetchParkBotLink(tenant.tenant_id)); }
    catch (error) { setError(failureText(error)); }
    finally { setBusy(false); }
  };

  return <section aria-labelledby="park-telegram-title" aria-busy={busy} className="mt-7 rounded-2xl bg-white p-5">
    <h2 id="park-telegram-title" className="text-xl font-semibold">Telegram парка</h2>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Личное приглашение подключает владельца без запроса его Telegram ID. Клиентская ссылка открывает витрину и не даёт доступа к управлению.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => void create()} disabled={busy || !enabled || Boolean(invitation && remaining)}>{busy ? 'Выполняем запрос…' : 'Подготовить приглашение владельца'}</Button>
      {['trial', 'active'].includes(tenant.status) && <Button variant="outline" disabled={busy} onClick={() => void prepareClientLink()}>Подготовить клиентскую ссылку</Button>}
    </div>
    {!enabled && <p className="mt-2 text-sm text-slate-600">Приглашения доступны только для черновиков и действующих парков.</p>}
    {invitation && <div className="mt-5 space-y-3">
      <label htmlFor="park-owner-invite" className="block text-sm font-medium">Личное приглашение владельца</label>
      <Input ref={linkInput} id="park-owner-invite" readOnly value={invitation.url} onFocus={(event) => event.target.select()} aria-describedby="park-invite-hint" />
      <p id="park-invite-hint" className="text-sm text-slate-600">{remaining ? `Действует ещё ${remaining} мин. и используется один раз.` : 'Срок приглашения истёк. Подготовьте новое.'} Не отправляйте ссылку в общую группу: доступ получает первый открывший.</p>
      <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy || !remaining} onClick={() => void copy()}>Скопировать приглашение</Button><Button variant="outline" disabled={busy} onClick={() => void revoke()}>Отозвать приглашение</Button></div>
      <p className="text-sm text-slate-600">Отзыв ссылки не отключает уже подключённого владельца. Календарь парка доступен владельцу на витрине после проверки Telegram.</p>
    </div>}
    {clientLink && <div className="mt-5"><label htmlFor="park-client-link" className="block text-sm font-medium">Клиентская ссылка на бот</label><Input id="park-client-link" className="mt-2" readOnly value={clientLink} onFocus={(event) => event.target.select()} /><a href={clientLink} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-blue-700 underline underline-offset-4 focus-visible:outline focus-visible:outline-2">Открыть парк в Telegram</a></div>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-800">{error}</p>}
    <p role="status" aria-live="polite" className="mt-3 text-sm text-slate-700">{status}</p>
  </section>;
}
