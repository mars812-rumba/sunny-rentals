import Link from "next/link";

import { getMessages, localePath, type Locale } from "@/lib/i18n";
import { siteConfig } from "@/lib/site";

export function TrustContent({ locale }: { locale: Locale }) {
  const copy = getMessages(locale);

  return (
    <>
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

      <footer className="marketing-footer">
        <div className="shell marketing-footer__inner">
          <Link className="brand" href={localePath(locale)}>
            <img className="brand__logo" src="/logo.png" alt="" />
            <span>
              <strong>Sunny Rentals</strong>
              <small>Phuket</small>
            </span>
          </Link>
          <nav aria-label={copy.nav.footerAria}>
            <Link href={localePath(locale, "/cars")}>{copy.nav.fleet}</Link>
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
