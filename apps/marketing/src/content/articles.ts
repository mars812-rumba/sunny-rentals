import { getContentPage } from "@/content/content-pages";
import type { Locale } from "@/lib/i18n";
import { loadPublishedBlogPosts } from "@/content/published-blog";

// Curated editorial index: do not list drafts or all commercial/terms pages.
export const articleSlugs = ["long-term-car-rental-phuket"] as const;

export function getArticles(locale: Locale) {
  return articleSlugs.flatMap((slug) => {
    const page = getContentPage(slug, locale);
    return page?.published ? [page] : [];
  });
}

export const articlesUpdatedAt = [...getArticles("ru").map((page) => page.updatedAt), ...loadPublishedBlogPosts("ru").map((post) => (post.updatedAt ?? post.publishedAt).slice(0, 10))].reduce((latest, date) => date > latest ? date : latest, "2026-10-17");
