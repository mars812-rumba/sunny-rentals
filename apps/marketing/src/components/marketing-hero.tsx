import { BookingSearch } from "@/components/booking-search";
import { HeroPreloader } from "@/components/hero-preloader";
import {
  HeroVehicleCarousel,
  type HeroCarouselVehicle,
} from "@/components/hero-vehicle-carousel";
import { getMessages, type Locale } from "@/lib/i18n";

export function MarketingHero({
  locale,
  vehicles,
  fleetSize,
}: {
  locale: Locale;
  vehicles: HeroCarouselVehicle[];
  fleetSize: number;
}) {
  const copy = getMessages(locale).hero;
  const messages = getMessages(locale);
  const [featuredVehicle] = vehicles;

  return (
    <>
      <HeroPreloader label={copy.loading} vehicleImage={featuredVehicle.image} />
      <section className="marketing-hero">
      <div className="marketing-hero__backdrop" aria-hidden="true" />
      <div className="shell marketing-hero__content">
        <div className="marketing-hero__lead">
          <div className="marketing-hero__copy">
            <p className="hero-kicker">{copy.eyebrow}</p>
            <h1>{copy.title}</h1>
            <strong className="hero-promise">{copy.promise}</strong>
            <p>{copy.subtitle}</p>
            <div className="hero-proof" aria-label={copy.proofAria}>
              <span className="hero-proof__fleet"><strong>{fleetSize}</strong> {copy.fleetProof}</span>
              <span className="hero-proof__real">{copy.realPhotosProof}</span>
            </div>
          </div>

          <HeroVehicleCarousel
            vehicles={vehicles}
            numberLocale={messages.numberLocale}
            labels={{
              carousel: copy.carouselAria,
              vehicleDetails: copy.vehicleDetails,
              realVehicle: copy.realVehicle,
              from: copy.from,
              perDay: copy.perDay,
              deposit: copy.deposit,
              depositSeparate: copy.depositSeparate,
              imageAlt: copy.imageAlt,
              showVehicle: copy.showVehicle,
            }}
          />
        </div>

        <BookingSearch locale={locale} variant="hero" />
      </div>
      </section>
    </>
  );
}
