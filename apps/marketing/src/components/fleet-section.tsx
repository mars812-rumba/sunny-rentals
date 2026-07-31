import Link from "next/link";

import { CarCard } from "@/components/car-card";
import { CarRail } from "@/components/car-rail";
import {
  getCarsByCategory,
  getLocalizedCategory,
  vehicleCategories,
} from "@/content/cars";
import { getMessages, localePath, type Locale } from "@/lib/i18n";

export function FleetSection({
  locale,
  compact = false,
}: {
  locale: Locale;
  compact?: boolean;
}) {
  const copy = getMessages(locale).fleet;
  const categories = compact ? vehicleCategories.slice(0, 3) : vehicleCategories;

  return (
    <section className="fleet-section" id="fleet">
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow--dark">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
          </div>
          <p>{copy.intro}</p>
        </div>

        <div className="fleet-groups">
          {categories.map((category) => {
            const localizedCategory = getLocalizedCategory(category.id, locale) ?? category;
            const cars = getCarsByCategory(category.id);

            return (
            <section className="fleet-group" key={category.id} aria-labelledby={`category-${category.id}`}>
              <div className="fleet-group__heading">
                <div>
                  <h3 id={`category-${category.id}`}>{localizedCategory.name}</h3>
                  <p>{localizedCategory.description}</p>
                </div>
                <span>{cars.length} {copy.variants}</span>
              </div>

              <CarRail
                previousLabel={copy.previousCars}
                nextLabel={copy.nextCars}
              >
                {cars.map((car) => (
                  <CarCard car={car} locale={locale} key={car.slug} />
                ))}
              </CarRail>
            </section>
          )})}
        </div>

        {compact ? (
          <div className="fleet-section__footer">
            <Link className="button button--ink" href={localePath(locale, "/cars")}>
              {copy.all}
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
