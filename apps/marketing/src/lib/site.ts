export const siteConfig = {
  name: "Sunny Rentals",
  url: "https://sunny-rentals.online",
  locale: "ru_RU",
  title: "Аренда авто и байков на Пхукете",
  description:
    "Аренда автомобилей и байков на Пхукете с прозрачными ценами, доставкой и поддержкой 24/7.",
  telegramBotUrl: "https://t.me/webapp_rent_bot",
  whatsappUrl: "https://wa.me/66842039140",
} as const;

export function absoluteUrl(path = "/"): string {
  return new URL(path, siteConfig.url).toString();
}
