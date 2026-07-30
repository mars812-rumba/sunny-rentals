import { FleetSection } from "@/components/fleet-section";
import { SiteHeader } from "@/components/site-header";
import { siteConfig } from "@/lib/site";

const benefits = [
  "Проверенные автомобили и байки",
  "Прозрачная стоимость без скрытых платежей",
  "Доставка по Пхукету и поддержка 24/7",
];

export default function HomePage() {
  return (
    <main>
      <SiteHeader />
      <section className="hero">
        <div className="hero__glow" aria-hidden="true" />
        <div className="shell hero__content">
          <p className="eyebrow">Sunny Rentals · Phuket</p>
          <h1>Аренда авто и байков на Пхукете</h1>
          <p className="hero__lead">
            Подберите транспорт на свои даты и продолжите бронирование в защищённом
            Telegram WebApp.
          </p>

          <div className="hero__actions">
            <a className="button button--primary" href={siteConfig.telegramBotUrl}>
              Подобрать транспорт
            </a>
            <a className="button button--secondary" href={siteConfig.whatsappUrl}>
              Написать в WhatsApp
            </a>
          </div>

          <ul className="benefits" aria-label="Преимущества Sunny Rentals">
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>
      </section>
      <FleetSection />
    </main>
  );
}
