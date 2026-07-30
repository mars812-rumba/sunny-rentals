import Link from "next/link";

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
          <Link href={`${localePath(locale)}#booking`}>{copy.nav.booking}</Link>
          <a className="site-nav__telegram" href={siteConfig.telegramBotUrl}>Telegram</a>
          <span className="language-switch" aria-label="Language">
            <Link
              href={localePath("ru", currentPath)}
              hrefLang="ru"
              aria-current={locale === "ru" ? "page" : undefined}
            >
              RU
            </Link>
            <span aria-hidden="true">/</span>
            <Link
              href={localePath("en", currentPath)}
              hrefLang="en"
              aria-current={locale === "en" ? "page" : undefined}
            >
              EN
            </Link>
          </span>
        </nav>
      </div>
    </header>
  );
}
