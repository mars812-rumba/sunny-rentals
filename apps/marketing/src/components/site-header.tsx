import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" href="/" aria-label="Sunny Rentals — главная">
          <span className="brand__sun" aria-hidden="true">
            ☀
          </span>
          <span>
            <strong>Sunny</strong>
            <small>Rentals · Phuket</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Основная навигация">
          <Link href="/cars">Автопарк</Link>
          <a href={siteConfig.telegramBotUrl}>Telegram</a>
        </nav>
      </div>
    </header>
  );
}
