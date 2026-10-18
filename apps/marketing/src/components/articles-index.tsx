import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getArticles } from "@/content/articles";
import { loadPublishedBlogPosts, publishedBlogPath } from "@/content/published-blog";
import { getCarsByCategory } from "@/content/cars";
import { getMessages, languageAlternates, localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import "./articles-index.css";

const copy = {
  ru: {
    title: "Статьи об аренде авто на Пхукете",
    description: "Практические статьи Sunny Rentals: как выбрать автомобиль на Пхукете, посчитать расходы и спланировать длительную аренду.",
    intro: "Что стоит знать до бронирования: от выбора машины для повседневных поездок до расчёта расходов на месяц.",
    read: "Читать статью", updated: "Обновлено", home: "Главная", footer: "Навигация",
  },
  en: {
    title: "Articles about car rental in Phuket",
    description: "Practical Sunny Rentals articles on choosing a car in Phuket, budgeting for your stay and planning a long-term rental.",
    intro: "Useful reading before you book, from choosing a car for everyday trips to planning a monthly rental budget.",
    read: "Read article", updated: "Updated", home: "Home", footer: "Navigation",
  },
};

export function createArticlesMetadata(locale: Locale): Metadata {
  const text = copy[locale];
  return {
    title: text.title, description: text.description,
    alternates: languageAlternates(locale, "/articles"),
    other: { "content-language": locale },
    openGraph: {
      type: "website", title: text.title, description: text.description,
      url: absoluteUrl(localePath(locale, "/articles")),
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: [locale === "ru" ? "en_US" : "ru_RU"],
      images: [{ url: absoluteUrl("/og-image.jpg.webp"), width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title: text.title, description: text.description, images: [absoluteUrl("/og-image.jpg.webp")] },
  };
}

export function ArticlesIndex({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const nav = getMessages(locale).nav;
  const articles = getArticles(locale);
  const posts = loadPublishedBlogPosts(locale);
  const russianOnly = locale === "en" ? loadPublishedBlogPosts("ru").filter((post) => !post.availableLocales.includes("en")) : [];
  const photo = getCarsByCategory("compact")[0];
  return (
    <main className="articles-index" lang={locale}>
      <SiteHeader locale={locale} currentPath="/articles" />
      <header className="articles-index__hero">
        <div className="shell">
          <Link href={localePath(locale)}>{text.home}</Link>
          <h1>{text.title}</h1>
          <p>{text.intro}</p>
        </div>
      </header>
      <div className="shell articles-index__list">
        {posts.map((post) => <article key={post.slug}>
          <Link className="articles-index__entry" href={publishedBlogPath(post.slug, locale)}>
            {post.image ? <Image src={post.image} alt="" width={720} height={480} sizes="(max-width: 700px) 100vw, 520px" /> : null}
            <div><h2>{post.title}</h2><p>{post.description}</p><small>{text.updated}: <time dateTime={post.updatedAt ?? post.publishedAt}>{(post.updatedAt ?? post.publishedAt).slice(0, 10)}</time></small><span className="articles-index__read">{text.read}</span></div>
          </Link>
        </article>)}
        {articles.map((article) => (
          <article key={article.slug}>
            <Link className="articles-index__entry" href={localePath(locale, `/${article.slug}`)}>
              {photo && article.slug === "long-term-car-rental-phuket" ? <Image src={photo.image} alt="" width={720} height={480} /> : null}
              <div>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
                <small>{text.updated}: <time dateTime={article.updatedAt}>{article.updatedAt}</time></small>
                <span className="articles-index__read">{text.read}</span>
              </div>
            </Link>
          </article>
        ))}
        {russianOnly.length ? <section className="articles-index__other-language" aria-labelledby="russian-articles"><h2 id="russian-articles">More articles in Russian</h2><p>These guides are available in Russian; an English translation has not been published.</p><ul>{russianOnly.map((post) => <li key={post.slug}><Link href={publishedBlogPath(post.slug, "ru")} hrefLang="ru" lang="ru">{post.title}</Link></li>)}</ul></section> : null}
      </div>
      <footer className="content-footer">
        <div className="shell">
          <Link className="brand" href={localePath(locale)}>Sunny Rentals</Link>
          <nav aria-label={text.footer}>
            <Link href={localePath(locale, "/cars")}>{nav.fleet}</Link>
            <Link href={localePath(locale, "/rental-terms")}>{locale === "ru" ? "Условия аренды" : "Rental terms"}</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
