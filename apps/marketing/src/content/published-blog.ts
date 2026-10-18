import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { blogEditorial } from "@/content/blog-editorial";
import type { Locale } from "@/lib/i18n";

export interface PublishedBlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  image?: string;
  imageAlt?: string;
  imageCaption?: string;
  locale: Locale;
  availableLocales: Locale[];
}

function defaultDirectory() {
  return [resolve(process.cwd(), "../../public/content/blog"), resolve(process.cwd(), "public/content/blog")]
    .find((directory) => existsSync(resolve(directory, "index.json")));
}

function existingPublicImage(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return;
  let path: string;
  try { path = decodeURIComponent(value.slice(1)); } catch { return; }
  if (path.split(/[\\/]/).includes("..") || /[?#]/.test(path)) return;
  const roots = [resolve(process.cwd(), "public"), resolve(process.cwd(), "apps/marketing/public"), resolve(process.cwd(), "../../public")];
  return roots.some((root) => {
    const file = resolve(root, path);
    return existsSync(file) && statSync(file).isFile()
      && realpathSync(file).startsWith(realpathSync(root) + sep);
  }) ? value : undefined;
}

// The bot's PUBLIC publication index is the source of truth, never private drafts.
export function loadPublishedBlogPosts(locale: Locale, directory = defaultDirectory()): PublishedBlogPost[] {
  if (!directory) return [];
  const slugs: unknown = JSON.parse(readFileSync(resolve(directory, "index.json"), "utf8"));
  if (!Array.isArray(slugs)) throw new Error("Invalid public blog index");
  return [...new Set(slugs)].map((slug): PublishedBlogPost | null => {
    if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      throw new Error("Invalid published article slug");
    }
    const data = JSON.parse(readFileSync(resolve(directory, `${slug}.json`), "utf8"));
    if (data.slug !== slug || typeof data.title !== "string" || typeof data.content !== "string"
      || !Number.isFinite(Date.parse(data.generated_at))) throw new Error(`Invalid published article: ${slug}`);
    const editorial = blogEditorial[slug];
    const translation = editorial?.[locale];
    if (locale === "en" && !editorial?.en) return null;
    return {
      slug, title: translation?.title ?? data.title,
      description: translation?.description ?? data.meta_description ?? data.title,
      content: translation?.content ?? data.content,
      author: data.author || "Sunny Rentals", publishedAt: data.generated_at,
      updatedAt: editorial?.updatedAt,
      image: existingPublicImage(editorial?.image ?? data.image_url),
      imageAlt: editorial?.[locale]?.imageAlt ?? data.title,
      imageCaption: editorial?.[locale]?.imageCaption,
      locale, availableLocales: editorial?.en ? ["ru", "en"] : ["ru"],
    };
  }).filter((post): post is PublishedBlogPost => post !== null)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPublishedBlogPost(slug: string, locale: Locale) {
  return loadPublishedBlogPosts(locale).find((post) => post.slug === slug);
}

export function publishedBlogPath(slug: string, locale: Locale) {
  return `${locale === "en" ? "/en" : ""}/articles/${slug}/`;
}
