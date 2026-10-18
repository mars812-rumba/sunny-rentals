import type { Metadata } from "next";

import { MarketingHomePage } from "@/components/marketing-home-page";
import { languageAlternates } from "@/lib/i18n";

const title = "Car and scooter rental in Phuket";
const description =
  "Cars and scooters for rent in Phuket with photos, seasonal rates and booking through Telegram.";

export const metadata: Metadata = {
  title,
  description,
  other: { "content-language": "en" },
  alternates: languageAlternates("en"),
  openGraph: {
    type: "website",
    siteName: "Sunny Rentals",
    images: [{ url: "/og-image.jpg.webp", width: 1200, height: 630, alt: "Sunny Rentals — car and scooter rental in Phuket" }],
    locale: "en_US",
    alternateLocale: ["ru_RU"],
    url: "/en/",
    title,
    description,
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og-image.jpg.webp"] },
};

export default function EnglishHomePage() {
  return <MarketingHomePage locale="en" />;
}
