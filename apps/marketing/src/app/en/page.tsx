import type { Metadata } from "next";

import { MarketingHomePage } from "@/components/marketing-home-page";
import { languageAlternates } from "@/lib/i18n";

const title = "Car and scooter rental in Phuket";
const description =
  "Rent cars and scooters in Phuket with clear pricing, island-wide delivery and support throughout your booking.";

export const metadata: Metadata = {
  title,
  description,
  other: { "content-language": "en" },
  alternates: languageAlternates("en"),
  openGraph: {
    locale: "en_US",
    alternateLocale: ["ru_RU"],
    url: "/en",
    title,
    description,
  },
};

export default function EnglishHomePage() {
  return <MarketingHomePage locale="en" />;
}
