import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CarCard } from "@/components/car-card";
import { SiteHeader } from "@/components/site-header";
import {
  getCarBySlug,
  getCarsByCategory,
  getCategoryById,
  marketingCars,
} from "@/content/cars";
import { absoluteUrl } from "@/lib/site";
import { createModelHandoffLink } from "@/lib/telegram";

type CarPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return marketingCars.map((car) => ({ slug: car.slug }));
}

export async function generateMetadata({ params }: CarPageProps): Promise<Metadata> {
  const { slug } = await params;
  const car = getCarBySlug(slug);

  if (!car) {
    return {};
  }

  const title = `Аренда ${car.brand} ${car.model} на Пхукете`;
  const description = `${car.brand} ${car.model} ${car.year} в аренду на Пхукете от ${car.fromPrice} ฿ в день. Фото, характеристики, доставка и бронирование через Telegram.`;
  const path = `/cars/${car.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      images: [{ url: car.image, alt: `${car.brand} ${car.model}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [car.image],
    },
  };
}

export default async function CarPage({ params }: CarPageProps) {
  const { slug } = await params;
  const car = getCarBySlug(slug);

  if (!car) {
    notFound();
  }

  const category = getCategoryById(car.category);
  const relatedCars = getCarsByCategory(car.category)
    .filter((item) => item.slug !== car.slug)
    .slice(0, 3);
  const telegramLink = createModelHandoffLink(car);
  const pageUrl = absoluteUrl(`/cars/${car.slug}`);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${pageUrl}#vehicle`,
        name: `${car.brand} ${car.model} ${car.year}`,
        image: [absoluteUrl(car.image)],
        description: car.summary,
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
            name: "Главная",
            item: absoluteUrl("/"),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Автопарк",
            item: absoluteUrl("/cars"),
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
    <main>
      <SiteHeader />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />

      <article className="vehicle-page">
        <div className="shell">
          <nav className="breadcrumbs" aria-label="Хлебные крошки">
            <Link href="/">Главная</Link>
            <span aria-hidden="true">/</span>
            <Link href="/cars">Автопарк</Link>
            <span aria-hidden="true">/</span>
            <span>{car.brand} {car.model}</span>
          </nav>

          <div className="vehicle-hero">
            <div className="vehicle-hero__media">
              <img
                src={car.image}
                alt={`${car.brand} ${car.model} ${car.year} в аренду на Пхукете`}
              />
              <span>{category?.shortName}</span>
            </div>

            <div className="vehicle-hero__content">
              <p className="eyebrow eyebrow--dark">Аренда на Пхукете</p>
              <h1>{car.brand} {car.model}</h1>
              <p className="vehicle-hero__year">{car.year} · {car.transmission} · {car.seats}</p>
              <p className="vehicle-hero__summary">{car.summary}</p>

              <div className="booking-ticket">
                <div>
                  <span>Цена при аренде от 30 дней</span>
                  <strong>от {car.fromPrice.toLocaleString("ru-RU")} ฿ <small>/ день</small></strong>
                </div>
                <p>Депозит: {car.deposit.toLocaleString("ru-RU")} ฿</p>
              </div>

              <a
                className="button button--telegram"
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Забронировать через Telegram
              </a>
              <p className="handoff-note">
                После авторизации откроется WebApp с выбранной моделью. Там вы укажете
                даты и место доставки.
              </p>
            </div>
          </div>

          <section className="vehicle-details" aria-labelledby="details-title">
            <div>
              <p className="eyebrow eyebrow--dark">Подробности</p>
              <h2 id="details-title">Подходит для Пхукета</h2>
              <p>{car.bestFor}</p>
              <p>
                Автомобиль можно получить в аэропорту, у отеля или виллы. Точную
                стоимость на ваши даты и доступность конкретного цвета покажет WebApp.
              </p>
            </div>
            <dl>
              <div><dt>Коробка</dt><dd>{car.transmission}</dd></div>
              <div><dt>Двигатель</dt><dd>{car.engine}</dd></div>
              <div><dt>Топливо</dt><dd>{car.fuel}</dd></div>
              <div><dt>Вместимость</dt><dd>{car.seats}</dd></div>
            </dl>
          </section>

          <section className="related-section" aria-labelledby="related-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow eyebrow--dark">Альтернативы</p>
                <h2 id="related-title">Похожие варианты</h2>
              </div>
              <Link className="text-link" href="/cars">Весь автопарк</Link>
            </div>
            <div className="related-grid">
              {relatedCars.map((item) => <CarCard car={item} key={item.slug} />)}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
