"use client";

import { useEffect, useMemo, useState } from "react";

import { CarCard } from "@/components/car-card";
import { RentalDatesProvider, useRentalDates } from "@/components/rental-dates-context";
import {
  getLocalizedCategory,
  vehicleCategories,
  type MarketingCar,
  type VehicleCategory,
} from "@/content/cars";
import { getMessages, type Locale } from "@/lib/i18n";
import { calculateRentalPrice, getRentalDays, toLocalDateKey } from "@/lib/pricing";

type CategoryFilter = "all" | VehicleCategory;

const priceOptions = [500, 750, 1000, 1500, 2000] as const;

function isCategory(value: string | null): value is VehicleCategory {
  return vehicleCategories.some((category) => category.id === value);
}

function isDateKey(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export function CatalogBrowser({
  cars,
  locale,
}: {
  cars: MarketingCar[];
  locale: Locale;
}) {
  return (
    <RentalDatesProvider>
      <CatalogBrowserContent cars={cars} locale={locale} />
    </RentalDatesProvider>
  );
}

function CatalogBrowserContent({ cars, locale }: { cars: MarketingCar[]; locale: Locale }) {
  const copy = getMessages(locale);
  const { setSelection } = useRentalDates();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [queryReady, setQueryReady] = useState(false);
  const today = useMemo(() => toLocalDateKey(), []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const queryCategory = query.get("category");
    const queryStart = query.get("start");
    const queryEnd = query.get("end");
    const queryMaxPrice = Number(query.get("maxPrice"));

    const restoreQuery = window.setTimeout(() => {
      if (isCategory(queryCategory)) setCategory(queryCategory);
      if (isDateKey(queryStart)) setStartDate(queryStart);
      if (isDateKey(queryEnd)) setEndDate(queryEnd);
      if (priceOptions.includes(queryMaxPrice as (typeof priceOptions)[number])) {
        setMaxPrice(queryMaxPrice);
      }
      if (isDateKey(queryStart) && isDateKey(queryEnd) && queryEnd > queryStart) {
        setSelection({ startDate: queryStart, endDate: queryEnd });
      }
      setQueryReady(true);
    }, 0);

    return () => window.clearTimeout(restoreQuery);
  }, [setSelection]);

  useEffect(() => {
    if (!queryReady) return;
    const query = new URLSearchParams();
    if (category !== "all") query.set("category", category);
    if (startDate) query.set("start", startDate);
    if (endDate) query.set("end", endDate);
    if (maxPrice) query.set("maxPrice", String(maxPrice));
    const suffix = query.size ? `?${query.toString()}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${suffix}`);

    setSelection(
      startDate && endDate && endDate > startDate
        ? { startDate, endDate }
        : null,
    );
  }, [category, startDate, endDate, maxPrice, queryReady, setSelection]);

  const selectedDays = startDate && endDate && endDate > startDate
    ? getRentalDays(startDate, endDate)
    : 0;
  const visibleCars = cars.filter((car) => {
    if (category !== "all" && car.category !== category) return false;
    if (!maxPrice) return true;
    if (!selectedDays) return car.fromPrice <= maxPrice;
    const calculation = calculateRentalPrice(car.pricing, startDate, endDate);
    return calculation.days > 0 && calculation.total / calculation.days <= maxPrice;
  });

  const groupedCars = vehicleCategories.flatMap((item) => {
    const matches = visibleCars.filter((car) => car.category === item.id);
    return matches.length ? [{ category: item, cars: matches }] : [];
  });

  const reset = () => {
    setCategory("all");
    setStartDate("");
    setEndDate("");
    setMaxPrice(null);
  };

  return (
    <section className="catalog-browser" aria-labelledby="catalog-filters-title">
      <div className="shell">
        <div className="catalog-filters" id="catalog-filters">
          <div className="catalog-filters__heading">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.catalog.filtersEyebrow}</p>
              <h2 id="catalog-filters-title">{copy.catalog.filtersTitle}</h2>
            </div>
            <span>{visibleCars.length} {copy.catalog.results}</span>
          </div>

          <div className="catalog-filters__fields">
            <label>
              <span>{copy.catalog.category}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value as CategoryFilter)}>
                <option value="all">{copy.catalog.allCategories}</option>
                {vehicleCategories.map((item) => (
                  <option value={item.id} key={item.id}>
                    {getLocalizedCategory(item.id, locale)?.name ?? item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{copy.catalog.pickupDate}</span>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => {
                  const nextStart = event.target.value;
                  setStartDate(nextStart);
                  if (endDate && endDate <= nextStart) setEndDate("");
                }}
              />
            </label>
            <label>
              <span>{copy.catalog.returnDate}</span>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>
            <label>
              <span>{copy.catalog.maxPrice}</span>
              <select
                value={maxPrice ?? ""}
                onChange={(event) => setMaxPrice(event.target.value ? Number(event.target.value) : null)}
              >
                <option value="">{copy.catalog.anyPrice}</option>
                {priceOptions.map((price) => (
                  <option value={price} key={price}>{copy.catalog.upTo} {price.toLocaleString(copy.numberLocale)} ฿</option>
                ))}
              </select>
            </label>
            <button type="button" onClick={reset}>{copy.catalog.reset}</button>
          </div>
          <p className="catalog-filters__note">{copy.catalog.filterNote}</p>
        </div>

        {groupedCars.length ? (
          <div className="catalog-results" aria-live="polite">
            {groupedCars.map(({ category: item, cars: categoryCars }) => {
              const localized = getLocalizedCategory(item.id, locale) ?? item;
              return (
                <section className="catalog-results__group" key={item.id} aria-labelledby={`catalog-${item.id}`}>
                  <div className="fleet-group__heading">
                    <div>
                      <h3 id={`catalog-${item.id}`}>{localized.name}</h3>
                      <p>{localized.description}</p>
                    </div>
                    <span>{categoryCars.length} {copy.fleet.variants}</span>
                  </div>
                  <div className="catalog-results__grid">
                    {categoryCars.map((car) => <CarCard car={car} locale={locale} key={car.slug} />)}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="catalog-empty" aria-live="polite">
            <h3>{copy.catalog.emptyTitle}</h3>
            <p>{copy.catalog.emptyText}</p>
            <button type="button" onClick={reset}>{copy.catalog.reset}</button>
          </div>
        )}
      </div>
    </section>
  );
}
