import Link from "next/link";

import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function TrustContent({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);

  return (
    <>
      <section className="price-clarity" aria-labelledby="price-clarity-title">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.trust.priceEyebrow}</p>
              <h2 id="price-clarity-title">{copy.trust.priceTitle}</h2>
            </div>
            <p>{copy.trust.priceIntro}</p>
          </div>
          <div className="price-clarity__grid">
            {copy.trust.priceParts.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="benefit-section" id="why-us">
        <div className="shell">
          <div className="section-heading">
            <div>
              <p className="eyebrow eyebrow--dark">{copy.trust.eyebrow}</p>
              <h2>{copy.trust.title}</h2>
            </div>
            <p>{copy.trust.intro}</p>
          </div>

          <div className="benefit-grid">
            {copy.trust.benefits.map(([title, text], index) => (
              <article key={title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="rental-guide" aria-labelledby="rental-guide-title">
        <div className="shell rental-guide__layout">
          <div className="rental-guide__intro">
            <p className="eyebrow eyebrow--dark">{copy.trust.guideEyebrow}</p>
            <h2 id="rental-guide-title">{copy.trust.guideTitle}</h2>
            <p>{copy.trust.guideIntro}</p>
          </div>
          <div className="rental-guide__items">
            {copy.trust.guideItems.map(([title, text]) => (
              <article key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="shell faq-section__layout">
          <div>
            <p className="eyebrow">{copy.trust.faqEyebrow}</p>
            <h2>{copy.trust.faqTitle}</h2>
            <p>{copy.trust.faqIntro}</p>
            <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {copy.trust.whatsapp}
            </a>
          </div>

          <div className="faq-list">
            {copy.trust.questions.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<span aria-hidden="true">+</span></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="contact-panel" aria-labelledby="contact-panel-title">
        <div className="shell contact-panel__inner">
          <div>
            <p className="eyebrow">{copy.trust.contactEyebrow}</p>
            <h2 id="contact-panel-title">{copy.trust.contactTitle}</h2>
            <p>{copy.trust.contactIntro}</p>
          </div>
          <div className="contact-panel__actions">
            <a className="contact-panel__telegram" href={siteConfig.telegramBotUrl}>
              {copy.trust.telegram}
              <span aria-hidden="true">→</span>
            </a>
            <a href={siteConfig.whatsappUrl} target="_blank" rel="noopener noreferrer">
              {copy.trust.whatsapp}
            </a>
          </div>
        </div>
      </section>

      <footer className="marketing-footer">
        <div className="shell marketing-footer__inner">
          <Link className="brand" href={localePath(locale)}>
            <img className="brand__logo" src="/logo.png" alt="" />
            <span>
              <strong>Sunny Rentals</strong>
              <small>Phuket</small>
            </span>
          </Link>
          <address>
            <span>Phuket, Thailand</span>
            <a href="tel:+66842039140">+66 84 203 9140</a>
          </address>
          <nav aria-label={copy.nav.footerAria}>
            <Link href={localePath(locale, "/cars")}>{copy.nav.fleet}</Link>
            <Link href={localePath(locale, "/rental-terms")}>{locale === "ru" ? "Условия" : "Terms"}</Link>
            <Link href={localePath(locale, "/insurance")}>{locale === "ru" ? "Страховка" : "Insurance"}</Link>
            <Link href={localePath(locale, "/deposit")}>{locale === "ru" ? "Депозит" : "Deposit"}</Link>
            <Link href={localePath(locale, "/delivery")}>{locale === "ru" ? "Доставка" : "Delivery"}</Link>
            <Link href={localePath(locale, "/faq")}>FAQ</Link>
            <Link href={`${localePath(locale)}#booking`}>{copy.nav.booking}</Link>
            <a href={siteConfig.telegramBotUrl}>Telegram</a>
            <a href={siteConfig.whatsappUrl}>WhatsApp</a>
          </nav>
          <p>© {new Date().getFullYear()} Sunny Rentals</p>
        </div>
      </footer>
    </>
  );
}
