import { getContentPage } from "@/content/content-pages";
import type { Locale } from "@/lib/i18n";

// Curated editorial index: do not list drafts or all commercial/terms pages.
export const articleSlugs = ["long-term-car-rental-phuket"] as const;

export function getArticles(locale: Locale) {
  return articleSlugs.flatMap((slug) => {
    const page = getContentPage(slug, locale);
    return page?.published ? [page] : [];
  });
}

export const articlesUpdatedAt = getArticles("ru").reduce((latest, page) => page.updatedAt > latest ? page.updatedAt : latest, "2026-10-17");
