"use client";

import { useMemo, useState } from "react";
import type { FormEvent } from "react";

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

export function BookingSearch() {
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
      setError("Укажите даты начала и окончания аренды.");
      return;
    }

    if (endDate < startDate) {
      setError("Дата возврата должна быть позже даты получения.");
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
            <p className="eyebrow eyebrow--dark">Онлайн-подбор</p>
            <h2>Транспорт на ваши даты</h2>
            <p>Заполните параметры здесь, затем подтвердите профиль в Telegram.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <label>
              <span>Категория</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="compact">Компакт</option>
                <option value="sedan">Седан</option>
                <option value="suv">SUV</option>
                <option value="7s">7+ мест</option>
                <option value="bikes">Байк</option>
              </select>
            </label>

            <label>
              <span>Получение</span>
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
              <span>Возврат</span>
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <label>
              <span>Выдача</span>
              <select value={pickup} onChange={(event) => setPickup(event.target.value)}>
                <option value="airport">Аэропорт</option>
                <option value="hotel">Отель</option>
                <option value="villa">Вилла</option>
              </select>
            </label>

            <label>
              <span>Возврат авто</span>
              <select
                value={returnLocation}
                onChange={(event) => setReturnLocation(event.target.value)}
              >
                <option value="airport">Аэропорт</option>
                <option value="hotel">Отель</option>
                <option value="villa">Вилла</option>
              </select>
            </label>

            <button type="submit">
              Продолжить в Telegram
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {error ? <p className="booking-search__error" role="alert">{error}</p> : null}
          <p className="booking-search__note">
            Бронь попадёт в CRM только после вашего подтверждения в WebApp.
          </p>
        </div>
      </div>
    </section>
  );
}
