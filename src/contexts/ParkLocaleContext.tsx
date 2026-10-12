import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getParkLanguage, parkDateLocale, saveParkLanguage, translatePark, type ParkLanguage } from '@/lib/park-locale';

import { ParkLocaleContext } from './park-locale';

export function ParkLocaleProvider({ children, initialLanguage }: { children: ReactNode; initialLanguage?: ParkLanguage }) {
  const [language, setLanguage] = useState<ParkLanguage>(() => initialLanguage || getParkLanguage());
  const pt = useCallback((source: string, values: unknown[] = []) => translatePark(source, language, values), [language]);
  useEffect(() => {
    const previous = document.documentElement.lang;
    document.documentElement.lang = language;
    return () => { document.documentElement.lang = previous; };
  }, [language]);
  return <ParkLocaleContext.Provider value={{ language, pt, dateLocale: parkDateLocale(language), intlLocale: language === 'en' ? 'en-GB' : 'ru-RU' }}>
    <div lang={language}>
      <div className="mx-auto flex max-w-6xl justify-end gap-1 px-4 py-2" role="group" aria-label={pt('Язык интерфейса')}>
        {(['ru', 'en'] as const).map(value => <Button key={value} type="button" variant={language === value ? 'default' : 'ghost'} className="min-h-11 min-w-11" aria-pressed={language === value} aria-label={value === 'ru' ? 'Русский' : 'English'} onClick={() => { saveParkLanguage(value); setLanguage(value); }}>{value.toUpperCase()}</Button>)}
      </div>
      {children}
    </div>
  </ParkLocaleContext.Provider>;
}
