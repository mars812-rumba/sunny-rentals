import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  Clock3,
  KeyRound,
  MapPin,
  Menu,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from "lucide-react";

import logo from "@/assets/logo.png";
import footerLogo from "@/assets/footer_logo.png";
import heroBackgroundDesktop from "@/assets/hero_bg.jpg";
import heroBackgroundMobile from "@/assets/hero_bg.png";
import heroCar from "@/assets/classes/suv_desk.png";
import compactCar from "@/assets/classes/compact_desk.png";
import sedanCar from "@/assets/classes/sedan_desk.png";
import familyCar from "@/assets/classes/7seat_desk.png";
import suvCar from "@/assets/classes/suv_desk.png";
import bike from "@/assets/classes/bike_desk.png";
import type { OfferData } from "@/types/seo";

const TELEGRAM_BOT_URL = "https://t.me/webapp_rent_bot";
const TELEGRAM_CHANNEL_URL = "https://t.me/carbook_in_phuket";

const directions = [
  {
    title: "Компакт",
    description: "Манёвренный вариант для пляжей, кафе и поездок вдвоём.",
    price: "от 600 ฿/день",
    image: compactCar,
    imageClassName: "scale-[1.03]",
  },
  {
    title: "Седан",
    description: "Больше комфорта для ежедневных маршрутов по острову.",
    price: "от 700 ฿/день",
    image: sedanCar,
    imageClassName: "scale-105",
  },
  {
    title: "7 мест",
    description: "Для семьи, друзей и багажа без компромиссов.",
    price: "от 1 100 ฿/день",
    image: familyCar,
    imageClassName: "scale-100",
  },
  {
    title: "SUV",
    description: "Просторный автомобиль для длинных поездок и новых маршрутов.",
    price: "от 1 400 ฿/день",
    image: suvCar,
    imageClassName: "scale-100",
  },
  {
    title: "Байк",
    description: "Самый быстрый способ двигаться в ритме Пхукета.",
    price: "от 250 ฿/день",
    image: bike,
    imageClassName: "scale-[0.92]",
  },
];

const steps = [
  {
    icon: MessageCircle,
    title: "Откройте RankBot",
    description: "Telegram уже знает, как с вами связаться — отдельная регистрация не нужна.",
  },
  {
    icon: CalendarDays,
    title: "Выберите даты и транспорт",
    description: "Укажите маршрут, место подачи и подходящий класс прямо в WebApp.",
  },
  {
    icon: KeyRound,
    title: "Получите подтверждение",
    description: "Цена, детали выдачи и поддержка останутся в одном Telegram-чате.",
  },
];

const reviews = [
  {
    name: "Артём",
    text: "Вопросы решаются быстро, команда всегда на связи. Машина подошла всей компании.",
  },
  {
    name: "Анна",
    text: "Авто доставили в аэропорт вовремя. Всё организовано понятно и без сюрпризов.",
  },
  {
    name: "Михаил",
    text: "Брал машину уже дважды. Оба раза новые авто, хороший сервис и всё чётко.",
  },
];

const faqs = [
  {
    question: "Где теперь оформляется бронь?",
    answer:
      "Все заявки оформляются в Telegram WebApp RankBot. Там вы выбираете транспорт, даты и место подачи, а затем получаете подтверждение.",
  },
  {
    question: "Нужно ли устанавливать отдельное приложение?",
    answer:
      "Нет. Достаточно Telegram: RankBot открывает каталог как встроенное мини-приложение.",
  },
  {
    question: "Какие документы нужны?",
    answer:
      "Паспорт и водительские права. Для отдельных стран могут потребоваться международные права — RankBot подскажет по вашей ситуации.",
  },
  {
    question: "Нужна ли предоплата?",
    answer:
      "Нет, оплата производится при получении транспорта. Итоговая стоимость будет зафиксирована в Telegram до подтверждения.",
  },
  {
    question: "Можно ли заказать подачу в аэропорт или отель?",
    answer:
      "Да. В RankBot можно указать аэропорт, отель, виллу или другой адрес на Пхукете.",
  },
];

const TelegramButton = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <a
    href={TELEGRAM_BOT_URL}
    target="_blank"
    rel="noopener noreferrer"
    className={`group inline-flex items-center justify-center gap-2 rounded-full bg-[#1387c9] px-6 py-3.5 text-sm font-extrabold text-white shadow-[0_14px_35px_rgba(19,135,201,0.28)] transition duration-300 hover:-translate-y-0.5 hover:bg-[#0877b5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#65c9ff]/50 motion-reduce:transform-none ${className}`}
  >
    {children}
    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
  </a>
);

interface RankBotLandingProps {
  offers?: OfferData[];
  offersLoading?: boolean;
}

export const RankBotLanding = ({
  offers = [],
  offersLoading = false,
}: RankBotLandingProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = [
    { href: "#transport", label: "Транспорт" },
    { href: "#how-it-works", label: "Как это работает" },
    { href: "#protection", label: "Гарантии" },
    { href: "#reviews", label: "Отзывы" },
    { href: "#faq", label: "Вопросы" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5fbff] text-[#0b2433]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#071f2e]/88 text-white shadow-[0_8px_40px_rgba(2,20,32,0.16)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 md:px-8 lg:px-12">
          <a
            href="#top"
            className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#68d2ff]"
            aria-label="Sunny Rentals — наверх"
          >
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-lg">
              <img src={logo} alt="" className="h-7 w-auto" />
            </span>
            <span className="leading-none">
              <span className="block text-[15px] font-black tracking-tight">SUNNY RENTALS</span>
              <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#83d9ff]">
                Phuket
              </span>
            </span>
          </a>

          <nav className="hidden items-center gap-7 lg:flex" aria-label="Главная навигация">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-bold text-white/72 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#68d2ff]"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <TelegramButton className="hidden !px-5 !py-2.5 sm:inline-flex">
              Открыть RankBot
            </TelegramButton>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white lg:hidden"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
              aria-label={menuOpen ? "Закрыть меню" : "Открыть меню"}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="mobile-navigation"
            className="border-t border-white/10 bg-[#071f2e] px-5 pb-6 pt-3 lg:hidden"
            aria-label="Мобильная навигация"
          >
            <div className="mx-auto flex max-w-[1440px] flex-col">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="border-b border-white/10 py-4 text-lg font-bold text-white"
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <TelegramButton className="mt-5 sm:hidden">Открыть RankBot</TelegramButton>
            </div>
          </nav>
        )}
      </header>

      <main>
        <section id="top" className="relative min-h-[790px] overflow-hidden bg-[#07273a] pt-[72px] text-white lg:min-h-[820px]">
          <picture>
            <source media="(min-width: 768px)" srcSet={heroBackgroundDesktop} />
            <img
              src={heroBackgroundMobile}
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-center opacity-55"
            />
          </picture>
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(4,27,42,0.98)_0%,rgba(4,29,44,0.90)_45%,rgba(4,29,44,0.32)_100%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_24%,rgba(84,199,244,0.35),transparent_28%)]" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#ffb000]/20 blur-3xl" />

          <div className="relative mx-auto grid min-h-[718px] max-w-[1440px] items-center gap-12 px-5 py-14 md:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-12 lg:py-20">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
              className="relative z-10 max-w-3xl"
            >
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#72d5ff]/25 bg-[#0b3a53]/75 px-3 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#9de3ff] backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#55e59b] opacity-70 motion-reduce:animate-none" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#55e59b]" />
                </span>
                WebApp уже в Telegram
              </div>

              <h1 className="max-w-[760px] text-[clamp(3.2rem,7vw,7rem)] font-black leading-[0.88] tracking-[-0.065em] [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                Пхукет начинается
                <span className="mt-2 block text-[#72d5ff]">в Telegram.</span>
              </h1>

              <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-white/76 md:text-xl">
                Авто и байки для любого маршрута. Выбор, точная стоимость и бронь — в одном
                WebApp RankBot.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <TelegramButton className="w-full !px-7 !py-4 !text-base sm:w-auto">
                  Выбрать транспорт
                </TelegramButton>
                <a
                  href="#transport"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 px-6 py-3.5 text-sm font-extrabold text-white transition hover:border-white/45 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/20"
                >
                  Смотреть направления
                  <ArrowRight className="h-4 w-4" />
                </a>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3 border-t border-white/14 pt-6">
                {[
                  ["от 250 ฿", "в сутки"],
                  ["0 ฿", "предоплата"],
                  ["24/7", "поддержка"],
                ].map(([value, label]) => (
                  <div key={label}>
                    <div className="text-xl font-black tracking-tight md:text-2xl">{value}</div>
                    <div className="mt-1 text-xs font-semibold text-white/50">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-white/12 bg-white/[0.07] p-3 backdrop-blur lg:hidden">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1387c9]">
                  <Bot className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="text-sm font-black">RankBot онлайн</div>
                  <div className="mt-0.5 text-xs font-semibold text-white/55">
                    Свободные варианты уже в Telegram
                  </div>
                </div>
                <span className="h-2.5 w-2.5 rounded-full bg-[#56e69c]" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.75, delay: 0.12 }}
              className="relative mx-auto hidden h-[560px] w-full max-w-[650px] lg:block"
            >
              <img
                src={heroCar}
                alt="SUV для аренды на Пхукете"
                className="absolute -bottom-4 -left-28 z-20 w-[650px] max-w-none drop-shadow-[0_35px_28px_rgba(0,0,0,0.35)]"
              />

              <div className="absolute right-2 top-2 z-10 w-[330px] rotate-[2.5deg] overflow-hidden rounded-[34px] border-[7px] border-[#0a1820] bg-[#eff8fc] shadow-[0_35px_90px_rgba(0,0,0,0.38)]">
                <div className="flex items-center gap-3 bg-[#1387c9] px-5 py-4 text-white">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-white/18">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black">RankBot</div>
                    <div className="text-xs font-medium text-white/70">мини-приложение Sunny Rentals</div>
                  </div>
                  <span className="h-2.5 w-2.5 rounded-full bg-[#56e69c]" />
                </div>
                <div className="space-y-3 px-4 py-5">
                  <div className="max-w-[86%] rounded-[18px_18px_18px_5px] bg-white p-4 text-sm font-semibold leading-snug text-[#183545] shadow-sm">
                    Куда отправимся сегодня?
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {["🚗 Авто", "🛵 Байк", "✈️ Аэропорт", "🏨 Отель"].map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-[#cfe5ef] bg-white px-3 py-3 text-center text-xs font-extrabold text-[#174259]"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="ml-auto max-w-[78%] rounded-[18px_18px_5px_18px] bg-[#d6f2ff] p-3 text-sm font-bold text-[#174259]">
                    SUV, 12–19 августа
                  </div>
                  <div className="rounded-2xl bg-[#0b2b3c] p-4 text-white">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#86dfff]">
                      <Sparkles className="h-4 w-4" />
                      Подбор готов
                    </div>
                    <div className="mt-2 text-lg font-black">5 свободных SUV</div>
                    <div className="mt-1 text-xs text-white/55">Цена и условия уже рассчитаны</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="relative z-20 -mt-1 border-b border-[#d8eaf2] bg-white">
          <div className="mx-auto grid max-w-[1440px] grid-cols-2 divide-x divide-[#d8eaf2] px-5 md:grid-cols-4 md:px-8 lg:px-12">
            {[
              { icon: ShieldCheck, title: "Депозит защищён", text: "фиксируем состояние" },
              { icon: Check, title: "Проверенный парк", text: "реальные фото" },
              { icon: MapPin, title: "Подача по Пхукету", text: "аэропорт, отель, вилла" },
              { icon: Clock3, title: "На связи 24/7", text: "ответим в Telegram" },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex min-h-28 items-center gap-3 px-3 py-5 first:pl-0 md:px-6">
                <Icon className="h-6 w-6 shrink-0 text-[#1387c9]" />
                <div>
                  <div className="text-sm font-black">{title}</div>
                  <div className="mt-1 text-xs font-semibold text-[#65808f]">{text}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="transport" className="scroll-mt-20 px-5 py-24 md:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-7 border-b border-[#cfe4ee] pb-9 lg:grid-cols-[1fr_0.65fr] lg:items-end">
              <div>
                <div className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-[#1387c9]">
                  Все направления
                </div>
                <h2 className="max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.045em] md:text-6xl lg:text-7xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                  Транспорт под ваш маршрут
                </h2>
              </div>
              <p className="max-w-xl text-base font-medium leading-relaxed text-[#587482] lg:justify-self-end lg:text-lg">
                От короткой поездки до семейного путешествия. Нажмите на любой класс — RankBot
                покажет свободные варианты на ваши даты.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-6">
              {directions.map((direction, index) => (
                <motion.a
                  key={direction.title}
                  href={TELEGRAM_BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  className={`group relative flex min-h-[410px] flex-col overflow-hidden rounded-[28px] border border-[#d1e6ef] bg-white p-6 shadow-[0_14px_45px_rgba(12,59,80,0.07)] transition duration-300 hover:-translate-y-1 hover:border-[#7dcff2] hover:shadow-[0_22px_60px_rgba(12,91,126,0.15)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#65c9ff]/50 motion-reduce:transform-none ${
                    index < 2 ? "xl:col-span-3" : "xl:col-span-2"
                  }`}
                  aria-label={`${direction.title}: открыть в RankBot`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-2xl font-black tracking-tight">{direction.title}</div>
                      <div className="mt-2 text-sm font-extrabold text-[#1387c9]">{direction.price}</div>
                    </div>
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-[#e8f7fd] text-[#1387c9] transition group-hover:bg-[#1387c9] group-hover:text-white">
                      <ArrowUpRight className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="relative my-2 flex min-h-[205px] flex-1 items-center justify-center">
                    <div className="absolute bottom-6 h-10 w-4/5 rounded-[50%] bg-[#7fb5c9]/18 blur-xl" />
                    <img
                      src={direction.image}
                      alt=""
                      className={`relative z-10 max-h-[205px] w-full object-contain drop-shadow-[0_22px_18px_rgba(21,51,66,0.18)] transition duration-500 group-hover:scale-[1.04] ${direction.imageClassName}`}
                    />
                  </div>
                  <p className="max-w-sm text-sm font-medium leading-relaxed text-[#66818e]">
                    {direction.description}
                  </p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {(offersLoading || offers.length > 0) && (
          <section className="border-y border-[#d4e8f0] bg-white px-5 py-20 md:px-8 lg:px-12 lg:py-24">
            <div className="mx-auto max-w-[1440px]">
              <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1387c9]">
                    Актуальные офферы
                  </div>
                  <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] md:text-5xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                    Готовые сценарии поездки
                  </h2>
                </div>
                <Link
                  to="/offers"
                  className="group inline-flex items-center gap-2 text-sm font-black text-[#0d7db8] hover:text-[#075e8b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65c9ff]"
                >
                  Все предложения
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </div>

              {offersLoading ? (
                <div className="mt-9 grid gap-4 md:grid-cols-3" aria-label="Загрузка предложений">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-56 animate-pulse rounded-[24px] bg-[#edf6fa] motion-reduce:animate-none"
                    />
                  ))}
                </div>
              ) : (
                <div className="mt-9 grid gap-4 md:grid-cols-3">
                  {offers.slice(0, 3).map((offer) => (
                    <Link
                      key={offer.slug}
                      to={`/offers/${offer.slug}`}
                      className="group flex min-h-56 flex-col rounded-[24px] border border-[#d1e5ee] bg-[#f5fbfd] p-6 transition duration-300 hover:-translate-y-1 hover:border-[#83d2f2] hover:shadow-[0_18px_45px_rgba(12,91,126,0.12)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#65c9ff]/50 motion-reduce:transform-none"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="rounded-full bg-[#dff3fb] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#0b78af]">
                          Спецпредложение
                        </span>
                        <ArrowUpRight className="h-5 w-5 text-[#1387c9] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                      <h3 className="mt-6 flex-1 text-xl font-black leading-tight tracking-[-0.02em]">
                        {offer.title}
                      </h3>
                      <div className="mt-6 flex items-center gap-2 text-sm font-black text-[#1387c9]">
                        {offer.cta || "Узнать условия"}
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <section id="how-it-works" className="scroll-mt-20 bg-[#08283a] px-5 py-24 text-white md:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-12 lg:grid-cols-[0.7fr_1fr]">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#78d7ff]">
                  Один понятный маршрут
                </div>
                <h2 className="mt-5 text-4xl font-black leading-[0.98] tracking-[-0.045em] md:text-6xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                  Бронь без переключений
                </h2>
                <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-white/60">
                  Каталог, расчёт, подтверждение и связь с менеджером остаются в Telegram.
                </p>
                <TelegramButton className="mt-8">Начать в RankBot</TelegramButton>
              </div>

              <div className="relative">
                <div className="absolute left-[27px] top-8 hidden h-[calc(100%-64px)] border-l border-dashed border-[#5bc9f6]/35 md:block" />
                <div className="space-y-4">
                  {steps.map(({ icon: Icon, title, description }, index) => (
                    <motion.div
                      key={title}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      className="relative grid gap-5 rounded-[24px] border border-white/10 bg-white/[0.055] p-6 backdrop-blur md:grid-cols-[56px_1fr_auto] md:items-center"
                    >
                      <span className="relative z-10 grid h-14 w-14 place-items-center rounded-full bg-[#0e7cb8] text-white shadow-[0_0_0_7px_#08283a]">
                        <Icon className="h-6 w-6" />
                      </span>
                      <div>
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-[#79d8ff]">
                          Шаг {index + 1}
                        </div>
                        <h3 className="mt-2 text-xl font-black">{title}</h3>
                        <p className="mt-2 max-w-xl text-sm font-medium leading-relaxed text-white/58">
                          {description}
                        </p>
                      </div>
                      <ChevronRight className="hidden h-5 w-5 text-white/25 md:block" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="protection" className="scroll-mt-20 overflow-hidden bg-[#ffb300] px-5 py-24 md:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#0b2433]/15 bg-white/35 px-3 py-2 text-xs font-black uppercase tracking-[0.16em]">
                <ShieldCheck className="h-4 w-4" />
                Спокойная аренда
              </div>
              <h2 className="mt-6 max-w-4xl text-4xl font-black leading-[0.92] tracking-[-0.05em] md:text-6xl lg:text-7xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                Договорённости не теряются в переписке
              </h2>
              <p className="mt-7 max-w-2xl text-lg font-semibold leading-relaxed text-[#1d3946]/75">
                RankBot сохраняет выбранный автомобиль, даты, цену и адрес подачи. Вы в любой
                момент видите все условия своей брони в Telegram.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                "Без предоплаты",
                "Фиксируем цену до выдачи",
                "Фото транспорта до аренды",
                "Русскоязычная поддержка 24/7",
              ].map((item) => (
                <div
                  key={item}
                  className="flex min-h-28 items-center gap-4 rounded-[22px] border border-[#153343]/10 bg-white/42 p-5"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#0b2b3c] text-white">
                    <Check className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-black leading-snug">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="reviews" className="scroll-mt-20 bg-white px-5 py-24 md:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto max-w-[1440px]">
            <div className="flex flex-col gap-6 border-b border-[#d7e9f1] pb-9 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1387c9]">
                  Отзывы из Telegram
                </div>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                  Люди уже съездили
                </h2>
              </div>
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 text-sm font-black text-[#0d7db8] hover:text-[#075e8b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65c9ff]"
              >
                Все отзывы в Telegram
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            <div className="mt-9 grid gap-4 lg:grid-cols-3">
              {reviews.map((review, index) => (
                <motion.article
                  key={review.name}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.42, delay: index * 0.07 }}
                  className="flex min-h-[270px] flex-col rounded-[26px] bg-[#eef8fc] p-7"
                >
                  <div className="flex gap-1 text-[#ffac00]" aria-label="Оценка 5 из 5">
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="mt-7 flex-1 text-lg font-bold leading-relaxed text-[#183846]">
                    «{review.text}»
                  </p>
                  <div className="mt-7 flex items-center gap-3 border-t border-[#d4e8f0] pt-5">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1387c9] text-sm font-black text-white">
                      {review.name[0]}
                    </span>
                    <div>
                      <div className="text-sm font-black">{review.name}</div>
                      <div className="text-xs font-semibold text-[#708894]">клиент Sunny Rentals</div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-20 bg-[#edf7fb] px-5 py-24 md:px-8 lg:px-12 lg:py-32">
          <div className="mx-auto grid max-w-[1440px] gap-12 lg:grid-cols-[0.65fr_1fr]">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#1387c9]">
                Коротко о важном
              </div>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] md:text-6xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                Перед стартом
              </h2>
              <p className="mt-6 max-w-md text-base font-medium leading-relaxed text-[#5f7b88]">
                Остались вопросы? RankBot подскажет по документам, доставке и условиям конкретного
                автомобиля.
              </p>
              <TelegramButton className="mt-8">Спросить RankBot</TelegramButton>
            </div>

            <div className="divide-y divide-[#cfe3ec] border-y border-[#cfe3ec]">
              {faqs.map((faq, index) => (
                <details key={faq.question} className="group py-1">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 rounded-xl px-2 py-6 text-left text-lg font-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#65c9ff] [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="mr-4 text-sm text-[#1387c9]">0{index + 1}</span>
                      {faq.question}
                    </span>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#bddae6] text-[#1387c9] transition group-open:rotate-90 group-open:bg-[#1387c9] group-open:text-white">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="max-w-3xl px-2 pb-7 pl-12 text-sm font-medium leading-relaxed text-[#5f7b88] md:text-base">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#0a2c3e] px-5 py-24 text-white md:px-8 lg:px-12 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(67,189,240,0.28),transparent_32%)]" />
          <div className="absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-[#ffb300]/18 blur-3xl" />
          <div className="relative mx-auto grid max-w-[1440px] items-center gap-12 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-[#79d9ff]">
                <CarFront className="h-4 w-4" />
                Следующая поездка
              </div>
              <h2 className="mt-5 max-w-5xl text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl lg:text-7xl [font-family:'Arial_Rounded_MT_Bold','Trebuchet_MS',sans-serif]">
                Выберите транспорт. Всё остальное сделает RankBot.
              </h2>
            </div>
            <TelegramButton className="w-full !px-8 !py-5 !text-base lg:w-auto">
              Открыть в Telegram
            </TelegramButton>
          </div>
        </section>
      </main>

      <footer className="bg-[#061b27] px-5 pb-28 pt-14 text-white md:px-8 md:pb-10 lg:px-12">
        <div className="mx-auto grid max-w-[1440px] gap-10 border-b border-white/10 pb-10 md:grid-cols-[1fr_auto_auto]">
          <div>
            <div className="flex items-center gap-3">
              <img src={footerLogo} alt="Sunny Rentals" className="h-10 w-auto" />
              <div>
                <div className="text-sm font-black tracking-tight">SUNNY RENTALS</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#73d5ff]">
                  Phuket
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm font-medium leading-relaxed text-white/48">
              Проверенные авто и байки на Пхукете. Выбор и бронирование через Telegram WebApp
              RankBot.
            </p>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Разделы</div>
            <div className="mt-4 grid gap-3 text-sm font-bold">
              <a href="#transport" className="hover:text-[#75d8ff]">Транспорт</a>
              <a href="#protection" className="hover:text-[#75d8ff]">Гарантии</a>
              <a href="#faq" className="hover:text-[#75d8ff]">Вопросы</a>
            </div>
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-[0.16em] text-white/40">Telegram</div>
            <div className="mt-4 grid gap-3 text-sm font-bold">
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#75d8ff]"
              >
                RankBot
              </a>
              <a
                href={TELEGRAM_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#75d8ff]"
              >
                Отзывы и новости
              </a>
            </div>
          </div>
        </div>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-2 pt-6 text-xs font-semibold text-white/35 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Sunny Rentals</span>
          <span>Пхукет, Таиланд</span>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#a9d8eb] bg-white/94 p-3 shadow-[0_-12px_36px_rgba(7,46,64,0.15)] backdrop-blur md:hidden">
        <TelegramButton className="w-full">Выбрать в RankBot</TelegramButton>
      </div>
    </div>
  );
};

export default RankBotLanding;
