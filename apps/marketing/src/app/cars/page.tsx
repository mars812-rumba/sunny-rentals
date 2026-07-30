import type { Metadata } from "next";

import { FleetSection } from "@/components/fleet-section";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Автопарк в аренду на Пхукете",
  description:
    "Автомобили, кроссоверы, семиместные машины и байки Sunny Rentals. Фотографии, цены и бронирование через Telegram.",
  alternates: {
    canonical: "/cars",
  },
  openGraph: {
    title: "Автопарк Sunny Rentals на Пхукете",
    description: "Выберите автомобиль или байк и продолжите бронирование в Telegram.",
    url: "/cars",
  },
};

export default function CarsPage() {
  return (
    <main>
      <SiteHeader />
      <header className="catalog-hero">
        <div className="shell">
          <p className="eyebrow">Sunny Rentals · Fleet</p>
          <h1>Автопарк на Пхукете</h1>
          <p>
            От компактной Toyota Yaris до семиместных автомобилей и максискутеров.
            Выберите модель, а даты и доставку подтвердите в Telegram WebApp.
          </p>
        </div>
      </header>
      <FleetSection />
    </main>
  );
}
