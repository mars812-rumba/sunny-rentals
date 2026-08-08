"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import type { VehicleCategory } from "@/content/cars";

export interface HeroCarouselVehicle {
  name: string;
  image: string;
  href: string;
  category: VehicleCategory;
  year: number | null;
  fromPrice: number;
  deposit: number;
}

interface HeroCarouselLabels {
  carousel: string;
  vehicleDetails: string;
  realVehicle: string;
  from: string;
  perDay: string;
  deposit: string;
  depositSeparate: string;
  imageAlt: string;
  showVehicle: string;
}

function firstVehicleFromEveryCategory(vehicles: HeroCarouselVehicle[]) {
  const categories = new Set<VehicleCategory>();

  return vehicles.filter((vehicle) => {
    if (categories.has(vehicle.category)) return false;
    categories.add(vehicle.category);
    return true;
  });
}

function shuffle<T>(items: T[]) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function randomVehicleFromEveryCategory(vehicles: HeroCarouselVehicle[]) {
  const [featured] = vehicles;
  if (!featured) return [];

  const grouped = new Map<VehicleCategory, HeroCarouselVehicle[]>();
  for (const vehicle of vehicles) {
    const group = grouped.get(vehicle.category) ?? [];
    group.push(vehicle);
    grouped.set(vehicle.category, group);
  }

  const otherCategories = shuffle(
    [...grouped.keys()].filter((category) => category !== featured.category),
  );
  const randomVehicles = otherCategories.flatMap((category) => {
    const group = grouped.get(category) ?? [];
    if (!group.length) return [];
    return [group[Math.floor(Math.random() * group.length)]];
  });

  return [featured, ...randomVehicles];
}

export function HeroVehicleCarousel({
  vehicles,
  labels,
  numberLocale,
}: {
  vehicles: HeroCarouselVehicle[];
  labels: HeroCarouselLabels;
  numberLocale: string;
}) {
  const initialSlides = useMemo(() => firstVehicleFromEveryCategory(vehicles), [vehicles]);
  const [slides, setSlides] = useState(initialSlides);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(0);
  const pointerStartXRef = useRef<number | null>(null);
  const draggedRef = useRef(false);

  useEffect(() => {
    // Keep the server-rendered first vehicle stable, then randomise one real
    // vehicle from every other category after hydration.
    const frame = window.requestAnimationFrame(() => {
      setSlides(randomVehicleFromEveryCategory(vehicles));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [vehicles]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches || paused || slides.length < 2) return;

    const interval = window.setInterval(() => {
      if (document.hidden) return;

      const nextIndex = (activeIndexRef.current + 1) % slides.length;
      trackRef.current?.scrollTo({
        left: (trackRef.current?.clientWidth ?? 0) * nextIndex,
        behavior: "smooth",
      });
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [paused, slides.length]);

  const showSlide = (index: number) => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    trackRef.current?.scrollTo({
      left: (trackRef.current?.clientWidth ?? 0) * index,
      behavior: reducedMotion ? "auto" : "smooth",
    });
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  return (
    <div
      className="hero-vehicle-carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.carousel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false);
      }}
    >
      <div
        ref={trackRef}
        className="hero-vehicle-carousel__track"
        onScroll={(event) => {
          const width = event.currentTarget.clientWidth;
          if (!width) return;
          const index = Math.round(event.currentTarget.scrollLeft / width);
          if (index !== activeIndexRef.current) {
            activeIndexRef.current = index;
            setActiveIndex(index);
          }
        }}
        onPointerDown={(event) => {
          pointerStartXRef.current = event.clientX;
          draggedRef.current = false;
          setPaused(true);
        }}
        onPointerMove={(event) => {
          if (pointerStartXRef.current === null) return;
          if (Math.abs(event.clientX - pointerStartXRef.current) > 8) draggedRef.current = true;
        }}
        onPointerUp={() => {
          pointerStartXRef.current = null;
          window.setTimeout(() => setPaused(false), 1200);
        }}
        onPointerCancel={() => {
          pointerStartXRef.current = null;
          setPaused(false);
        }}
      >
        {slides.map((vehicle, index) => {
          const price = new Intl.NumberFormat(numberLocale).format(vehicle.fromPrice);
          const deposit = new Intl.NumberFormat(numberLocale).format(vehicle.deposit);

          return (
            <Link
              key={`${vehicle.category}-${vehicle.href}`}
              className="hero-vehicle"
              href={vehicle.href}
              aria-label={`${labels.vehicleDetails}: ${vehicle.name}`}
              aria-hidden={index !== activeIndex}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={(event) => {
                if (draggedRef.current) event.preventDefault();
              }}
            >
              <div className="hero-vehicle__photo">
                <Image
                  src={vehicle.image}
                  alt={`${vehicle.name} — ${labels.imageAlt}`}
                  width={1200}
                  height={900}
                  sizes="(max-width: 700px) calc(100vw - 2rem), (max-width: 1180px) 52vw, 640px"
                  priority={index === 0}
                />
              </div>
              <div className="hero-vehicle__caption">
                <span>
                  <small>{labels.realVehicle}</small>
                  <strong>{vehicle.name}{vehicle.year ? ` · ${vehicle.year}` : ""}</strong>
                </span>
                <span className="hero-vehicle__price">
                  <small>{labels.from}</small>
                  <strong>{price} ฿</strong>
                  <em>{labels.perDay}</em>
                </span>
              </div>
              <p>{labels.deposit}: {deposit} ฿ · {labels.depositSeparate}</p>
            </Link>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div className="hero-vehicle-carousel__dots" aria-label={labels.carousel}>
          {slides.map((vehicle, index) => (
            <button
              key={`${vehicle.category}-${vehicle.href}`}
              type="button"
              className={index === activeIndex ? "is-active" : undefined}
              aria-label={`${labels.showVehicle}: ${vehicle.name}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => showSlide(index)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
