export const siteConfig = {
  name: "Sunny Rentals",
  url: "https://sunny-rentals.online",
  locale: "ru_RU",
  title: "Аренда авто и байков на Пхукете",
  description:
    "Автомобили и байки в аренду на Пхукете: фотографии, сезонные тарифы и бронирование через Telegram.",
  telegramBotUrl: "https://t.me/webapp_rent_bot",
  managerTelegramUrl: "https://t.me/marseloid",
  managerTelegramHandle: "@marseloid",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}
