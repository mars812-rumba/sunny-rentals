import Link from "next/link";

import { siteConfig } from "@/lib/site";

export default function EnglishNotFound() {
  return (
    <main className="hero" lang="en">
      <div className="shell hero__content">
        <p className="eyebrow">Error 404</p>
        <h1>Page not found</h1>
        <p className="hero__lead">
          Return to the home page or open the vehicle search in Telegram.
        </p>
        <div className="hero__actions">
          <Link className="button button--primary" href="/en">
            Back to home
          </Link>
          <a className="button button--secondary" href={siteConfig.telegramBotUrl}>
            Open Telegram
          </a>
        </div>
      </div>
    </main>
  );
}
