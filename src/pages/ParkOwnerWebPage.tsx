import { parkText } from '@/lib/park-locale';
import { parkText as pt } from '@/lib/park-locale';
import { useParkLocale } from '@/contexts/park-locale';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KeyRound, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlatformTenantWorkspace } from '@/components/platform/PlatformTenantWorkspace';
import { fetchOwnerFleet } from '@/api/park-owner-fleet';
import { ownerWebRequest } from '@/api/park-owner-web';
import type { PlatformTenant } from '@/api/platform-admin';

const message = (error: unknown) => error instanceof Error ? error.message : pt("Не удалось выполнить действие. Повторите попытку.");
const primary = 'min-h-11 bg-blue-700 text-white hover:bg-blue-800';

export default function ParkOwnerWebPage() {
  const { pt, intlLocale } = useParkLocale();
  const { tenantId = '' } = useParams();
  const [tenant, setTenant] = useState<PlatformTenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    let checking = true;
    setTenant(null); setLoading(true); setError(''); setPassword(''); setLogin('');
    fetchOwnerFleet(tenantId, controller.signal).then(result => { if (!controller.signal.aborted) setTenant(result.tenant); })
      .catch(failure => { if (!controller.signal.aborted && !message(failure).includes(parkText("Сессия истекла"))) setError(message(failure)); })
      .finally(() => { checking = false; if (!controller.signal.aborted) setLoading(false); });
    const expired = () => { if (checking) return; setTenant(null); setPasswordOpen(false); setError(parkText("Сессия истекла. Войдите заново.")); };
    window.addEventListener('owner-session-expired', expired);
    return () => { controller.abort(); window.removeEventListener('owner-session-expired', expired); };
  }, [tenantId]);

  async function signIn(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await ownerWebRequest('/login', { tenant_id: tenantId, login, password });
      setPassword('');
      const result = await fetchOwnerFleet(tenantId);
      setTenant(result.tenant); setNotice('');
    } catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try { await ownerWebRequest('/logout', {}); setTenant(null); setPassword(''); setNotice(pt("Вы вышли из кабинета.")); }
    catch (failure) { setError(message(failure)); }
    finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordError('');
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get('new_password'));
    if (newPassword !== form.get('confirm_password')) { setPasswordError(pt("Новые пароли не совпадают.")); return; }
    setBusy(true);
    try {
      await ownerWebRequest('/password', { tenant_id: tenantId, old_password: form.get('old_password'), new_password: newPassword });
      setPasswordOpen(false); setNotice(pt("Пароль изменён. Остальные браузерные сессии завершены."));
    } catch (failure) { setPasswordError(message(failure)); }
    finally { setBusy(false); }
  }

  if (loading) return <p role="status" className="p-8 text-center text-slate-600">{pt("Проверяем вход…")}</p>;

  if (!tenant) return <main className="min-h-screen bg-white px-4 py-12 text-slate-900 sm:py-20">
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">{pt("Вход в кабинет парка")}</h1>
      <p className="mt-3 text-sm text-slate-600">{pt("Введите логин и пароль, полученные от администратора. Email и Telegram не нужны.")}</p>
      <form onSubmit={signIn} className="mt-8 space-y-5" aria-busy={busy}>
        <div className="space-y-2"><Label htmlFor="owner-login">{pt("Логин")}</Label><Input id="owner-login" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={80} value={login} onChange={event => setLogin(event.target.value)} aria-describedby={error ? 'owner-login-error' : undefined} /></div>
        <div className="space-y-2"><Label htmlFor="owner-password">{pt("Пароль")}</Label><Input id="owner-password" type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} aria-describedby={error ? 'owner-login-error' : undefined} /></div>
        {error && <p id="owner-login-error" role="alert" className="text-sm text-red-700">{pt(error)}</p>}
        <Button className={`${primary} w-full`} disabled={busy}>{busy ? pt("Входим…") : pt("Войти")}</Button>
      </form>
      {notice && <p role="status" className="mt-4 text-sm text-slate-600">{pt(notice)}</p>}
      <p className="mt-6 text-sm text-slate-600">{pt("Забыли пароль? Попросите администратора выдать новый.")}</p>
      <Link className="mt-6 inline-block text-sm text-blue-700 underline underline-offset-4" to={`/p/${encodeURIComponent(tenantId)}`}>{pt("Открыть клиентскую витрину")}</Link>
    </div>
  </main>;

  return <main className="min-h-screen bg-white text-slate-900">
    <h1 className="sr-only">{pt("Кабинет владельца ")}{tenant.name}</h1>
    <div className="mx-auto flex max-w-6xl flex-wrap justify-end gap-2 px-4 pt-4">
      <Dialog open={passwordOpen} onOpenChange={open => { if (!busy) { setPasswordOpen(open); setPasswordError(''); } }}>
        <DialogTrigger asChild><Button variant="outline" className="min-h-11"><KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />{pt("Поменять пароль")}</Button></DialogTrigger>
        <DialogContent closeLabel={pt("Закрыть")} className="bg-white text-slate-900"><DialogHeader><DialogTitle>{pt("Поменять пароль")}</DialogTitle><DialogDescription>{pt("От 12 до 128 символов. После смены другие браузерные сессии завершатся.")}</DialogDescription></DialogHeader>
          <form onSubmit={changePassword} className="space-y-4" aria-busy={busy}>
            {[['old_password', 'Текущий пароль', 'current-password'], ['new_password', 'Новый пароль', 'new-password'], ['confirm_password', 'Повторите новый пароль', 'new-password']].map(([name, label, autocomplete]) => <div className="space-y-2" key={name}><Label htmlFor={`owner-${name}`}>{pt(label)}</Label><Input id={`owner-${name}`} name={name} type="password" autoComplete={autocomplete} required minLength={name === 'old_password' ? 1 : 12} maxLength={128} aria-describedby={passwordError ? 'owner-password-error' : undefined} /></div>)}
            {passwordError && <p id="owner-password-error" role="alert" className="text-sm text-red-700">{pt(passwordError)}</p>}
            <Button className={`${primary} w-full`} disabled={busy}>{busy ? pt("Сохраняем…") : pt("Сохранить пароль")}</Button>
          </form>
        </DialogContent>
      </Dialog>
      <Button variant="outline" className="min-h-11" onClick={logout} disabled={busy}><LogOut className="mr-2 h-4 w-4" aria-hidden="true" />{pt("Выйти")}</Button>
    </div>
    {error && <p role="alert" className="mx-auto mt-3 max-w-6xl px-4 text-sm text-red-700">{pt(error)}</p>}
    {notice && <p role="status" className="mx-auto mt-3 max-w-6xl px-4 text-sm text-slate-600">{pt(notice)}</p>}
    <PlatformTenantWorkspace tenant={tenant} owner onTenantChanged={setTenant} onBack={() => window.location.assign(`/p/${encodeURIComponent(tenantId)}`)} onViewStorefront={() => window.location.assign(`/p/${encodeURIComponent(tenantId)}`)} />
  </main>;
}
