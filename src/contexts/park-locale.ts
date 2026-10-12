import { createContext, useContext } from 'react';
import { parkDateLocale, translatePark, type ParkLanguage } from '@/lib/park-locale';

export const ParkLocaleContext = createContext({
  language: 'ru' as ParkLanguage,
  changeLanguage: (_language: ParkLanguage) => {},
  pt: (source: string, values: unknown[] = []) => translatePark(source, 'ru', values),
  dateLocale: parkDateLocale('ru'),
  intlLocale: 'ru-RU',
});
export const useParkLocale = () => useContext(ParkLocaleContext);
