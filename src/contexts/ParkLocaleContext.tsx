import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getParkLanguage, parkDateLocale, saveParkLanguage, translatePark, type ParkLanguage } from '@/lib/park-locale';

import { ParkLocaleContext, useParkLocale } from './park-locale';

export function ParkLanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, pt, changeLanguage } = useParkLocale();
  if (compact) return <select
    aria-label={pt('Язык интерфейса')}
    value={language}
    onChange={event => changeLanguage(event.target.value as ParkLanguage)}
    className="h-11 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
  >
    <option value="ru" lang="ru">🇷🇺 RU</option>
    <option value="en" lang="en">🇬🇧 EN</option>
  </select>;
  return <div className="flex shrink-0 gap-1" role="group" aria-label={pt('Язык интерфейса')}>
    {(['ru', 'en'] as const).map(value => <Button key={value} type="button" variant={language === value ? 'default' : 'ghost'} className="min-h-11 min-w-11" aria-pressed={language === value} aria-label={value === 'ru' ? 'Русский' : 'English'} onClick={() => changeLanguage(value)}><span aria-hidden="true">{value === 'ru' ? '🇷🇺' : '🇬🇧'}</span>{value.toUpperCase()}</Button>)}
  </div>;
}

export function ParkLocaleProvider({ children, initialLanguage, showSwitcher = true }: { children: ReactNode; initialLanguage?: ParkLanguage; showSwitcher?: boolean }) {
  const [language, setLanguage] = useState<ParkLanguage>(() => initialLanguage || getParkLanguage());
  const changeLanguage = useCallback((value: ParkLanguage) => { saveParkLanguage(value); setLanguage(value); }, []);
  const pt = useCallback((source: string, values: unknown[] = []) => translatePark(source, language, values), [language]);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  return <ParkLocaleContext.Provider value={{ language, changeLanguage, pt, dateLocale: parkDateLocale(language), intlLocale: language === 'en' ? 'en-GB' : 'ru-RU' }}>
    <div lang={language}>
      {showSwitcher && <div className="mx-auto flex max-w-6xl justify-end px-4 py-2"><ParkLanguageSwitcher /></div>}
      {children}
    </div>
  </ParkLocaleContext.Provider>;
}
