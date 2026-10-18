// Owner-approved migration from src/components/site/ReviewsSection.tsx.
// The first entry (a team reply, /4814) is deliberately excluded.
// Legacy five-star values were hardcoded: do not turn them into ratings/schema.
export const customerReviews = [
  {
    id: "5228",
    ru: "Брал в аренду MG5 на 2 дня. Первое что хотел бы выделить это то что дали авто на такой короткий срок, не каждый рентал дает. Авто получил в срок, чистое, салон был чист, все работало отлично.",
    en: "I rented an MG5 for two days. The first thing I'd highlight is that they agreed to such a short rental — not every rental company does. I received the car on time; it was clean inside and out, and everything worked perfectly.",
  },
  {
    id: "2848",
    ru: "Брали машину у Марселя. Все организовано качественно, машину доставили в аэропорт вовремя. Обслуживание 👍🏻 Рекомендуем 🤝",
    en: "We rented a car from Marsel. Everything was well organised, and the car was delivered to the airport on time. Great service 👍🏻 Recommended 🤝",
  },
  {
    id: "2515",
    ru: "Прилетаем на Пхукет второй год подряд, машину беру соответственно только тут, машинки все новые, приятные, человек всегда на связи если вдруг возникнут вопросы всегда поможет! 🔥🤝👌",
    en: "It's our second year in a row visiting Phuket, and this is the only place I rent a car from. The cars are new and nice, and he's always available and ready to help if any questions come up! 🔥🤝👌",
  },
  {
    id: "2336",
    ru: "Заказывали Хпандер 7 мест, так как две семьи, на 10 дней. Что-то с Хпандером не получилось, но тут же нашли замену исузу, крутой 7 местный. За те же деньги. Всё круто, оперативно, быстро решают вопросы!",
    en: "We booked a seven-seat Xpander for ten days because there were two families. Something didn't work out with the Xpander, but they immediately found a replacement: a great seven-seat Isuzu, for the same price. Everything was great — quick service and problems sorted out fast!",
  },
  {
    id: "2284",
    ru: "Брал Яриса 2023 года на 10 дней.👍 Откатались на ура 🙌",
    en: "I rented a 2023 Yaris for ten days. 👍 We had a great time driving it 🙌",
  },
  {
    id: "2281",
    ru: "2 раза уже у Марселя машины брал. Оба раза новые, без проблем, сервис, все четко👍",
    en: "I've rented cars from Marsel twice now. New cars both times, no problems, good service — everything went smoothly 👍",
  },
  {
    id: "2280",
    ru: "2 месяца на xpander ездил благодаря этой группе 👍 все четко! 5 взрослых и 2 детей нормально, машина не маленькая))👍👌",
    en: "Thanks to this group, I drove an Xpander for two months 👍 Everything went smoothly! Five adults and two children fitted fine — it's not a small car! 👍👌",
  },
] as const;

export const customerReviewVideo = {
  src: "/media/reviews/customer-review.mp4",
  poster: "/media/reviews/customer-review-poster.webp",
  instagram: "https://www.instagram.com/stories/highlights/18051917455385470/",
};
