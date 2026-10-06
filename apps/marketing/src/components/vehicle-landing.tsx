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
  getLocalizedModelGroup,
  getModelGroupByCarSlug,
  isModelMaster,
  type VehicleModelGroup,
} from "@/content/model-groups";
import {
  getMessages,
  languageAlternates,
  localePath,
  type Locale,
} from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";
import { getPhuketSeason } from "@/lib/pricing";
import { createModelHandoffLink } from "@/lib/telegram";
import { getAuditFaq } from "@/content/audit-faq";
import { ContextLinks } from "@/components/context-links";
import { policyCopy } from "@/content/rental-policy";

function createVehicleFaq(
  car: MarketingCar,
  vehicleName: string,
  locale: Locale,
  group: VehicleModelGroup,
  master: boolean,
) {
  const detail = car.verifiedDetails;
  const selection = getAuditFaq(
    car.category === "bikes" ? ["B2", "B3"]
    : car.category === "7s" ? ["G1", "G3"]
    : car.category === "suv" ? ["V1", "V2"]
    : car.category === "sedan" ? ["E1", "E2"] : ["K2", "K3"],
    locale,
  );
  const equipment = detail?.equipment?.length ? [{
    question: locale === "ru" ? `Какие опции подтверждены у ${vehicleName}?` : `Which features are confirmed on this ${vehicleName}?`,
    answer: detail.equipment.map((item) => item[locale]).join(", "),
  }] : [];
  const physical = detail?.bodyStyle || detail?.seats ? [{
    question: locale === "ru" ? "Какой кузов и сколько мест у этого экземпляра?" : "What body style and seat count does this vehicle have?",
    answer: [
      detail.bodyStyle?.[locale],
      detail.seats ? `${detail.seats} ${locale === "ru" ? "мест" : "seats"}` : undefined,
    ].filter(Boolean).join(" · "),
  }] : [];
  const variants = master && group.variants.length > 1
    ? getLocalizedModelGroup(group, locale).questions.slice(1) : [];
  const excess = car.terms.insurance?.excessThb;
  const financial = locale === "ru" ? {
    question: `Какие депозит и франшиза у выбранного ${vehicleName}?`,
    answer: `Депозит этого экземпляра — ${car.deposit.toLocaleString("ru-RU")} бат, отдельно от аренды.${excess !== undefined ? ` Франшиза по опубликованным условиям — ${excess.toLocaleString("ru-RU")} бат. Депозит и франшиза не ограничивают автоматически ответственность при любом повреждении.` : " Покрытие байка проверяется отдельно по договору."}`,
  } : {
    question: `What deposit and excess apply to the selected ${vehicleName}?`,
    answer: `This vehicle's deposit is ${car.deposit.toLocaleString("en-US")} THB, separate from rental.${excess !== undefined ? ` The published excess is ${excess.toLocaleString("en-US")} THB. Neither amount automatically limits all damage liability.` : " Check scooter cover separately against the agreement."}`,
  };
  return [...selection.slice(0, physical.length ? 1 : 2), ...physical, ...equipment, ...variants, financial].slice(0, 5);
}

export function createVehicleMetadata(
  car: MarketingCar,
  locale: Locale,
): Metadata {
  const localizedCar = getLocalizedCar(car, locale);
  const group = getModelGroupByCarSlug(car.slug);
  if (!group) throw new Error(`Model group is missing for ${car.slug}`);
  const master = isModelMaster(car, group);
  const localizedGroup = getLocalizedModelGroup(group, locale);
  const vehicleName = [car.brand, car.model, car.year].filter(Boolean).join(" ");
  const canonicalPath = `/cars/${group.slug}`;
  const title = master
    ? localizedGroup.title
    : locale === "ru"
      ? `Аренда ${vehicleName}, ${car.color}, на Пхукете`
      : `${vehicleName}, ${car.colorEn}, rental in Phuket`;
  const description = master
    ? localizedGroup.description
    : locale === "ru"
      ? `${vehicleName}, ${car.color}, в аренду на Пхукете от ${car.fromPrice} ฿ в день. Реальные фото, сезонные цены, депозит и условия доставки.`
      : `Rent a ${vehicleName}, ${car.colorEn}, in Phuket from ${car.fromPrice} THB per day. Real photos, seasonal rates, deposit and delivery terms.`;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: languageAlternates(locale, canonicalPath),
    openGraph: {
      type: "website",
      locale: locale === "ru" ? "ru_RU" : "en_US",
      alternateLocale: [locale === "ru" ? "en_US" : "ru_RU"],
      title,
      description,
      url: localePath(locale, canonicalPath),
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
      "vehicle-summary": master ? localizedGroup.summary : localizedCar.summary,
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
  const group = getModelGroupByCarSlug(car.slug);
  if (!group) throw new Error(`Model group is missing for ${car.slug}`);
  const master = isModelMaster(car, group);
  const localizedGroup = getLocalizedModelGroup(group, locale);
  const vehicleName = [car.brand, car.model, car.year].filter(Boolean).join(" ");
  const category = getLocalizedCategory(car.category, locale);
  const path = `/cars/${car.slug}`;
  const relatedCars = getCarsByCategory(car.category)
    .filter((item) => item.slug !== car.slug)
    .slice(0, 3);
  const telegramLink = createModelHandoffLink(car);
  const detailPageUrl = absoluteUrl(localePath(locale, path));
  const canonicalPath = `/cars/${group.slug}`;
  const canonicalPageUrl = absoluteUrl(localePath(locale, canonicalPath));
  const pageUrl = master ? canonicalPageUrl : detailPageUrl;
  const faq = createVehicleFaq(car, vehicleName, locale, group, master);
  const insurance = car.terms.insurance;
  const deliveryAirport = car.terms.delivery?.find((item) => item.zone === "airport")?.priceThb;
  const deliveryCity = car.terms.delivery?.find((item) => item.zone === "city")?.priceThb;

  const createProduct = (variant: MarketingCar) => {
    const localizedVariant = getLocalizedCar(variant, locale);
    const variantName = [variant.brand, variant.model, variant.year].filter(Boolean).join(" ");
    const variantUrl = absoluteUrl(localePath(locale, `/cars/${variant.slug}`));
    return {
      "@type": "Product",
      "@id": `${variantUrl}#vehicle`,
      name: `${variantName} · ${locale === "en" ? variant.colorEn : variant.color}`,
      sku: variant.inventoryId,
      image: variant.images.map((image) => absoluteUrl(image)),
      description: localizedVariant.summary,
      inLanguage: copy.htmlLang,
      brand: { "@type": "Brand", name: variant.brand },
      category: getLocalizedCategory(variant.category, locale)?.name,
      color: locale === "en" ? variant.colorEn : variant.color,
      additionalProperty: [
        { "@type": "PropertyValue", name: locale === "ru" ? "Год" : "Year", value: variant.year },
        { "@type": "PropertyValue", name: locale === "ru" ? "Цвет" : "Colour", value: locale === "ru" ? variant.color : variant.colorEn },
        { "@type": "PropertyValue", name: copy.vehicle.deposit, value: `${variant.deposit} THB` },
      ],
      offers: {
        "@type": "Offer",
        url: variantUrl,
        priceCurrency: "THB",
        price: variant.fromPrice,
                businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: variant.fromPrice,
          priceCurrency: "THB",
          unitText: "DAY",
        },
      },
    };
  };

  const productNode = group.variants.length > 1
    ? {
        "@type": "ProductGroup",
        "@id": `${canonicalPageUrl}#model-group`,
        name: localizedGroup.name,
        productGroupID: group.slug,
        description: localizedGroup.summary,
        inLanguage: copy.htmlLang,
        brand: { "@type": "Brand", name: group.brand },
        variesBy: ["https://schema.org/color"],
        hasVariant: group.variants.map((variant) => createProduct(variant)),
      }
    : createProduct(car);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      productNode,
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
      {
        "@type": "FAQPage",
        mainEntity: faq.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
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
                alt={`${vehicleName} ${copy.vehicle.imageAlt}`}
                year={car.year}
                previousLabel={copy.fleet.previousPhoto}
                nextLabel={copy.fleet.nextPhoto}
                photoLabel={copy.fleet.photo}
              />
              <span className="vehicle-category-pill">{category?.shortName}</span>
              {car.photos.realVehicle ? (
                <span className="vehicle-photo-proof">{copy.vehicle.realPhotos}</span>
              ) : null}
            </div>

            <div className="vehicle-hero__content">
              <p className="eyebrow eyebrow--dark">{copy.vehicle.rental}</p>
              <h1>{master ? localizedGroup.title : `${vehicleName} · ${locale === "en" ? car.colorEn : car.color}`}</h1>
              <p className="vehicle-hero__year">
                {[car.year, localizedCar.transmission, localizedCar.seats]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <p className="vehicle-hero__summary">{master ? localizedGroup.summary : localizedCar.summary}</p>

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
              <p className="handoff-note">{locale === "ru" ? "Наличие и минимальный срок проверяются до подтверждения брони. Аренда, депозит и услуги — отдельные суммы." : "Availability and minimum term are checked before booking confirmation. Rental, deposit and services are separate amounts."}</p>
              <ContextLinks locale={locale} paths={["deposit", "insurance", "delivery"]} />
            </div>
          </div>

          {group.variants.length > 1 ? (
            <section className="vehicle-variants" aria-labelledby="vehicle-variants-title">
              <div className="section-heading">
                <div>
                  <p className="eyebrow eyebrow--dark">{localizedGroup.name}</p>
                  <h2 id="vehicle-variants-title">{localizedGroup.variantsTitle}</h2>
                </div>
                <p>{localizedGroup.variantsIntro}</p>
              </div>
              <div className="vehicle-variants__grid">
                {group.variants.map((variant) => {
                  const variantName = [variant.brand, variant.model, variant.year].filter(Boolean).join(" ");
                  const selected = variant.slug === car.slug;
                  return (
                    <Link
                      className={`vehicle-variant${selected ? " vehicle-variant--selected" : ""}`}
                      href={localePath(locale, `/cars/${variant.slug}`)}
                      key={variant.slug}
                    >
                      <img src={variant.image} alt={`${variantName} ${locale === "en" ? variant.colorEn : variant.color}`} loading="lazy" />
                      <span className="vehicle-variant__body">
                        <strong>{variantName}</strong>
                        <small>{locale === "en" ? variant.colorEn : variant.color}</small>
                        <span>{localizedGroup.from} {variant.fromPrice.toLocaleString(copy.numberLocale)} ฿ {localizedGroup.perDay}</span>
                        <small>{localizedGroup.deposit}: {variant.deposit.toLocaleString(copy.numberLocale)} ฿</small>
                        {selected ? <em>{localizedGroup.current}</em> : null}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="vehicle-details" aria-labelledby="details-title">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.vehicle.detailsEyebrow}</p>
              <h2 id="details-title">{copy.vehicle.detailsTitle}</h2>
              <p>{localizedCar.bestFor}</p>
              <p>{copy.vehicle.delivery}</p>
            </div>
            <dl>
              {car.verifiedDetails?.bodyStyle ? <div><dt>{locale === "ru" ? "Кузов" : "Body style"}</dt><dd>{car.verifiedDetails.bodyStyle[locale]}</dd></div> : null}
              {localizedCar.transmission !== "—" ? <div><dt>{copy.vehicle.transmission}</dt><dd>{localizedCar.transmission}</dd></div> : null}
              {localizedCar.engine !== "—" ? <div><dt>{copy.vehicle.engine}</dt><dd>{localizedCar.engine}</dd></div> : null}
              {localizedCar.fuel !== "—" ? <div><dt>{copy.vehicle.fuel}</dt><dd>{localizedCar.fuel}</dd></div> : null}
              {localizedCar.seats ? (
                <div><dt>{copy.vehicle.capacity}</dt><dd>{localizedCar.seats}</dd></div>
              ) : null}
            </dl>
          </section>

          {car.verifiedDetails?.equipment?.length ? <section className="vehicle-details">
            <h2>{locale === "ru" ? "Подтверждённая комплектация" : "Confirmed equipment"}</h2>
            <ul>{car.verifiedDetails.equipment.map((item) => <li key={item.en}>{item[locale]}</li>)}</ul>
          </section> : null}
          {car.verifiedDetails?.luggage?.photos.length ? <section className="vehicle-details">
            <div><h2>{locale === "ru" ? "Багажник и конфигурация сидений" : "Luggage space and seat configuration"}</h2>
            <p>{car.verifiedDetails.luggage.configuration[locale]}</p>
            {car.verifiedDetails.luggage.note ? <p>{car.verifiedDetails.luggage.note[locale]}</p> : null}</div>
            <div>{car.verifiedDetails.luggage.photos.map((photo) => <img key={photo} src={photo} loading="lazy" alt={car.verifiedDetails!.luggage!.configuration[locale]} />)}</div>
          </section> : null}

          <section className="vehicle-terms" aria-labelledby="terms-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--dark">{copy.vehicle.termsEyebrow}</p>
                <h2 id="terms-title">{copy.vehicle.termsTitle}</h2>
              </div>
              <p>{copy.vehicle.termsIntro}</p>
            </div>

            <div className="vehicle-terms__grid">
              <article>
                <span>01</span>
                <h3>{copy.vehicle.deposit}</h3>
                <strong>{car.deposit.toLocaleString(copy.numberLocale)} ฿</strong>
                <p>{copy.vehicle.depositNote}</p>
                {car.category !== "bikes" ? <p>{policyCopy(locale).depositReturn}</p> : null}
                {car.category !== "bikes" ? <p>{policyCopy(locale).carBooking}</p> : null}
              </article>
              <article>
                <span>02</span>
                <h3>{copy.vehicle.insurance}</h3>
                {insurance ? (
                  <>
                    <strong>{locale === "ru" ? "Опубликованные условия Sunny" : "Sunny’s published terms"}</strong>
                    <p>{copy.vehicle.insuranceExcess}: {insurance.excessThb?.toLocaleString(copy.numberLocale)} ฿. {locale === "ru" ? insurance.summary : insurance.summaryEn}</p>
                    <small>{locale === "ru" ? insurance.exclusions[0] : insurance.exclusionsEn[0]}</small>
                  </>
                ) : (
                  <>
                    <strong>{copy.vehicle.noInsuranceShort}</strong>
                    <p>{copy.vehicle.noInsurance}</p>
                  </>
                )}
              </article>
              <article>
                <span>03</span>
                <h3>{copy.vehicle.deliveryTitle}</h3>
                <strong>{copy.vehicle.airport}: {deliveryAirport?.toLocaleString(copy.numberLocale) ?? "0"} ฿</strong>
                <p>{copy.vehicle.city}: {deliveryCity?.toLocaleString(copy.numberLocale) ?? "500"} ฿</p>
                <small>{policyCopy(locale).delivery}</small>
              </article>
              <article>
                <span>04</span>
                <h3>{copy.vehicle.handoverTitle}</h3>
                <strong>{copy.vehicle.fullTank}</strong>
                <p>{car.terms.handover?.cleanVehicle ? copy.vehicle.cleanVehicle : copy.vehicle.realPhotosValue}</p>
              </article>
              {car.terms.childSeat?.available ? (
                <article>
                  <span>05</span>
                  <h3>{copy.vehicle.childSeat}</h3>
                  <strong>{copy.vehicle.childSeatFree}</strong>
                  <p>{copy.vehicle.childSeatNote}</p>
                </article>
              ) : null}
            </div>
          </section>

          <section className="vehicle-faq" aria-labelledby="vehicle-faq-title">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.vehicle.faqEyebrow}</p>
              <h2 id="vehicle-faq-title">{copy.vehicle.faqTitle}</h2>
              <p>{copy.vehicle.faqIntro}</p>
            </div>
            <div className="vehicle-faq__list">
              {faq.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}<span aria-hidden="true">+</span></summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
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
