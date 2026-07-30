import Link from "next/link";

import { getLocalizedCar, type MarketingCar } from "@/content/cars";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { createModelHandoffLink } from "@/lib/telegram";

export function CarCard({ car, locale }: { car: MarketingCar; locale: Locale }) {
  const copy = getMessages(locale);
  const localizedCar = getLocalizedCar(car, locale);
  const carPath = localePath(locale, `/cars/${car.slug}`);

  return (
    <article className="car-card">
      <Link
        className="car-card__media"
        href={carPath}
        aria-label={`${copy.fleet.cardDetails}: ${car.brand} ${car.model}`}
      >
        {/* Public fleet photos remain served by the existing /images_web route. */}
        <img
          src={car.image}
          alt={`${car.brand} ${car.model} ${car.year} ${copy.fleet.imageAlt}`}
          loading="lazy"
        />
        <span className="car-card__year">{car.year}</span>
      </Link>

      <div className="car-card__body">
        <div className="car-card__heading">
          <div>
            <p>{car.brand}</p>
            <h3>
              <Link href={carPath}>{car.model}</Link>
            </h3>
          </div>
          <div className="car-card__price">
            <span>{copy.fleet.from}</span>
            <strong>{car.fromPrice.toLocaleString(copy.numberLocale)} ฿</strong>
            <small>{copy.fleet.perDay}</small>
          </div>
        </div>

        <ul className="car-card__specs" aria-label={copy.fleet.specsAria}>
          <li>{localizedCar.transmission}</li>
          <li>{localizedCar.seats}</li>
          <li>{localizedCar.fuel}</li>
        </ul>

        <div className="car-card__actions">
          <Link className="text-link" href={carPath}>
            {copy.fleet.details}
          </Link>
          <a
            className="mini-cta"
            href={createModelHandoffLink(car)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.fleet.book}
          </a>
        </div>
      </div>
    </article>
  );
}
