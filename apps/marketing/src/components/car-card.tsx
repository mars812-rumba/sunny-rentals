import Link from "next/link";

import { CarGallery } from "@/components/car-gallery";
import { getLocalizedCar, type MarketingCar } from "@/content/cars";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { createModelHandoffLink } from "@/lib/telegram";

export function CarCard({ car, locale }: { car: MarketingCar; locale: Locale }) {
  const copy = getMessages(locale);
  const localizedCar = getLocalizedCar(car, locale);
  const carPath = localePath(locale, `/cars/${car.slug}`);

  return (
    <article className="car-card">
      <CarGallery
        href={carPath}
        images={car.images?.length ? car.images : [car.image]}
        alt={`${car.brand} ${car.model} ${car.year} ${copy.fleet.imageAlt}`}
        year={car.year}
        previousLabel={copy.fleet.previousPhoto}
        nextLabel={copy.fleet.nextPhoto}
        photoLabel={copy.fleet.photo}
      />

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

        <p className="car-card__deposit">
          {copy.fleet.deposit}: {car.deposit.toLocaleString(copy.numberLocale)} ฿
        </p>

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
