import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { SiteHeader } from "@/components/site-header";
import { publishedBlogPath, type PublishedBlogPost } from "@/content/published-blog";
import { localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import "./article-reading.css";

export function articleMetadata(post: PublishedBlogPost): Metadata {
  const path = publishedBlogPath(post.slug, post.locale);
  const image = absoluteUrl(post.image ?? "/og-image.jpg.webp");
  return {
    title: post.title, description: post.description,
    alternates: { canonical: path, languages: { "x-default": publishedBlogPath(post.slug, "ru"), ...Object.fromEntries(post.availableLocales.map((locale) => [locale, publishedBlogPath(post.slug, locale)])) } },
    other: { "content-language": post.locale },
    openGraph: { type: "article", title: post.title, description: post.description, url: absoluteUrl(path),
      locale: post.locale === "ru" ? "ru_RU" : "en_US", publishedTime: post.publishedAt, modifiedTime: post.updatedAt ?? post.publishedAt,
      images: [{ url: image, alt: post.imageAlt ?? post.title }] },
    twitter: { card: "summary_large_image", title: post.title, description: post.description, images: [image] },
  };
}

const labels = {
  ru: { back: "Все статьи", author: "Команда Sunny Rentals", minutes: "мин чтения", contents: "В этой статье", checklist: "От отзывов к решению о бронировании", fleet: "Посмотреть автомобили", terms: "Прочитать условия аренды", next: "Теперь можно выбирать машину", nextText: "Проверьте подходящие варианты в нашем каталоге, а до оплаты согласуйте автомобиль, даты и условия.",
    steps: [["Прочитайте свежие отзывы", "Сверьте компанию, даты поездки и обстоятельства."], ["Найдите повторяющиеся ситуации", "Не считайте один случай на разных площадках несколько раз."], ["Запишите вопросы", "Выдача, платежи, депозит и ответы компании."], ["Сверьте с условиями", "До оплаты получите подтверждение для своих дат и машины."]] },
  en: { back: "All articles", author: "The Sunny Rentals team", minutes: "min read", contents: "In this article", checklist: "From reviews to a booking decision", fleet: "Browse cars", terms: "Read the rental terms", next: "Ready to choose a car?", nextText: "Explore suitable cars in our catalogue, then confirm the vehicle, dates and terms before paying.",
    steps: [["Read recent reviews", "Check the company, travel dates and circumstances."], ["Look for recurring situations", "Do not count one incident on several platforms more than once."], ["Write down your questions", "Handover, payments, deposits and the company's replies."], ["Check the written terms", "Get confirmation for your own dates and car before paying."]] },
};

export function ArticleReading({ post }: { post: PublishedBlogPost }) {
  const locale: Locale = post.locale;
  const text = labels[locale];
  const headings = [...post.content.matchAll(/^## (.+)$/gm)].map((match, index) => ({ title: match[1], id: `article-section-${index + 1}` }));
  let section = 0;
  const graph = { "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
    description: post.description, inLanguage: locale, datePublished: post.publishedAt, dateModified: post.updatedAt ?? post.publishedAt,
    mainEntityOfPage: absoluteUrl(publishedBlogPath(post.slug, locale)),
    author: { "@type": "Organization", name: post.author }, ...(post.image ? { image: absoluteUrl(post.image) } : {}) };
  const isReviews = post.slug === "choose-car-rental-phuket-reviews";
  return <main className="article-reading" lang={locale}>
    <SiteHeader locale={locale} currentPath={`/articles/${post.slug}`} alternatePaths={Object.fromEntries((["ru", "en"] as Locale[]).map((language) => [language, post.availableLocales.includes(language) ? publishedBlogPath(post.slug, language) : localePath(language, "/articles")]))} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, "\\u003c") }} />
    <article className="shell article-reading__article">
      <header className="article-reading__header">
        <Link href={localePath(locale, "/articles")}>{text.back}</Link>
        <h1>{post.title}</h1>
        <p className="article-reading__meta">{post.author === "Sunny Rentals" ? text.author : post.author} · <time dateTime={post.publishedAt}>{new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(post.publishedAt))}</time> · {Math.max(1, Math.ceil(post.content.split(/\s+/).length / 180))} {text.minutes}</p>
        {post.updatedAt ? <p className="article-reading__meta">{locale === "ru" ? "Обновлено" : "Updated"}: <time dateTime={post.updatedAt}>{post.updatedAt}</time></p> : null}
      </header>
      {post.image ? <figure className="article-reading__cover"><Image src={post.image} alt={post.imageAlt ?? post.title} width={1600} height={900} priority sizes="(max-width: 700px) 100vw, 1100px" />{post.imageCaption ? <figcaption>{post.imageCaption}</figcaption> : null}</figure> : null}
      <div className="article-reading__layout">
        <nav className="article-reading__contents" aria-label={text.contents}><h2>{text.contents}</h2><ol>{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.title}</a></li>)}</ol></nav>
        <div className="article-reading__body">
          {isReviews ? <section className="article-reading__checklist" aria-labelledby="review-checklist"><h2 id="review-checklist">{text.checklist}</h2><ol>{text.steps.map(([title, description]) => <li key={title}><h3>{title}</h3><p>{description}</p></li>)}</ol></section> : null}
          <div className="article-reading__prose"><Markdown skipHtml remarkPlugins={[remarkGfm]} components={{
            h2: ({ children }) => <h2 id={`article-section-${++section}`}>{children}</h2>,
            table: ({ children }) => <div className="article-reading__table" role="region" aria-label={locale === "ru" ? "Таблица для сравнения" : "Comparison table"} tabIndex={0}><table>{children}</table></div>,
            img: ({ src, alt }) => typeof src === "string" ? <Image src={src} alt={alt ?? ""} width={1200} height={src.startsWith("/images/articles/winter-") ? 675 : 800} sizes="(max-width: 700px) 100vw, 760px" /> : null,
          }}>{post.content}</Markdown></div>
          <section className="article-reading__next"><h2>{text.next}</h2><p>{text.nextText}</p><Link className="button button--primary" href={localePath(locale, "/cars")}>{text.fleet}</Link><Link href={localePath(locale, "/rental-terms")}>{text.terms}</Link></section>
        </div>
      </div>
    </article>
    <footer className="content-footer"><div className="shell"><Link className="brand" href={localePath(locale)}>Sunny Rentals</Link><Link href={localePath(locale, "/articles")}>{text.back}</Link></div></footer>
  </main>;
}
