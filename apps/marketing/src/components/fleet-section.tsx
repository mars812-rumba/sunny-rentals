import Link from "next/link";

import { CarCard } from "@/components/car-card";
import { getCarsByCategory, vehicleCategories } from "@/content/cars";

export function FleetSection({ compact = false }: { compact?: boolean }) {
  const categories = compact ? vehicleCategories.slice(0, 3) : vehicleCategories;

  return (
    <section className="fleet-section" id="fleet">
      <div className="shell">
        <div className="section-heading">
          <div>
            <p className="eyebrow eyebrow--dark">Автопарк на острове</p>
            <h2>Выберите свой маршрут</h2>
          </div>
          <p>
            Реальные автомобили Sunny Rentals. Цена «от» указана для аренды от 30 дней
            в низкий сезон.
          </p>
        </div>

        <div className="fleet-groups">
          {categories.map((category) => (
            <section className="fleet-group" key={category.id} aria-labelledby={`category-${category.id}`}>
              <div className="fleet-group__heading">
                <div>
                  <h3 id={`category-${category.id}`}>{category.name}</h3>
                  <p>{category.description}</p>
                </div>
                <span>{getCarsByCategory(category.id).length} варианта</span>
              </div>

              <div className="car-rail">
                {getCarsByCategory(category.id).map((car) => (
                  <CarCard car={car} key={car.slug} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {compact ? (
          <div className="fleet-section__footer">
            <Link className="button button--ink" href="/cars">
              Смотреть весь автопарк
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
