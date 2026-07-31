"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function SiteHeader({
  locale,
  currentPath = "/",
}: {
  locale: Locale;
  currentPath?: string;
}) {
  const copy = getMessages(locale);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    const menuButton = menuButtonRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      menuButton?.focus();
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link
          className="brand"
          href={localePath(locale)}
          aria-label={copy.nav.homeLabel}
        >
          <img className="brand__logo" src="/logo.png" alt="" />
          <span>
            <strong>Sunny</strong>
            <small>Rentals · Phuket</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label={copy.nav.aria}>
          <Link href={localePath(locale, "/cars")}>{copy.nav.fleet}</Link>
          <a className="site-nav__telegram" href={siteConfig.telegramBotUrl}>Telegram</a>
          <span className="language-switch" aria-label="Language">
            <Link
              aria-label={copy.nav.russian}
              href={localePath("ru", currentPath)}
              hrefLang="ru"
              aria-current={locale === "ru" ? "page" : undefined}
            >
              <span aria-hidden="true">🇷🇺</span>
            </Link>
            <Link
              aria-label={copy.nav.english}
              href={localePath("en", currentPath)}
              hrefLang="en"
              aria-current={locale === "en" ? "page" : undefined}
            >
              <span aria-hidden="true">🇬🇧</span>
            </Link>
          </span>
          <button
            ref={menuButtonRef}
            className="menu-toggle"
            type="button"
            aria-label={isMenuOpen ? copy.nav.menuClose : copy.nav.menuOpen}
            aria-expanded={isMenuOpen}
            aria-controls="site-menu"
            onClick={() => setIsMenuOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </nav>
      </div>

      {isMenuOpen ? (
        <div className="site-menu-layer">
          <button
            className="site-menu-backdrop"
            type="button"
            aria-label={copy.nav.menuClose}
            onClick={closeMenu}
          />
          <aside
            className="site-menu"
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="site-menu-title"
          >
            <div className="site-menu__top">
              <Link
                className="brand brand--menu"
                href={localePath(locale)}
                onClick={closeMenu}
              >
                <img className="brand__logo" src="/logo.png" alt="" />
                <span>
                  <strong>Sunny Rentals</strong>
                  <small>Phuket</small>
                </span>
              </Link>
              <button
                ref={closeButtonRef}
                className="site-menu__close"
                type="button"
                aria-label={copy.nav.menuClose}
                onClick={closeMenu}
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="site-menu__heading">
              <small>{copy.nav.menuEyebrow}</small>
              <strong id="site-menu-title">{copy.nav.menuTitle}</strong>
            </div>

            <nav className="site-menu__nav" aria-label={copy.nav.menuTitle}>
              <Link href={localePath(locale)} onClick={closeMenu}>
                <span>01</span>{copy.nav.home}
              </Link>
              <Link href={localePath(locale, "/cars")} onClick={closeMenu}>
                <span>02</span>{copy.nav.fleet}
              </Link>
              <Link href={`${localePath(locale)}#booking`} onClick={closeMenu}>
                <span>03</span>{copy.nav.booking}
              </Link>
              <Link href={`${localePath(locale)}#why-us`} onClick={closeMenu}>
                <span>04</span>{copy.nav.advantages}
              </Link>
              <Link href={`${localePath(locale)}#faq`} onClick={closeMenu}>
                <span>05</span>{copy.nav.faq}
              </Link>
            </nav>

            <div className="site-menu__contacts">
              <a href={siteConfig.telegramBotUrl}>{copy.nav.telegram}</a>
              <a href={siteConfig.whatsappUrl}>{copy.nav.whatsapp}</a>
            </div>
          </aside>
        </div>
      ) : null}
    </header>
  );
}
