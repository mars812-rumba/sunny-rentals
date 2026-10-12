import { enGB, ru } from 'date-fns/locale';
import { parkEnglish } from '@/locales/park-en';

export type ParkLanguage = 'ru' | 'en';
export const PARK_LANGUAGE_KEY = 'sunny_park_language';
let selected: ParkLanguage | undefined;
const russianByEnglish = new Map(Object.entries(parkEnglish).map(([source, english]) => [english, source]));

export function getParkLanguage(): ParkLanguage {
  if (selected) return selected;
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem(PARK_LANGUAGE_KEY) : null;
    if (saved === 'ru' || saved === 'en') return selected = saved;
  } catch { /* Private browsing/storage restrictions must not prevent use. */ }
  const browser = typeof window !== 'undefined' ? window.navigator?.language : undefined;
  return selected = browser && !browser.toLowerCase().startsWith('ru') ? 'en' : 'ru';
}

export function saveParkLanguage(language: ParkLanguage) {
  selected = language;
  try { window.localStorage.setItem(PARK_LANGUAGE_KEY, language); } catch { /* Keep the choice in memory. */ }
}

export function translatePark(source: string, language: ParkLanguage, values: unknown[] = []): string {
  const key = source.trim().replace(/\s+/g, ' ');
  const translated = language === 'en' ? parkEnglish[key] : russianByEnglish.get(key);
  let text = translated ? `${source.match(/^\s*/)?.[0] || ''}${translated}${source.match(/\s*$/)?.[0] || ''}` : source;
  if (language === 'en') {
    text = text.replace(/\{(\d+)\} (days|vehicles|seats)\b/g, (match, index, unit) =>
      new Intl.PluralRules('en').select(Number(values[Number(index)])) === 'one' ? `{${index}} ${unit.slice(0, -1)}` : match);
    if (key === 'суток' && Number(values[0]) === 1) text = text.replace(/\bdays\b/, 'day');
  }
  return text.replace(/\{(\d+)\}/g, (_, index) => String(values[Number(index)] ?? ''));
}

export const parkText = (source: string, values: unknown[] = []) => translatePark(source, getParkLanguage(), values);
export const parkIntlLocale = () => getParkLanguage() === 'en' ? 'en-GB' : 'ru-RU';
export const parkDateLocale = (language = getParkLanguage()) => language === 'en' ? enGB : ru;
