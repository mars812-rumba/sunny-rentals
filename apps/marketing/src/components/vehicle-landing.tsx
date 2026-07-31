import type { Metadata } from "next";
import Link from "next/link";

import { CarCard } from "@/components/car-card";
import { CarGallery } from "@/components/car-gallery";
import { SeasonalPriceGrid } from "@/components/seasonal-price-grid";
import { SiteHeader } from "@/components/site-header";
import {
  getCarsByCategory,
  getLocalizedCar,
  getLocalizedCategory,
  type MarketingCar,
} from "@/content/cars";
import {
  getMessages,
  languageAlternates,
  localePath,
  type Locale,
} from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { getPhuketSeason } from "@/lib/pricing";
import { createModelHandoffLink } from "@/lib/telegram";

export function createVehicleMetadata(
  car: MarketingCar,
  locale: Locale,
): Metadata {
  const localizedCar = getLocalizedCar(car, locale);
  const path = `/cars/${car.slug}`;
  const title =
    locale === "ru"
      ? `Аренда ${car.brand} ${car.model} на Пхукете`
      : `${car.brand} ${car.model} rental in Phuket`;
  const description =
    locale === "ru"
      ? `${car.brand} ${car.model} ${car.year} в аренду на Пхукете от ${car.fromPrice} ฿ в день. Фото, характеристики, доставка и бронирование через Telegram.`
      : `Rent a ${car.brand} ${car.model} ${car.year} in Phuket from ${car.fromPrice} THB per day. Photos, specifications, delivery and booking through Telegram.`;

  return {
    title,
    description,
    alternates: languageAlternates(locale, path),
    openGraph: {
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: [locale === "ru" ? "en_US" : "ru_RU"],
      title,
      description,
      url: localePath(locale, path),
      images: [
        {
          url: car.image,
          alt: `${car.brand} ${car.model}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [car.image],
    },
    keywords:
      locale === "ru"
        ? [`аренда ${car.brand} ${car.model}`, `${car.model} Пхукет`, "аренда авто Пхукет"]
        : [`${car.brand} ${car.model} rental`, `${car.model} Phuket`, "car rental Phuket"],
    other: {
      "content-language": locale,
      "vehicle-summary": localizedCar.summary,
    },
  };
}

export function VehicleLanding({
  car,
  locale,
}: {
  car: MarketingCar;
  locale: Locale;
}) {
  const copy = getMessages(locale);
  const localizedCar = getLocalizedCar(car, locale);
  const category = getLocalizedCategory(car.category, locale);
  const path = `/cars/${car.slug}`;
  const relatedCars = getCarsByCategory(car.category)
    .filter((item) => item.slug !== car.slug)
    .slice(0, 3);
  const telegramLink = createModelHandoffLink(car);
  const pageUrl = absoluteUrl(localePath(locale, path));

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${pageUrl}#vehicle`,
        name: `${car.brand} ${car.model} ${car.year}`,
        image: [absoluteUrl(car.image)],
        description: localizedCar.summary,
        inLanguage: copy.htmlLang,
        brand: {
          "@type": "Brand",
          name: car.brand,
        },
        category: category?.name,
        offers: {
          "@type": "Offer",
          url: pageUrl,
          priceCurrency: "THB",
          price: car.fromPrice,
          businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: car.fromPrice,
            priceCurrency: "THB",
            unitText: "DAY",
          },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: copy.vehicle.home,
            item: absoluteUrl(localePath(locale)),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: copy.vehicle.fleet,
            item: absoluteUrl(localePath(locale, "/cars")),
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `${car.brand} ${car.model}`,
            item: pageUrl,
          },
        ],
      },
    ],
  };

  return (
    <main lang={copy.htmlLang}>
      <SiteHeader locale={locale} currentPath={path} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <article className="vehicle-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Breadcrumbs">
            <Link href={localePath(locale)}>{copy.vehicle.home}</Link>
            <span aria-hidden="true">/</span>
            <Link href={localePath(locale, "/cars")}>{copy.vehicle.fleet}</Link>
            <span aria-hidden="true">/</span>
            <span>{car.brand} {car.model}</span>
          </nav>

          <div className="vehicle-hero">
            <div className="vehicle-hero__media">
              <CarGallery
                images={car.images?.length ? car.images : [car.image]}
                alt={`${car.brand} ${car.model} ${car.year} ${copy.vehicle.imageAlt}`}
                year={car.year}
                rating={car.rating}
                verifiedLabel={copy.fleet.verified}
                previousLabel={copy.fleet.previousPhoto}
                nextLabel={copy.fleet.nextPhoto}
                photoLabel={copy.fleet.photo}
              />
              <span>{category?.shortName}</span>
            </div>

            <div className="vehicle-hero__content">
              <p className="eyebrow eyebrow--dark">{copy.vehicle.rental}</p>
              <h1>{car.brand} {car.model}</h1>
              <p className="vehicle-hero__year">
                {car.year} · {localizedCar.transmission} · {localizedCar.seats}
              </p>
              <p className="vehicle-hero__summary">{localizedCar.summary}</p>

              <div className="booking-ticket">
                <div>
                  <span>{copy.vehicle.longTermPrice}</span>
                  <strong>
                    {copy.vehicle.from}{" "}
                    {car.fromPrice.toLocaleString(copy.numberLocale)} ฿{" "}
                    <small>{copy.vehicle.perDay}</small>
                  </strong>
                </div>
                <p>
                  {copy.vehicle.deposit}:{" "}
                  {car.deposit.toLocaleString(copy.numberLocale)} ฿
                </p>
              </div>

              <SeasonalPriceGrid
                pricing={car.pricing}
                locale={locale}
                initialSeason={getPhuketSeason()}
                variant="full"
              />

              <a
                className="button button--telegram"
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                {copy.vehicle.book}
              </a>
              <p className="handoff-note">{copy.vehicle.handoff}</p>
            </div>
          </div>

          <section className="vehicle-details" aria-labelledby="details-title">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.vehicle.detailsEyebrow}</p>
              <h2 id="details-title">{copy.vehicle.detailsTitle}</h2>
              <p>{localizedCar.bestFor}</p>
              <p>{copy.vehicle.delivery}</p>
            </div>
            <dl>
              <div><dt>{copy.vehicle.transmission}</dt><dd>{localizedCar.transmission}</dd></div>
              <div><dt>{copy.vehicle.engine}</dt><dd>{localizedCar.engine}</dd></div>
              <div><dt>{copy.vehicle.fuel}</dt><dd>{localizedCar.fuel}</dd></div>
              <div><dt>{copy.vehicle.capacity}</dt><dd>{localizedCar.seats}</dd></div>
            </dl>
          </section>

          <section className="related-section" aria-labelledby="related-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--dark">{copy.vehicle.alternatives}</p>
                <h2 id="related-title">{copy.vehicle.similar}</h2>
              </div>
              <Link className="text-link" href={localePath(locale, "/cars")}>
                {copy.vehicle.allFleet}
              </Link>
            </div>
            <div className="related-grid">
              {relatedCars.map((item) => (
                <CarCard car={item} locale={locale} key={item.slug} />
              ))}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
