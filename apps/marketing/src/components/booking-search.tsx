"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

import { getMessages, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

const categoryCodes: Record<string, string> = {
  compact: "c",
  sedan: "d",
  suv: "s",
  "7s": "7",
  bikes: "b",
};

const locationCodes: Record<string, string> = {
  airport: "a",
  hotel: "h",
  villa: "v",
};

const toCompactDate = (value: string) => value.replaceAll("-", "");

export function BookingSearch({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).booking;
  const [category, setCategory] = useState("compact");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pickup, setPickup] = useState("airport");
  const [returnLocation, setReturnLocation] = useState("airport");
  const [error, setError] = useState("");

  const today = useMemo(() => {
    const localNow = new Date();
    localNow.setMinutes(localNow.getMinutes() - localNow.getTimezoneOffset());
    return localNow.toISOString().slice(0, 10);
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!startDate || !endDate) {
      setError(copy.dateRequired);
      return;
    }

    if (endDate < startDate) {
      setError(copy.dateOrder);
      return;
    }

    const payload = [
      "sr1_",
      categoryCodes[category],
      toCompactDate(startDate),
      toCompactDate(endDate),
      locationCodes[pickup],
      locationCodes[returnLocation],
    ].join("");

    setError("");
    window.open(`${siteConfig.telegramBotUrl}?start=${payload}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="booking-search" id="booking">
      <div className="shell">
        <div className="booking-search__panel">
          <div className="booking-search__heading">
            <p className="eyebrow eyebrow--dark">{copy.eyebrow}</p>
            <h2>{copy.title}</h2>
            <p>{copy.intro}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              <span>{copy.category}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="compact">{copy.categories[0]}</option>
                <option value="sedan">{copy.categories[1]}</option>
                <option value="suv">{copy.categories[2]}</option>
                <option value="7s">{copy.categories[3]}</option>
                <option value="bikes">{copy.categories[4]}</option>
              </select>
            </label>

            <label>
              <span>{copy.pickupDate}</span>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value);
                  if (endDate && endDate < event.target.value) setEndDate("");
                }}
              />
            </label>

            <label>
              <span>{copy.returnDate}</span>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label>
              <span>{copy.pickup}</span>
              <select value={pickup} onChange={(event) => setPickup(event.target.value)}>
                <option value="airport">{copy.locations[0]}</option>
                <option value="hotel">{copy.locations[1]}</option>
                <option value="villa">{copy.locations[2]}</option>
              </select>
            </label>

            <label>
              <span>{copy.returnLocation}</span>
              <select
                value={returnLocation}
                onChange={(event) => setReturnLocation(event.target.value)}
              >
                <option value="airport">{copy.locations[0]}</option>
                <option value="hotel">{copy.locations[1]}</option>
                <option value="villa">{copy.locations[2]}</option>
              </select>
            </label>

            <button type="submit">
              {copy.continue}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {error ? <p className="booking-search__error" role="alert">{error}</p> : null}
          <p className="booking-search__note">
            {copy.note}
          </p>
        </div>
      </div>
    </section>
  );
}
