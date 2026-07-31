import Link from "next/link";

import { CarGallery } from "@/components/car-gallery";
import {
  getLocalizedCar,
  getLocalizedCategory,
  type MarketingCar,
} from "@/content/cars";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { createModelHandoffLink } from "@/lib/telegram";

export function CarCard({ car, locale }: { car: MarketingCar; locale: Locale }) {
  const copy = getMessages(locale);
  const localizedCar = getLocalizedCar(car, locale);
  const category = getLocalizedCategory(car.category, locale);
  const carPath = localePath(locale, `/cars/${car.slug}`);

  return (
    <article className="car-card">
      <CarGallery
        href={carPath}
        images={car.images?.length ? car.images : [car.image]}
        alt={`${car.brand} ${car.model} ${car.year} ${copy.fleet.imageAlt}`}
        year={car.year}
        rating={car.rating}
        verifiedLabel={copy.fleet.verified}
        previousLabel={copy.fleet.previousPhoto}
        nextLabel={copy.fleet.nextPhoto}
        photoLabel={copy.fleet.photo}
      />

      <div className="car-card__body">
        <div className="car-card__badges">
          <span>{category?.shortName}</span>
          <span>{copy.fleet.deliveryBadge}</span>
        </div>

        <div className="car-card__heading">
          <h3>
            <Link href={carPath}>{car.brand} {car.model}</Link>
          </h3>
          <p>{car.year} · {locale === "en" ? car.colorEn : car.color}</p>
        </div>

        <ul className="car-card__specs" aria-label={copy.fleet.specsAria}>
          <li><SpecIcon type="fuel" /><span>{localizedCar.fuel}</span></li>
          <li><SpecIcon type="transmission" /><span>{localizedCar.transmission}</span></li>
          <li><SpecIcon type="power" /><span>{locale === "en" ? car.powerEn : car.power}</span></li>
          <li><SpecIcon type="engine" /><span>{localizedCar.engine}</span></li>
        </ul>

        <div className="car-card__price">
          <strong>{car.fromPrice.toLocaleString(copy.numberLocale)} ฿</strong>
          <span>{copy.fleet.from} · {copy.fleet.perDay}</span>
          <small>{copy.fleet.deposit}: {car.deposit.toLocaleString(copy.numberLocale)} ฿</small>
        </div>

        <div className="car-card__actions">
          <a
            className="mini-cta"
            href={createModelHandoffLink(car)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {copy.fleet.book} <span aria-hidden="true">→</span>
          </a>
          <Link className="text-link" href={carPath}>
            {copy.fleet.details}
          </Link>
        </div>
      </div>
    </article>
  );
}

function SpecIcon({
  type,
}: {
  type: "fuel" | "transmission" | "power" | "engine";
}) {
  if (type === "power") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m13.5 2-8 11h6l-1 9 8-12h-6l1-8Z" />
      </svg>
    );
  }

  if (type === "fuel") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 21V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17M4 21h13M7 6h7v5H7zM16 7h2l2 3v7a2 2 0 0 1-4 0v-3" />
      </svg>
    );
  }

  if (type === "transmission") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 4v16M18 4v16M6 8h12M12 8v12M6 16h6" />
        <circle cx="6" cy="4" r="1.5" />
        <circle cx="18" cy="4" r="1.5" />
        <circle cx="6" cy="20" r="1.5" />
        <circle cx="12" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 8h11l3 3v7H5zM8 8V5h6v3M2 11h3M2 15h3M19 13h3M9 12v3M13 12v3" />
    </svg>
  );
}
