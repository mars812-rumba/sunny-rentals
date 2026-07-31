"use client";

import type { ReactNode } from "react";
import { useRef } from "react";

export function CarRail({
  children,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode;
  previousLabel: string;
  nextLabel: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<{ x: number; scrollLeft: number } | null>(null);
  const didDrag = useRef(false);

  const move = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;

    const card = rail.querySelector<HTMLElement>(".car-card");
    const gap = Number.parseFloat(window.getComputedStyle(rail).columnGap || "0");
    rail.scrollBy({
      left: direction * ((card?.offsetWidth ?? rail.clientWidth * 0.82) + gap),
      behavior: "smooth",
    });
  };

  return (
    <div className="car-rail-slider">
      <div className="car-rail-controls">
        <button type="button" aria-label={previousLabel} onClick={() => move(-1)}>
          <span aria-hidden="true">←</span>
        </button>
        <button type="button" aria-label={nextLabel} onClick={() => move(1)}>
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div
        className="car-rail"
        ref={railRef}
        onPointerDown={(event) => {
          if (
            (event.target as HTMLElement).closest(
              '.car-gallery[data-gallery="interactive"]',
            )
          ) return;

          pointerStart.current = {
            x: event.clientX,
            scrollLeft: event.currentTarget.scrollLeft,
          };
          didDrag.current = false;
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!pointerStart.current) return;

          const delta = event.clientX - pointerStart.current.x;
          if (Math.abs(delta) > 5) didDrag.current = true;
          event.currentTarget.scrollLeft = pointerStart.current.scrollLeft - delta;
        }}
        onPointerUp={() => {
          pointerStart.current = null;
          window.setTimeout(() => {
            didDrag.current = false;
          }, 0);
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
          didDrag.current = false;
        }}
        onClickCapture={(event) => {
          if (!didDrag.current) return;
          event.preventDefault();
          didDrag.current = false;
        }}
      >
        {children}
      </div>
    </div>
  );
}
