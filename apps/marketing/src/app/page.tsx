import { BookingSearch } from "@/components/booking-search";
import { FleetSection } from "@/components/fleet-section";
import { MarketingHero } from "@/components/marketing-hero";
import { SiteHeader } from "@/components/site-header";
import { StickyContactMenu } from "@/components/sticky-contact-menu";
import { TrustContent } from "@/components/trust-content";
import { siteConfig } from "@/lib/site";

export default function HomePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AutoRental",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
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
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <SiteHeader />
      <MarketingHero />
      <BookingSearch />
      <FleetSection />
      <TrustContent />
      <StickyContactMenu />
    </main>
  );
}
