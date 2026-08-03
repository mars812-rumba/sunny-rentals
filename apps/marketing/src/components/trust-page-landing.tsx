import type { Metadata } from "next";
import Link from "next/link";

import { SiteHeader } from "@/components/site-header";
import { trustPages, type TrustPageContent } from "@/content/trust-pages";
import { languageAlternates, localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl, siteConfig } from "@/lib/site";

export function createTrustPageMetadata(page: TrustPageContent, locale: Locale): Metadata {
  const path = `/${page.slug}`;
  return {
    title: page.title,
    description: page.description,
    alternates: languageAlternates(locale, path),
    other: { "content-language": locale },
    openGraph: {
      type: "article",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: [locale === "ru" ? "en_US" : "ru_RU"],
      title: page.title,
      description: page.description,
      url: localePath(locale, path),
      modifiedTime: page.updatedAt,
    },
  };
}

export function TrustPageLanding({ page, locale }: { page: TrustPageContent; locale: Locale }) {
  const path = `/${page.slug}`;
  const pageUrl = absoluteUrl(localePath(locale, path));
  const labels = locale === "ru"
    ? {
        home: "Главная", guides: "Полезная информация", fleet: "Выбрать транспорт",
        telegram: "Продолжить в Telegram", whatsapp: "Задать вопрос в WhatsApp",
        related: "Читайте также", updated: "Обновлено", footer: "Страницы доверия",
      }
    : {
        home: "Home", guides: "Useful information", fleet: "Choose a vehicle",
        telegram: "Continue in Telegram", whatsapp: "Ask on WhatsApp",
        related: "Related guides", updated: "Updated", footer: "Trust and rental guides",
      };
  const relatedPages = trustPages
    .map((item) => item[locale])
    .filter((item) => item.slug !== page.slug);
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${pageUrl}#webpage`,
        url: pageUrl,
        name: page.title,
        description: page.description,
        inLanguage: locale,
        dateModified: page.updatedAt,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: labels.home, item: absoluteUrl(localePath(locale)) },
          { "@type": "ListItem", position: 2, name: page.title, item: pageUrl },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };

  return (
    <main lang={locale}>
      <SiteHeader locale={locale} currentPath={path} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />

      <article className="trust-page">
        <header className="trust-page__hero">
          <div className="shell">
            <nav className="trust-page__breadcrumbs" aria-label="Breadcrumbs">
              <Link href={localePath(locale)}>{labels.home}</Link>
              <span aria-hidden="true">/</span>
              <span>{labels.guides}</span>
            </nav>
            <p className="eyebrow">{page.eyebrow}</p>
            <h1>{page.title}</h1>
            <p>{page.intro}</p>
            <small>{labels.updated}: {page.updatedAt}</small>
          </div>
        </header>

        <div className="shell trust-page__body">
          <div className="trust-page__sections">
            {page.sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? (
                  <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="trust-page__aside">
            <strong>{labels.fleet}</strong>
            <p>{locale === "ru" ? "Сравните реальные машины, цены и депозиты." : "Compare real vehicles, rates and deposits."}</p>
            <Link href={localePath(locale, "/cars")}>{labels.fleet}<span aria-hidden="true">→</span></Link>
          </aside>
        </div>

        <section className="trust-page__faq" aria-labelledby="trust-faq-title">
          <div className="shell trust-page__faq-layout">
            <div>
              <p className="eyebrow eyebrow--dark">FAQ</p>
              <h2 id="trust-faq-title">{locale === "ru" ? "Коротко о главном" : "The essentials"}</h2>
            </div>
            <div className="trust-page__faq-list">
              {page.faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}<span aria-hidden="true">+</span></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="trust-page__contact">
          <div className="shell trust-page__contact-inner">
            <div>
              <p className="eyebrow">Sunny Rentals · Phuket</p>
              <h2>{locale === "ru" ? "Выберите транспорт или уточните условия" : "Choose a vehicle or ask about the terms"}</h2>
            </div>
            <div>
              <a href={siteConfig.telegramBotUrl}>{labels.telegram}</a>
              <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">{labels.whatsapp}</a>
            </div>
          </div>
        </section>

        <section className="trust-page__related">
          <div className="shell">
            <p className="eyebrow eyebrow--dark">{labels.related}</p>
            <nav aria-label={labels.related}>
              {relatedPages.map((item) => (
                <Link href={localePath(locale, `/${item.slug}`)} key={item.slug}>
                  {item.title}<span aria-hidden="true">→</span>
                </Link>
              ))}
            </nav>
          </div>
        </section>
      </article>

      <footer className="content-footer">
        <div className="shell">
          <Link className="brand" href={localePath(locale)}>
            <img className="brand__logo" src="/logo.png" alt="" />
            <span><strong>Sunny Rentals</strong><small>Phuket</small></span>
          </Link>
          <nav aria-label={labels.footer}>
            {trustPages.map((item) => (
              <Link href={localePath(locale, `/${item[locale].slug}`)} key={item[locale].slug}>{item[locale].title}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </main>
  );
}
