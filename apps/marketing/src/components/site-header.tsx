import Link from "next/link";

import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell site-header__inner">
        <Link className="brand" href="/" aria-label="Sunny Rentals — главная">
          <img className="brand__logo" src="/logo.png" alt="" />
          <span>
            <strong>Sunny</strong>
            <small>Rentals · Phuket</small>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Основная навигация">
          <Link href="/cars">Автопарк</Link>
          <Link href="/#booking">Подобрать</Link>
          <a href={siteConfig.telegramBotUrl}>Telegram</a>
        </nav>
      </div>
    </header>
  );
}
