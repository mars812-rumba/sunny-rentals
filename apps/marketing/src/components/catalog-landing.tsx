import { CatalogBrowser } from "@/components/catalog-browser";
import { SiteHeader } from "@/components/site-header";
import { marketingCars } from "@/content/cars";
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
      <CatalogBrowser cars={marketingCars} locale={locale} />
    </main>
  );
}
