import type { Metadata } from "next";

import { MarketingHomePage } from "@/components/marketing-home-page";
import { languageAlternates } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  other: { "content-language": "ru" },
  alternates: languageAlternates("ru"),
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    images: [{ url: "/og-image.jpg.webp", width: 1200, height: 630, alt: "Sunny Rentals — аренда транспорта на Пхукете" }],
    locale: "ru_RU",
    alternateLocale: ["en_US"],
    url: "/",
    title: siteConfig.title,
    description: siteConfig.description,
  },
};

export default function HomePage() {
  return <MarketingHomePage locale="ru" />;
}
