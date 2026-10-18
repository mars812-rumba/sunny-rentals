import { BookingSearch } from "@/components/booking-search";
import { getMessages, type Locale } from "@/lib/i18n";

export function MarketingHero({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).hero;

  return (
    <>
      <link rel="preload" as="image" href="/images/atmosphere/kata-sunset.webp" media="(min-width: 701px)" />
      <link rel="preload" as="image" href="/images/atmosphere/kata-sunset-mobile.webp" media="(max-width: 700px)" />
      <section className="marketing-hero marketing-hero--simple">
        <div className="marketing-hero__backdrop" aria-hidden="true" />
        <div className="shell marketing-hero__content">
          <div className="marketing-hero__copy">
            <h1>{copy.title}</h1>
            <strong className="hero-promise">{copy.promise}</strong>
            <p>{copy.subtitle}</p>
          </div>

          <BookingSearch locale={locale} variant="hero" />
        </div>
      </section>
    </>
  );
}
