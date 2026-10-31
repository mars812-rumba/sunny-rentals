"use client";

import { useRef, useState } from "react";
import { vehicleImageSrcSet } from '@/lib/responsive-image';

export function CarGallery({
  images,
  alt,
  year,
  previousLabel,
  nextLabel,
  photoLabel,
}: {
  images: string[];
  alt: string;
  year: number | null;
  previousLabel: string;
  nextLabel: string;
  photoLabel: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStart = useRef<number | null>(null);
  const hasGallery = images.length > 1;

  const selectImage = (index: number) => {
    setActiveIndex((index + images.length) % images.length);
  };

  return (
    <div
      className="car-gallery"
      data-gallery={hasGallery ? "interactive" : "single"}
      onPointerDown={(event) => {
        if (!hasGallery) return;
        pointerStart.current = event.clientX;
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerUp={(event) => {
        if (pointerStart.current === null || !hasGallery) return;

        const delta = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(delta) < 35) return;

        selectImage(activeIndex + (delta < 0 ? 1 : -1));
      }}
      onPointerCancel={() => {
        pointerStart.current = null;
      }}
    >
      <div
        className="car-gallery__viewport"
        role="group"
        aria-label={`${alt}. ${photoLabel} ${activeIndex + 1} / ${images.length}`}
      >
        <span
          className="car-gallery__track"
          style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
        >
          {images.map((image, index) => (
            <span className="car-gallery__slide" key={image}>
              <img
                src={image}
                srcSet={vehicleImageSrcSet(image)}
                sizes="(max-width: 700px) calc(100vw - 2rem), (max-width: 1100px) 90vw, 760px"
                decoding="async"
                alt={`${alt} — ${photoLabel.toLowerCase()} ${index + 1}`}
                loading={index === 0 ? "eager" : "lazy"}
                fetchPriority={index === 0 ? "high" : "auto"}
                draggable="false"
              />
            </span>
          ))}
        </span>
      </div>

      {year ? <span className="car-card__year">{year}</span> : null}

      {hasGallery ? (
        <>
          <button
            className="car-gallery__arrow car-gallery__arrow--previous"
            type="button"
            aria-label={previousLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => selectImage(activeIndex - 1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <button
            className="car-gallery__arrow car-gallery__arrow--next"
            type="button"
            aria-label={nextLabel}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => selectImage(activeIndex + 1)}
          >
            <span aria-hidden="true">›</span>
          </button>
          <span className="car-gallery__progress" aria-hidden="true">
            {images.map((image, index) => (
              <span className={index === activeIndex ? "is-active" : ""} key={image} />
            ))}
          </span>
        </>
      ) : null}
    </div>
  );
}
