import type { Metadata } from "next";

import { CatalogLanding } from "@/components/catalog-landing";
import { languageAlternates } from "@/lib/i18n";

const title = "Rental fleet in Phuket";
const description =
  "Explore Sunny Rentals cars, SUVs, seven-seat vehicles and scooters in Phuket. View photos and prices, then book through Telegram.";

export const metadata: Metadata = {
  title,
  description,
  other: { "content-language": "en" },
  alternates: languageAlternates("en", "/cars"),
  openGraph: {
    locale: "en_US",
    alternateLocale: ["ru_RU"],
    title: "Sunny Rentals fleet in Phuket",
    description: "Choose a car or scooter and continue your booking in Telegram.",
    url: "/en/cars",
  },
};

export default function EnglishCarsPage() {
  return <CatalogLanding locale="en" />;
}
