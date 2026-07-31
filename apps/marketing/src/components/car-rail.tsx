"use client";

import { Children, type PointerEvent, type ReactNode, useEffect, useRef, useState } from "react";

const CAROUSEL_QUERY = "(max-width: 960px)";
const STEP_REMAINDER_REM = 2.2;

export function CarRail({
  children,
  previousLabel,
  nextLabel,
}: {
  children: ReactNode;
  previousLabel: string;
  nextLabel: string;
}) {
  const count = Children.count(children);
  const pointerStart = useRef<number | null>(null);
  const didDrag = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [index, setIndex] = useState(0);
  const [dragDelta, setDragDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(CAROUSEL_QUERY);
    const sync = () => {
      setEnabled(media.matches);
      if (!media.matches) setIndex(0);
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const select = (nextIndex: number) => {
    setIndex(Math.max(0, Math.min(nextIndex, count - 1)));
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;

    const delta = event.clientX - pointerStart.current;
    pointerStart.current = null;
    setDragDelta(0);
    setIsDragging(false);

    if (Math.abs(delta) >= 42) {
      select(index + (delta < 0 ? 1 : -1));
    }

    window.setTimeout(() => {
      didDrag.current = false;
    }, 0);
  };

  const transform = enabled
    ? `translate3d(calc(-${index * 100}% + ${index * STEP_REMAINDER_REM}rem + ${dragDelta}px), 0, 0)`
    : undefined;

  return (
    <div className="car-rail-slider">
      <div className="car-rail-controls">
        <button
          type="button"
          aria-label={previousLabel}
          disabled={index === 0}
          onClick={() => select(index - 1)}
        >
          <span aria-hidden="true">←</span>
        </button>
        <span aria-live="polite">{index + 1} / {count}</span>
        <button
          type="button"
          aria-label={nextLabel}
          disabled={index === count - 1}
          onClick={() => select(index + 1)}
        >
          <span aria-hidden="true">→</span>
        </button>
      </div>

      <div
        className="car-rail-viewport"
        onPointerDown={(event) => {
          if (!enabled || (event.target as HTMLElement).closest("button")) return;
          pointerStart.current = event.clientX;
          didDrag.current = false;
          setIsDragging(true);
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (pointerStart.current === null) return;
          const delta = event.clientX - pointerStart.current;
          if (Math.abs(delta) > 6) didDrag.current = true;

          const atStart = index === 0 && delta > 0;
          const atEnd = index === count - 1 && delta < 0;
          setDragDelta(atStart || atEnd ? delta * 0.22 : delta);
        }}
        onPointerUp={finishDrag}
        onPointerCancel={() => {
          pointerStart.current = null;
          setDragDelta(0);
          didDrag.current = false;
          setIsDragging(false);
        }}
        onClickCapture={(event) => {
          if (!didDrag.current) return;
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <div
          className={`car-rail${isDragging ? " is-dragging" : ""}`}
          style={{ transform }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
