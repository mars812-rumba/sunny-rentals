import Link from "next/link";

import type { MarketingCar } from "@/content/cars";
import { createModelHandoffLink } from "@/lib/telegram";

export function CarCard({ car }: { car: MarketingCar }) {
  return (
    <article className="car-card">
      <Link className="car-card__media" href={`/cars/${car.slug}`} aria-label={`Подробнее: ${car.brand} ${car.model}`}>
        {/* Public fleet photos remain served by the existing /images_web route. */}
        <img src={car.image} alt={`${car.brand} ${car.model} ${car.year} в аренду на Пхукете`} loading="lazy" />
        <span className="car-card__year">{car.year}</span>
      </Link>

      <div className="car-card__body">
        <div className="car-card__heading">
          <div>
            <p>{car.brand}</p>
            <h3>
              <Link href={`/cars/${car.slug}`}>{car.model}</Link>
            </h3>
          </div>
          <div className="car-card__price">
            <span>от</span>
            <strong>{car.fromPrice.toLocaleString("ru-RU")} ฿</strong>
            <small>/ день</small>
          </div>
        </div>

        <ul className="car-card__specs" aria-label="Основные характеристики">
          <li>{car.transmission}</li>
          <li>{car.seats}</li>
          <li>{car.fuel}</li>
        </ul>

        <div className="car-card__actions">
          <Link className="text-link" href={`/cars/${car.slug}`}>
            Подробнее
          </Link>
          <a
            className="mini-cta"
            href={createModelHandoffLink(car)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Забронировать
          </a>
        </div>
      </div>
    </article>
  );
}
