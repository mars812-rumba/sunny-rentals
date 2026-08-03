"use client";

import { useEffect, useState } from "react";

export function HeroPreloader({
  label,
  vehicleImage,
}: {
  label: string;
  vehicleImage: string;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let active = true;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 700px)").matches;
    const images = [
      "/logo.png",
      mobile ? "/hero_bg_mobile.png" : "/hero_bg.webp",
      vehicleImage,
    ];
    const preload = (src: string) => new Promise<void>((resolve) => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = src;
    });
    const minimumDisplay = new Promise<void>((resolve) => {
      window.setTimeout(resolve, reducedMotion ? 0 : 360);
    });
    const safetyTimeout = window.setTimeout(() => {
      if (active) setVisible(false);
    }, 4500);

    Promise.all([...images.map(preload), minimumDisplay]).then(() => {
      if (!active) return;
      window.clearTimeout(safetyTimeout);
      setVisible(false);
    });

    return () => {
      active = false;
      window.clearTimeout(safetyTimeout);
    };
  }, [vehicleImage]);

  if (!visible) return null;

  return (
    <div className="hero-loader" role="status" aria-label={label}>
      <div className="hero-loader__mark">
        <span aria-hidden="true" />
        <img src="/logo.png" alt="" />
      </div>
      <strong>Sunny Rentals</strong>
      <small>Phuket</small>
      <div className="hero-loader__line"><span /></div>
    </div>
  );
}
