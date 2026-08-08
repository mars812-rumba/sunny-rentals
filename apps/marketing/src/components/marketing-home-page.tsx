import { FleetSection } from "@/components/fleet-section";
import { MarketingHero } from "@/components/marketing-hero";
import { RentalDatesProvider } from "@/components/rental-dates-context";
import { SiteHeader } from "@/components/site-header";
import { StickyContactMenu } from "@/components/sticky-contact-menu";
import { TrustContent } from "@/components/trust-content";
import { getCarBySlug, getLocalizedCar, marketingCars } from "@/content/cars";
import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { absoluteUrl, siteConfig } from "@/lib/site";

export function MarketingHomePage({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);
  const featuredSource = getCarBySlug("toyota-yaris") ?? marketingCars[0];
  const heroSources = [
    featuredSource,
    ...marketingCars.filter((car) => car.slug !== featuredSource.slug),
  ];
  const heroVehicles = heroSources.map((car) => {
    const localizedCar = getLocalizedCar(car, locale);
    return {
      name: `${localizedCar.brand} ${localizedCar.model}`,
      image: localizedCar.image,
      href: localePath(locale, `/cars/${localizedCar.slug}`),
      category: localizedCar.category,
      year: localizedCar.year,
      fromPrice: localizedCar.fromPrice,
      deposit: localizedCar.deposit,
    };
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: siteConfig.name,
    url: absoluteUrl(localePath(locale)),
    description: copy.hero.subtitle,
    inLanguage: copy.htmlLang,
    telephone: "+66842039140",
    priceRange: "฿฿",
    areaServed: {
      "@type": "AdministrativeArea",
      name: "Phuket",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Phuket",
      addressCountry: "TH",
    },
    sameAs: [siteConfig.telegramBotUrl, siteConfig.whatsappUrl],
  };

  return (
    <main lang={copy.htmlLang}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader locale={locale} />
      <RentalDatesProvider>
        <MarketingHero
          locale={locale}
          fleetSize={marketingCars.length}
          vehicles={heroVehicles}
        />
        <FleetSection locale={locale} previewLimit={3} />
      </RentalDatesProvider>
      <TrustContent locale={locale} />
      <StickyContactMenu locale={locale} />
    </main>
  );
}
