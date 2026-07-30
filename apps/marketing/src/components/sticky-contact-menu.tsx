"use client";

import { useEffect, useRef, useState } from "react";

import { siteConfig } from "@/lib/site";

export function StickyContactMenu() {
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
            <strong>Бронь и связь</strong>
            <span>Выберите удобный способ</span>
          </div>
          <a
            className="sticky-contact__telegram"
            href={siteConfig.telegramBotUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/telegram.webp" alt="" />
            Забронировать через Telegram
          </a>
          <a
            className="sticky-contact__whatsapp"
            href={siteConfig.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/whatsapp.webp" alt="" />
            Написать в WhatsApp
          </a>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="contact-actions"
        aria-label={isOpen ? "Закрыть меню связи" : "Открыть меню бронирования"}
      >
        <span aria-hidden="true">{isOpen ? "×" : "✦"}</span>
      </button>
    </div>
  );
}
