import { siteConfig } from "@/lib/site";

export default function NotFound() {
  return (
    <main className="hero">
      <div className="shell hero__content">
        <p className="eyebrow">Ошибка 404</p>
        <h1>Страница не найдена</h1>
        <p className="hero__lead">
          Вернитесь на главную или откройте подбор транспорта в Telegram.
        </p>
        <div className="hero__actions">
          <a className="button button--primary" href="/">
            На главную
          </a>
          <a className="button button--secondary" href={siteConfig.telegramBotUrl}>
            Открыть Telegram
          </a>
        </div>
      </div>
    </main>
  );
}
