"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getMessages, localePath, type Locale } from "@/lib/i18n";

const slides = [
  {
    image: "/vehicles/compact.webp",
    price: "425 ฿",
    category: "compact",
  },
  {
    image: "/vehicles/sedan.webp",
    price: "425 ฿",
    category: "sedan",
  },
  {
    image: "/vehicles/7seat.webp",
    price: "665 ฿",
    category: "7s",
  },
  {
    image: "/vehicles/suv.webp",
    price: "865 ฿",
    category: "suv",
  },
  {
    image: "/vehicles/bike.webp",
    price: "204 ฿",
    category: "bikes",
  },
] as const;

export function MarketingHero({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).hero;
  const [activeSlide, setActiveSlide] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const pointerStart = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 700px)").matches;
    const criticalImages = [
      "/logo.png",
      isMobile ? "/hero_bg_mobile.png" : "/hero_bg.webp",
      slides[0].image,
    ];

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => resolve();
        image.src = src;
      });

    const minimumDisplay = new Promise<void>((resolve) => {
      window.setTimeout(resolve, reducedMotion ? 80 : 420);
    });
    const safetyTimeout = window.setTimeout(() => {
      if (active) setIsReady(true);
    }, 4500);

    Promise.all([...criticalImages.map(preload), minimumDisplay]).then(() => {
      if (!active) return;
      window.clearTimeout(safetyTimeout);
      setIsReady(true);
    });

    return () => {
      active = false;
      window.clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => {
    if (hasInteracted) return;

    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 4200);

    return () => window.clearInterval(interval);
  }, [hasInteracted]);

  const selectSlide = (index: number) => {
    setActiveSlide(index);
    setHasInteracted(true);
  };

  const handlePointerUp = (clientX: number) => {
    if (pointerStart.current === null) return;

    const delta = clientX - pointerStart.current;
    pointerStart.current = null;

    if (Math.abs(delta) < 35) return;

    setHasInteracted(true);
    setActiveSlide((current) => {
      if (delta < 0) return (current + 1) % slides.length;
      return (current - 1 + slides.length) % slides.length;
    });
  };

  const slide = slides[activeSlide];
  const [slideTitle, slideDescription] = copy.slides[activeSlide];

  return (
    <>
      {!isReady ? (
        <div className="hero-loader" role="status" aria-label={copy.loading}>
          <div className="hero-loader__mark">
            <span aria-hidden="true" />
            <img src="/logo.png" alt="" />
          </div>
          <strong>Sunny Rentals</strong>
          <small>Phuket</small>
          <div className="hero-loader__line"><span /></div>
        </div>
      ) : null}

      <section
        className="marketing-hero"
        onPointerDown={(event) => {
          pointerStart.current = event.clientX;
        }}
        onPointerUp={(event) => handlePointerUp(event.clientX)}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <div className="marketing-hero__backdrop" aria-hidden="true" />
        <div className="shell marketing-hero__content">
          <div className="marketing-hero__copy">
            <div className="rating-pill">
              <span aria-hidden="true">★</span>
              {copy.rating}
            </div>
            <h1>{copy.title}</h1>
            <p>{copy.subtitle}</p>
          </div>

          <div className="hero-showcase" aria-live="polite">
            <div className="hero-showcase__vehicle">
              <span className="hero-showcase__shadow" aria-hidden="true" />
              <img
                key={slide.image}
                src={slide.image}
                alt={`${slideTitle} — ${copy.imageAlt}`}
              />
            </div>

            <Link
              className="category-ticket"
              href={`${localePath(locale)}#category-${slide.category}`}
            >
              <span>
                <small>{copy.category}</small>
                <strong>{slideTitle}</strong>
                <em>{slideDescription}</em>
              </span>
              <span className="category-ticket__price">
                <small>{copy.from}</small>
                <strong>{slide.price}</strong>
                <em>{copy.perDay}</em>
              </span>
            </Link>

            <div className="hero-dots" aria-label={copy.categoriesAria}>
              {slides.map((item, index) => (
                <button
                  key={item.category}
                  type="button"
                  className={activeSlide === index ? "is-active" : undefined}
                  onClick={() => selectSlide(index)}
                  aria-label={`${copy.showCategory} ${copy.slides[index][0]}`}
                  aria-current={activeSlide === index ? "true" : undefined}
                />
              ))}
            </div>

            {!hasInteracted ? (
              <div className="swipe-hint">
                <span>{copy.swipe}</span>
                <span aria-hidden="true">→</span>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
