import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

import { CarCard } from "@/components/car-card";
import { RentalDatesProvider } from "@/components/rental-dates-context";
import { SiteHeader } from "@/components/site-header";
import { getCarsByCategory } from "@/content/cars";
import { contentPages } from "@/content/content-pages";
import { trustPages, type TrustPageContent } from "@/content/trust-pages";
import { languageAlternates, localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl, siteConfig } from "@/lib/site";
import { ContextLinks, relatedTopics } from "@/components/context-links";
import "./monthly-rental.css";

export function createTrustPageMetadata(page: TrustPageContent, locale: Locale): Metadata {
  const path = `/${page.slug}`;
  const isMonthly = page.slug === "long-term-car-rental-phuket";
  const socialImage = absoluteUrl(isMonthly ? getCarsByCategory("compact")[0]?.image ?? "/logo.png.webp" : "/logo.png.webp");
  return {
    title: page.title,
    description: page.description,
    alternates: languageAlternates(locale, path),
    other: { "content-language": locale },
    twitter: { card: isMonthly ? "summary_large_image" : "summary", title: page.title, description: page.description, images: [socialImage] },
    openGraph: {
      type: "article",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: [locale === "ru" ? "en_US" : "ru_RU"],
      title: page.title,
      description: page.description,
      url: absoluteUrl(localePath(locale, path)),
      modifiedTime: page.updatedAt,
      images: isMonthly ? [{ url: socialImage, alt: page.title }] : [{ url: socialImage, width: 192, height: 192 }],
    },
  };
}

export function TrustPageLanding({ page, locale }: { page: TrustPageContent; locale: Locale }) {
  const isMonthly = page.slug === "long-term-car-rental-phuket";
  const path = `/${page.slug}`;
  const pageUrl = absoluteUrl(localePath(locale, path));
  const labels = locale === "ru"
    ? {
        home: "Главная", guides: "Аренда и условия", fleet: "Выбрать транспорт",
        telegram: "Продолжить в Telegram", whatsapp: "Написать @marseloid",
        related: "Читайте также", updated: "Обновлено", footer: "Условия аренды",
        matching: "Подходящие варианты",
        matchingIntro: "Реальные машины из парка с ценами, депозитами и условиями.",
      }
    : {
        home: "Home", guides: "Rental and terms", fleet: "Choose a vehicle",
        telegram: "Continue in Telegram", whatsapp: "Message @marseloid",
        related: "Related guides", updated: "Updated", footer: "Trust and rental guides",
        matching: "Matching vehicles",
        matchingIntro: "Real fleet vehicles with rates, deposits and terms.",
      };
  const localizedPages = contentPages.map((item) => item[locale]);
  const currentPageIndex = localizedPages.findIndex((item) => item.slug === page.slug);
  const relatedPages = Array.from(
    { length: Math.min(6, localizedPages.length - 1) },
    (_, index) => localizedPages[(currentPageIndex + index + 1) % localizedPages.length],
  );
  const candidates = page.vehicleCategories
    ? page.vehicleCategories.length === 1
      ? getCarsByCategory(page.vehicleCategories[0]).slice(0, 4)
      : page.vehicleCategories
          .flatMap((category) => getCarsByCategory(category).slice(0, 1))
          .slice(0, 4)
    : [];
  const featuredCars = page.requiresChildSeat
    ? page.vehicleCategories?.flatMap((category) => getCarsByCategory(category))
        .filter((car) => car.verifiedDetails?.childSeatCompatible === true).slice(0, 4) ?? []
    : candidates;
  const vehicleSection = featuredCars.length ? (
    <section className="content-vehicles" id="rental-vehicles" aria-labelledby="content-vehicles-title">
      <div className="shell">
        <div className="section-heading">
          <div>
            {!isMonthly ? <p className="eyebrow eyebrow--dark">Sunny Rentals · Phuket</p> : null}
            <h2 id="content-vehicles-title">{labels.matching}</h2>
          </div>
          <p>{labels.matchingIntro}</p>
        </div>
        <RentalDatesProvider>
          <div className="content-vehicles__grid">
            {featuredCars.map((car) => <CarCard car={car} locale={locale} key={car.slug} />)}
          </div>
        </RentalDatesProvider>
      </div>
    </section>
  ) : null;
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

      <article className={`trust-page${isMonthly ? " monthly-rental" : ""}`}>
        <header className="trust-page__hero">
          <div className="shell">
            <nav className="trust-page__breadcrumbs" aria-label={locale === "ru" ? "Путь к странице" : "Breadcrumbs"}>
              <Link href={localePath(locale)}>{labels.home}</Link>
              <span aria-hidden="true">/</span>
              {isMonthly ? <Link href={localePath(locale, "/articles")}>{locale === "ru" ? "Статьи" : "Articles"}</Link> : <span>{labels.guides}</span>}
            </nav>
            {isMonthly ? (
              <div className="monthly-rental__opening">
                <div className="monthly-rental__copy">
                  <h1>{page.title}</h1>
                  <p>{page.intro}</p>
                  <nav className="monthly-rental__actions" aria-label={locale === "ru" ? "На этой странице" : "On this page"}>
                    <a href="#rental-vehicles">{locale === "ru" ? "Посмотреть автомобили" : "Explore cars"}</a>
                    <a href="#section-2">{locale === "ru" ? "Как посчитать стоимость" : "Understand the cost"}</a>
                  </nav>
                  <small>{labels.updated}: <time dateTime={page.updatedAt}>{page.updatedAt}</time></small>
                </div>
                {featuredCars[0] ? (
                  <figure className="monthly-rental__photo">
                    <Image src={featuredCars[0].image} alt={`${featuredCars[0].brand} ${featuredCars[0].model}`} width={720} height={480} priority />
                    <figcaption>{locale === "ru" ? "Фото автомобиля из каталога Sunny Rentals. Наличие проверяем на ваши даты." : "A car from the Sunny Rentals catalogue. Availability is checked for your dates."}</figcaption>
                  </figure>
                ) : null}
              </div>
            ) : <>
              <p className="eyebrow">{page.eyebrow}</p>
              <h1>{page.title}</h1>
              <p>{page.intro}</p>
              <small>{labels.updated}: {page.updatedAt}</small>
            </>}
          </div>
        </header>

        {!isMonthly ? vehicleSection : null}

        {page.requiresChildSeat && !featuredCars.length ? (
          <section className="content-vehicles"><div className="shell">
            <h2>{locale === "ru" ? "Подберём автомобиль и кресло вместе" : "Choose the car and child seat together"}</h2>
            <p>{locale === "ru"
              ? "Сообщите параметры ребёнка и состав семьи. Подходящее кресло, крепление и наличие подтвердим для выбранной машины до бронирования."
              : "Share the child's measurements and your group details. The seat type, fitting method and availability are confirmed for the selected car before booking."}</p>
            <Link className="text-link" href={localePath(locale, "/cars")}>{labels.fleet}</Link>
          </div></section>
        ) : null}

        <div className="shell trust-page__body">
          <div className="trust-page__sections">
            {page.sections.map((section, index) => (
              <section key={section.title} id={`section-${index + 1}`}>
                {!isMonthly ? <span>{String(index + 1).padStart(2, "0")}</span> : null}
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.items ? (
                  <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>
                ) : null}
                {section.table ? (
                  <div className="rental-comparison" role="region" aria-label={section.table.caption} tabIndex={0}>
                    <table>
                      <caption>{section.table.caption}</caption>
                      <thead><tr>{section.table.headers.map((header) => <th scope="col" key={header}>{header}</th>)}</tr></thead>
                      <tbody>{section.table.rows.map((row) => <tr key={row[0]}>
                        {row.map((cell, cellIndex) => cellIndex === 0
                          ? <th scope="row" key={cellIndex}>{cell}</th>
                          : <td key={cellIndex}>{cell}</td>)}
                      </tr>)}</tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            ))}
          </div>

          <aside className="trust-page__aside">
            {isMonthly ? <nav className="monthly-rental__contents" aria-labelledby="monthly-contents-title">
              <strong id="monthly-contents-title">{locale === "ru" ? "Содержание статьи" : "In this article"}</strong>
              {page.sections.map((section, index) => <a key={section.title} href={`#section-${index + 1}`}>{section.title}</a>)}
            </nav> : null}
            <strong>{labels.fleet}</strong>
            <p>{locale === "ru" ? "Сравните реальные машины, цены и депозиты." : "Compare real vehicles, rates and deposits."}</p>
            <Link className="trust-page__fleet-link" href={localePath(locale, "/cars")}>{labels.fleet}<span aria-hidden="true">→</span></Link>
            {["rental-terms", "scooter-rental-phuket"].includes(page.slug) ? (
              <p><a href="https://thailand.prd.go.th/en/content/category/detail/id/2874/iid/341038" target="_blank" rel="noopener noreferrer">
                {locale === "ru" ? "Официальная информация Таиланда о водительских документах" : "Thailand’s official driving-document guidance"}
              </a></p>
            ) : null}
          </aside>
        </div>

        {isMonthly ? vehicleSection : null}

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
              <ContextLinks locale={locale} paths={relatedTopics[page.slug] ?? ["rental-terms"]} />
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
              <a href={siteConfig.managerTelegramUrl} target="_blank" rel="noopener noreferrer">{labels.whatsapp}</a>
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
            <img className="brand__logo" src="/logo.png.webp" alt="" />
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
