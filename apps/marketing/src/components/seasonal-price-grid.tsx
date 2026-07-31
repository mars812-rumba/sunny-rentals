"use client";

import { useEffect, useState } from "react";

import type { SeasonKey, SeasonalPricing } from "@/content/cars";
import { getMessages, type Locale } from "@/lib/i18n";
import { getPhuketSeason } from "@/lib/pricing";

const periods = [
  ["price_1_6", "1–6"],
  ["price_7_14", "7–14"],
  ["price_15_29", "15–29"],
  ["price_30", "30+"],
] as const;

export function SeasonalPriceGrid({
  pricing,
  locale,
  initialSeason,
}: {
  pricing: SeasonalPricing;
  locale: Locale;
  initialSeason: SeasonKey;
}) {
  const copy = getMessages(locale);
  const [season, setSeason] = useState<SeasonKey>(initialSeason);

  useEffect(() => {
    const syncSeason = window.setTimeout(() => {
      setSeason(getPhuketSeason());
    }, 0);

    return () => window.clearTimeout(syncSeason);
  }, []);

  const rates = pricing[season];

  return (
    <section className="price-grid" aria-label={copy.fleet.ratesAria}>
      <div className="price-grid__header">
        <strong>{copy.fleet.rates}</strong>
        <div className="price-grid__seasons" aria-label={copy.fleet.seasonAria}>
          <button
            type="button"
            aria-pressed={season === "low_season"}
            onClick={() => setSeason("low_season")}
          >
            {copy.fleet.lowSeason}
          </button>
          <button
            type="button"
            aria-pressed={season === "high_season"}
            onClick={() => setSeason("high_season")}
          >
            {copy.fleet.highSeason}
          </button>
        </div>
      </div>

      <ul>
        {periods.map(([key, label]) => (
          <li key={key}>
            <span>{label} {copy.fleet.days}</span>
            <strong>{rates[key].toLocaleString(copy.numberLocale)} ฿</strong>
          </li>
        ))}
      </ul>

      <small>
        {copy.fleet.deposit}: {pricing.deposit.toLocaleString(copy.numberLocale)} ฿
      </small>
    </section>
  );
}
