import Link from "next/link";
import Image from "next/image";

import { BookingSearch } from "@/components/booking-search";
import { HeroPreloader } from "@/components/hero-preloader";
import { getMessages, localePath, type Locale } from "@/lib/i18n";

interface HeroVehicle {
  name: string;
  image: string;
  slug: string;
  year: number | null;
  fromPrice: number;
  deposit: number;
}

export function MarketingHero({
  locale,
  vehicle,
  fleetSize,
}: {
  locale: Locale;
  vehicle: HeroVehicle;
  fleetSize: number;
}) {
  const copy = getMessages(locale).hero;
  const price = new Intl.NumberFormat(getMessages(locale).numberLocale).format(vehicle.fromPrice);
  const deposit = new Intl.NumberFormat(getMessages(locale).numberLocale).format(vehicle.deposit);

  return (
    <>
      <HeroPreloader label={copy.loading} vehicleImage={vehicle.image} />
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
              <span><strong>{fleetSize}</strong> {copy.fleetProof}</span>
              <span>{copy.locationProof}</span>
              <span>{copy.realPhotosProof}</span>
            </div>
          </div>

          <Link
            className="hero-vehicle"
            href={localePath(locale, `/cars/${vehicle.slug}`)}
            aria-label={`${copy.vehicleDetails}: ${vehicle.name}`}
          >
            <div className="hero-vehicle__photo">
              <Image
                src={vehicle.image}
                alt={`${vehicle.name} — ${copy.imageAlt}`}
                width={1200}
                height={900}
                sizes="(max-width: 700px) calc(100vw - 2rem), (max-width: 1180px) 52vw, 640px"
                priority
              />
            </div>
            <div className="hero-vehicle__caption">
              <span>
                <small>{copy.realVehicle}</small>
                <strong>{vehicle.name}{vehicle.year ? ` · ${vehicle.year}` : ""}</strong>
              </span>
              <span className="hero-vehicle__price">
                <small>{copy.from}</small>
                <strong>{price} ฿</strong>
                <em>{copy.perDay}</em>
              </span>
            </div>
            <p>{copy.deposit}: {deposit} ฿ · {copy.depositSeparate}</p>
          </Link>
        </div>

        <BookingSearch locale={locale} variant="hero" />
      </div>
      </section>
    </>
  );
}
