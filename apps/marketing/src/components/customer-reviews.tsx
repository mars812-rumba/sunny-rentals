"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { customerReviews, customerReviewVideo } from "@/content/customer-reviews";
import type { Locale } from "@/lib/i18n";
import "./customer-reviews.css";

const copy = {
  ru: {
    title: "Что говорят наши клиенты",
    intro: "Истории из нашего Telegram-канала и видеоотзыв. У каждой поездки свои условия — их согласовываем перед бронированием.",
    customer: "Клиент из Telegram", original: "Читать оригинал в Telegram", translated: "",
    previous: "Предыдущий отзыв", next: "Следующий отзыв", of: "из",
    video: "Смотреть видеоотзыв", videoNote: "Видео на русском языке · 39 секунд",
    instagram: "Другие отзывы в Instagram", failed: "Не удалось воспроизвести видео.", download: "Открыть видео отдельно",
  },
  en: {
    title: "What our customers say",
    intro: "Stories from our Telegram channel and a video review. Each trip has its own arrangements, which we agree before booking.",
    customer: "A customer on Telegram", original: "Read the original on Telegram", translated: "Translated from Russian",
    previous: "Previous review", next: "Next review", of: "of",
    video: "Watch the video review", videoNote: "Video in Russian · 39 seconds",
    instagram: "More reviews on Instagram", failed: "The video could not be played.", download: "Open the video separately",
  },
};

export function CustomerReviews({ locale }: { locale: Locale }) {
  const [index, setIndex] = useState(0);
  const [videoOpened, setVideoOpened] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const text = copy[locale];
  return <section className="customer-reviews" id="reviews" aria-labelledby="customer-reviews-title">
    <div className="shell">
      <header className="customer-reviews__heading"><h2 id="customer-reviews-title">{text.title}</h2><p>{text.intro}</p></header>
      <div className="customer-reviews__layout">
        <div className="customer-reviews__stories">
          <div id="customer-review-quotes" className="customer-reviews__quotes">
            {customerReviews.map((review, position) => <figure key={review.id} hidden={position !== index}>
              <blockquote><p>{review[locale]}</p></blockquote>
              <figcaption><span className="customer-reviews__byline"><img className="customer-reviews__social-icon" src="/media/reviews/telegram-transparent.webp" alt="" width={32} height={32} loading="lazy" />{text.customer}</span>{text.translated ? <small>{text.translated}</small> : null}<a href={`https://t.me/carbook_in_phuket/${review.id}`} target="_blank" rel="noopener noreferrer">{text.original}<span aria-hidden="true"> ↗</span></a></figcaption>
            </figure>)}
          </div>
          <div className="customer-reviews__controls">
            <button type="button" aria-label={text.previous} aria-controls="customer-review-quotes" onClick={() => setIndex((index + customerReviews.length - 1) % customerReviews.length)}><ChevronLeft aria-hidden="true" size={22} /></button>
            <span aria-live="polite" aria-atomic="true">{index + 1} {text.of} {customerReviews.length}</span>
            <button type="button" aria-label={text.next} aria-controls="customer-review-quotes" onClick={() => setIndex((index + 1) % customerReviews.length)}><ChevronRight aria-hidden="true" size={22} /></button>
          </div>
          <a className="customer-reviews__instagram" href={customerReviewVideo.instagram} target="_blank" rel="noopener noreferrer"><img className="customer-reviews__social-icon" src="/media/reviews/instagram-transparent.webp" alt="" width={28} height={28} loading="lazy" />{text.instagram}<span aria-hidden="true"> ↗</span></a>
        </div>
        <figure className="customer-reviews__film">
          <div className="customer-reviews__player">
            {videoOpened ? <video autoPlay controls playsInline preload="none" poster={customerReviewVideo.poster} aria-label={text.video} aria-describedby="customer-review-video-note" onError={() => setVideoFailed(true)}>
              <source src={customerReviewVideo.src} type="video/mp4" onError={() => setVideoFailed(true)} />
              <a href={customerReviewVideo.src}>{text.download}</a>
            </video> : <button type="button" className="customer-reviews__play" aria-label={text.video} onClick={() => setVideoOpened(true)}>
              <img src={customerReviewVideo.poster} alt="" width={594} height={1052} loading="lazy" />
              <span className="customer-reviews__play-label"><Play aria-hidden="true" size={22} />{text.video}</span>
            </button>}
          </div>
          <figcaption id="customer-review-video-note">{text.videoNote}</figcaption>
          {videoFailed ? <p role="status">{text.failed} <a href={customerReviewVideo.src}>{text.download}</a></p> : null}
        </figure>
      </div>
    </div>
  </section>;
}
