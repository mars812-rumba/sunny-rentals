import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { siteConfig } from "@/lib/site";
import { SiteFooter } from "@/components/site-footer";

import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.title} | ${siteConfig.name}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: "/og-image.jpg.webp",
        width: 1200,
        height: 630,
        alt: "Sunny Rentals — аренда транспорта на Пхукете",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
    images: ["/og-image.jpg.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#075985",
  colorScheme: "light",
};

export default function DocumentLayout({ children, locale }: Readonly<{ children: ReactNode; locale: "ru" | "en" }>) {
  return (
    <html lang={locale}>
      <head>
        <link rel="preload" as="font" href="/fonts/manrope-v20-latin.woff2" type="font/woff2" crossOrigin="anonymous" />
        {locale === "ru" && <link rel="preload" as="font" href="/fonts/manrope-v20-cyrillic.woff2" type="font/woff2" crossOrigin="anonymous" />}
      </head>
      <body>{children}<SiteFooter locale={locale} /></body>
    </html>
  );
}
