"use client";

import { useEffect, useRef, useState } from "react";
import { CarFront, X } from "lucide-react";

import { getMessages, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function StickyContactMenu({ locale }: { locale: Locale }) {
  const copy = getMessages(locale).contact;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="sticky-contact" ref={menuRef}>
      {isOpen ? (
        <div className="sticky-contact__menu" id="contact-actions">
          <div>
            <strong>{copy.title}</strong>
            <span>{copy.subtitle}</span>
          </div>
          <a
            className="sticky-contact__telegram"
            href={siteConfig.telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/telegram.webp" alt="" />
            {copy.telegram}
          </a>
          <a
            className="sticky-contact__whatsapp"
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/whatsapp.webp" alt="" />
            {copy.whatsapp}
          </a>
        </div>
      ) : null}

      <button
        className="sticky-contact__trigger"
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="contact-actions"
        aria-label={isOpen ? copy.close : copy.open}
      >
        {isOpen ? (
          <X aria-hidden="true" />
        ) : (
          <CarFront aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
