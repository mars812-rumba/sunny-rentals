import Link from "next/link";

import { siteConfig } from "@/lib/site";

const benefits = [
  {
    title: "Проверенный транспорт",
    text: "Показываем реальные фотографии и состояние автомобиля до подтверждения.",
  },
  {
    title: "Понятная стоимость",
    text: "Срок аренды, депозит и доставка фиксируются до создания брони.",
  },
  {
    title: "Доставка по Пхукету",
    text: "Передадим транспорт в аэропорту, у отеля или виллы.",
  },
  {
    title: "Связь в Telegram",
    text: "Профиль подтверждается через Telegram, а бронь сразу попадает в CRM.",
  },
];

const questions = [
  {
    question: "Как забронировать автомобиль?",
    answer:
      "Выберите категорию, даты и место выдачи. Затем откройте Telegram, подтвердите профиль и отправьте бронь из WebApp.",
  },
  {
    question: "Можно получить машину в аэропорту?",
    answer:
      "Да. При подборе выберите аэропорт как место получения или возврата. Итоговые условия доставки будут показаны до подтверждения.",
  },
  {
    question: "Цена на странице окончательная?",
    answer:
      "В карточках указана цена «от» для длительной аренды в низкий сезон. Точная ставка зависит от дат и срока и рассчитывается в WebApp.",
  },
  {
    question: "Какие документы нужны?",
    answer:
      "Обычно нужны паспорт и действующее водительское удостоверение соответствующей категории. Менеджер подтвердит требования к выбранному транспорту.",
  },
  {
    question: "Когда бронь появляется в CRM?",
    answer:
      "После авторизации Telegram фиксирует интерес к модели. Полноценная бронь создаётся после подтверждения дат, доставки и автомобиля в WebApp.",
  },
];

export function TrustContent() {
  return (
    <>
      <section className="benefit-section" id="why-us">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--dark">Без сюрпризов</p>
              <h2>Всё важное до поездки</h2>
            </div>
            <p>
              Сайт помогает выбрать модель, Telegram подтверждает клиента, а CRM
              сохраняет весь путь бронирования для менеджера.
            </p>
          </div>

          <div className="benefit-grid">
            {benefits.map((benefit, index) => (
              <article key={benefit.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="shell faq-section__layout">
          <div>
            <p className="eyebrow">Помощь перед бронью</p>
            <h2>Частые вопросы</h2>
            <p>Если ответа нет, напишите нам — подскажем по машине и маршруту.</p>
            <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">
              Написать в WhatsApp
            </a>
          </div>

          <div className="faq-list">
            {questions.map((item) => (
              <details key={item.question}>
                <summary>{item.question}<span aria-hidden="true">+</span></summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="shell marketing-footer__inner">
          <Link className="brand" href="/">
            <img className="brand__logo" src="/logo.png" alt="" />
            <span>
              <strong>Sunny Rentals</strong>
              <small>Phuket</small>
            </span>
          </Link>
          <nav aria-label="Навигация в подвале">
            <Link href="/cars">Автопарк</Link>
            <a href="/#booking">Подобрать транспорт</a>
            <a href={siteConfig.telegramBotUrl}>Telegram</a>
            <a href={siteConfig.whatsappUrl}>WhatsApp</a>
          </nav>
          <p>© {new Date().getFullYear()} Sunny Rentals</p>
        </div>
      </footer>
    </>
  );
}
