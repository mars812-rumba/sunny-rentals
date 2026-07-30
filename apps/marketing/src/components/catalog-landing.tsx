import { FleetSection } from "@/components/fleet-section";
import { SiteHeader } from "@/components/site-header";
import { getMessages, type Locale } from "@/lib/i18n";

export function CatalogLanding({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);

  return (
    <main lang={copy.htmlLang}>
      <SiteHeader locale={locale} currentPath="/cars" />
      <header className="catalog-hero">
        <div className="shell">
          <p className="eyebrow">{copy.catalog.eyebrow}</p>
          <h1>{copy.catalog.title}</h1>
          <p>{copy.catalog.intro}</p>
        </div>
      </header>
      <FleetSection locale={locale} />
    </main>
  );
}
