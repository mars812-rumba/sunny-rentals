import type { Metadata } from "next";

import { CatalogLanding } from "@/components/catalog-landing";
import { languageAlternates } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Автопарк в аренду на Пхукете",
  description:
    "Автомобили, кроссоверы, семиместные машины и байки Sunny Rentals. Фотографии, цены и бронирование через Telegram.",
  other: { "content-language": "ru" },
  alternates: languageAlternates("ru", "/cars"),
  openGraph: {
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    title: "Автопарк Sunny Rentals на Пхукете",
    description: "Выберите автомобиль или байк и продолжите бронирование в Telegram.",
    url: "/cars",
  },
};

export default function CarsPage() {
  return <CatalogLanding locale="ru" />;
}
