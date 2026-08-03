import { commercialPages } from "@/content/commercial-pages";
import { trustPages } from "@/content/trust-pages";
import type { Locale } from "@/lib/i18n";

export const contentPages = [...trustPages, ...commercialPages];
export const contentPageSlugs = contentPages.map((page) => page.ru.slug);

export function getContentPage(slug: string, locale: Locale) {
  return contentPages.find((page) => page[locale].slug === slug)?.[locale];
}
