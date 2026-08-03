import type { VehicleCategory } from "@/content/cars";
import type { TrustPageContent } from "@/content/trust-pages";
import type { Locale } from "@/lib/i18n";

type LocalizedPage = Record<Locale, TrustPageContent>;
const updatedAt = "2026-08-03";

export const commercialPages: LocalizedPage[] = [
  {
    ru: {
      slug: "phuket-airport-car-rental", published: true, updatedAt,
      title: "Аренда авто в аэропорту Пхукета",
      description: "Аренда конкретного автомобиля с бесплатной доставкой в аэропорт Пхукета. Реальные фото, сезонные цены и бронирование через Telegram.",
      eyebrow: "Аэропорт Пхукета · доставка 0 ฿",
      intro: "Выберите конкретную машину заранее и укажите аэропорт как место получения. Доставка в аэропорт бесплатна, время встречи подтверждает менеджер.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "Как получить машину в аэропорту", paragraphs: ["Выберите модель и даты на сайте, затем продолжите в Telegram. Менеджер проверит доступность и согласует время и точку встречи в аэропорту."], items: ["Доставка в аэропорт — 0 ฿.", "ID выбранной машины сохраняется в Telegram.", "Депозит и франшиза показаны отдельно.", "Все фотографии относятся к реальным машинам."] },
        { title: "Как выбрать класс", paragraphs: ["Компакт удобен для города, седан — для комфортных поездок, SUV — для дополнительного пространства, а 7-местный автомобиль подходит семье или группе с багажом."] },
        { title: "Что проверить при получении", paragraphs: ["Осмотрите кузов, салон, колёса и стёкла вместе с менеджером. Зафиксируйте состояние и уровень топлива до начала аренды. Автомобиль передаётся чистым и с полным баком."] },
      ],
      faq: [
        { question: "Сколько стоит доставка в аэропорт Пхукета?", answer: "0 ฿ — доставка в аэропорт бесплатна." },
        { question: "Можно выбрать конкретную машину?", answer: "Да. Заявка содержит ID выбранной модели, но доступность на даты подтверждает менеджер." },
        { question: "Можно вернуть машину в аэропорту?", answer: "Укажите аэропорт как место возврата и заранее согласуйте время с менеджером." },
      ],
    },
    en: {
      slug: "phuket-airport-car-rental", published: true, updatedAt,
      title: "Car rental at Phuket Airport",
      description: "Rent a specific car with free Phuket Airport delivery. Real photos, seasonal rates and booking through Telegram.",
      eyebrow: "Phuket Airport · delivery 0 THB",
      intro: "Choose a specific vehicle before arrival and select the airport as your pick-up point. Airport delivery is free; a manager confirms the meeting time.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "How airport pick-up works", paragraphs: ["Choose a model and dates, then continue in Telegram. A manager checks availability and agrees the meeting time and point at the airport."], items: ["Airport delivery: 0 THB.", "Telegram keeps the selected vehicle ID.", "Deposit and excess are shown separately.", "Every image shows a real vehicle."] },
        { title: "Choosing a vehicle class", paragraphs: ["A compact is easy in town, a sedan adds comfort, an SUV adds space, and a seven-seat vehicle suits a family or group with luggage."] },
        { title: "What to check at handover", paragraphs: ["Inspect bodywork, interior, wheels and glass with the manager. Record the condition and fuel level before driving away. Cars are supplied clean and with a full tank."] },
      ],
      faq: [
        { question: "How much is Phuket Airport delivery?", answer: "0 THB — airport delivery is free." },
        { question: "Can I choose a specific car?", answer: "Yes. The request contains the selected vehicle ID, while a manager confirms availability for your dates." },
        { question: "Can I return the car at the airport?", answer: "Select the airport as the return point and agree the time with the manager in advance." },
      ],
    },
  },
  {
    ru: {
      slug: "short-term-car-rental-phuket", published: true, updatedAt,
      title: "Аренда авто на день или неделю на Пхукете",
      description: "Краткосрочная аренда авто и байков на Пхукете: тарифы на 1–6 и 7–14 дней, реальные фото, депозит и доставка.",
      eyebrow: "Короткий срок · понятный расчёт",
      intro: "Для поездки на несколько дней используйте тариф 1–6 дней, для недели — сетку 7–14 дней. Точная сумма рассчитывается по выбранным датам и сезону.",
      vehicleCategories: ["compact", "sedan", "suv", "7s", "bikes"],
      sections: [
        { title: "Цена на короткий срок", paragraphs: ["На странице каждой машины показаны отдельные ставки для 1–6 и 7–14 дней. Если период пересекает сезоны, расчёт учитывает ставки каждого дня."], items: ["Депозит не входит в стоимость аренды.", "Аэропорт — доставка 0 ฿.", "Город, отель или вилла — 500 ฿."] },
        { title: "Автомобиль или байк", paragraphs: ["Автомобиль подходит для багажа, семьи и поездок в любую погоду. Байк удобен для коротких маршрутов, но передаётся без страховки и требует прав соответствующей категории."] },
        { title: "Как отправить заявку", paragraphs: ["Выберите транспорт, укажите даты и продолжите в Telegram. Менеджер подтвердит фактическую доступность конкретной машины или байка."] },
      ],
      faq: [
        { question: "Можно арендовать машину на один день?", answer: "Цена для короткого периода рассчитывается по сетке 1–6 дней. Минимальный срок конкретной машины подтвердит менеджер." },
        { question: "Как считается неделя?", answer: "Для периода 7–14 дней используется соответствующая ставка выбранной машины и сезона." },
        { question: "Байк застрахован?", answer: "Нет. Байки передаются без страховки." },
      ],
    },
    en: {
      slug: "short-term-car-rental-phuket", published: true, updatedAt,
      title: "Daily and weekly vehicle rental in Phuket",
      description: "Short-term car and scooter rental in Phuket: 1–6 and 7–14 day rates, real photos, deposits and delivery terms.",
      eyebrow: "Short term · clear calculation",
      intro: "Use the 1–6 day tier for a short trip and the 7–14 day tier for a week. The exact total follows your selected dates and season.",
      vehicleCategories: ["compact", "sedan", "suv", "7s", "bikes"],
      sections: [
        { title: "Short-term pricing", paragraphs: ["Every vehicle page shows separate 1–6 and 7–14 day rates. When dates cross seasons, the calculation applies the relevant rate to each day."], items: ["The deposit is separate from rental price.", "Airport delivery: 0 THB.", "City, hotel or villa delivery: 500 THB."] },
        { title: "Car or scooter", paragraphs: ["A car suits luggage, families and changing weather. A scooter is convenient for shorter routes but has no insurance and requires the correct licence category."] },
        { title: "Sending a request", paragraphs: ["Choose a vehicle, select dates and continue in Telegram. A manager confirms the specific car or scooter's availability."] },
      ],
      faq: [
        { question: "Can I rent a car for one day?", answer: "A short period uses the 1–6 day tier. A manager confirms the minimum term for the specific vehicle." },
        { question: "How is a week priced?", answer: "A 7–14 day period uses the corresponding rate for the selected vehicle and season." },
        { question: "Is a scooter insured?", answer: "No. Scooters are supplied without insurance." },
      ],
    },
  },
  {
    ru: {
      slug: "long-term-car-rental-phuket", published: true, updatedAt,
      title: "Долгосрочная аренда авто на Пхукете",
      description: "Аренда автомобиля на месяц и дольше на Пхукете: тариф 30+ дней, реальные машины, депозит, страховка и доставка.",
      eyebrow: "30 дней и дольше",
      intro: "Для аренды от 30 дней у каждой машины действует отдельная долгосрочная ставка. Сравнивайте конкретные автомобили, а не абстрактные классы.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "Как считается месяц", paragraphs: ["В тарифной сетке каждой машины есть ставка 30+ дней. Итог зависит от фактических дат и сезона; депозит показывается отдельно."], items: ["Реальные фотографии конкретной машины.", "Страховка класса 1 для автомобилей.", "Франшиза зависит от класса и модели.", "Детское кресло предоставляется бесплатно."] },
        { title: "Что выбрать на долгий срок", paragraphs: ["Компакт помогает снизить ежедневные расходы, седан добавляет комфорт, SUV подходит для багажа и активных поездок, а 7-местный автомобиль — для большой семьи."] },
        { title: "Получение и поддержка", paragraphs: ["Аэропорт — 0 ฿, город, отель или вилла — 500 ฿. Автомобиль передаётся чистым и с полным баком. Условия связи с менеджером на срок аренды уточняются при подтверждении."] },
      ],
      faq: [
        { question: "Когда начинается долгосрочный тариф?", answer: "Ставка 30+ применяется при аренде от 30 дней." },
        { question: "Депозит включён в месячную цену?", answer: "Нет. Депозит конкретной машины показывается отдельно." },
        { question: "Можно получить машину в аэропорту?", answer: "Да, доставка в аэропорт бесплатна." },
      ],
    },
    en: {
      slug: "long-term-car-rental-phuket", published: true, updatedAt,
      title: "Long-term car rental in Phuket",
      description: "Monthly and long-term car rental in Phuket: 30+ day rates, real vehicles, deposit, insurance and delivery terms.",
      eyebrow: "30 days and longer",
      intro: "Every vehicle has a separate 30+ day rate. Compare specific cars rather than generic classes for a monthly rental.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "How a month is priced", paragraphs: ["Every vehicle's rate grid includes a 30+ day tier. The total follows actual dates and season; the deposit is shown separately."], items: ["Real photos of the specific vehicle.", "Class 1 insurance for cars.", "Excess depends on class and model.", "A child seat is free."] },
        { title: "Choosing for a longer term", paragraphs: ["A compact can reduce daily costs, a sedan adds comfort, an SUV suits luggage and active travel, and a seven-seat vehicle works for a larger family."] },
        { title: "Handover and support", paragraphs: ["Airport delivery is 0 THB; city, hotel or villa delivery is 500 THB. Cars are supplied clean and with a full tank. Confirm support arrangements with the manager before booking."] },
      ],
      faq: [
        { question: "When does the long-term rate start?", answer: "The 30+ tier applies to rentals of 30 days or longer." },
        { question: "Is the deposit included in the monthly price?", answer: "No. The specific vehicle's deposit is shown separately." },
        { question: "Can the car be delivered to the airport?", answer: "Yes. Airport delivery is free." },
      ],
    },
  },
  {
    ru: {
      slug: "car-rental-with-child-seat-phuket", published: true, updatedAt,
      title: "Аренда авто с бесплатным детским креслом на Пхукете",
      description: "Автомобиль напрокат на Пхукете с бесплатным детским креслом. Реальные машины, сезонные цены и доставка в аэропорт 0 бат.",
      eyebrow: "Детское кресло · 0 ฿",
      intro: "Для автомобилей Sunny Rentals детское кресло предоставляется бесплатно по запросу. Укажите необходимость кресла при подтверждении бронирования.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "Как заказать кресло", paragraphs: ["Выберите автомобиль и даты, затем сообщите менеджеру, что нужно детское кресло. Стоимость — 0 ฿."], items: ["Кресло доступно для автомобилей, не для байков.", "Запрос нужно подтвердить до передачи машины.", "Доплата за кресло не взимается."] },
        { title: "Какой автомобиль выбрать семье", paragraphs: ["Компакт подойдёт для небольшой семьи без большого багажа. Седан добавляет багажное пространство, SUV — высокую посадку, а 7-местный автомобиль подходит большой семье."] },
        { title: "Доставка для семьи", paragraphs: ["Доставка автомобиля в аэропорт бесплатна. Доставка по городу, к отелю или вилле стоит 500 ฿. Автомобиль передаётся чистым и с полным баком."] },
      ],
      faq: [
        { question: "Сколько стоит детское кресло?", answer: "0 ฿ — кресло для автомобиля предоставляется бесплатно." },
        { question: "Нужно заказывать кресло заранее?", answer: "Да, сообщите о нём менеджеру до подтверждения передачи автомобиля." },
        { question: "Кресло доступно для байка?", answer: "Нет. Условие относится только к автомобилям." },
      ],
    },
    en: {
      slug: "car-rental-with-child-seat-phuket", published: true, updatedAt,
      title: "Car rental with a free child seat in Phuket",
      description: "Rent a car in Phuket with a free child seat. Real vehicles, seasonal prices and 0 THB airport delivery.",
      eyebrow: "Child seat · 0 THB",
      intro: "A child seat is available free on request for Sunny Rentals cars. Tell the manager you need one when confirming the booking.",
      vehicleCategories: ["compact", "sedan", "suv", "7s"],
      sections: [
        { title: "Requesting a child seat", paragraphs: ["Choose a car and dates, then tell the manager you need a child seat. The price is 0 THB."], items: ["Available for cars, not scooters.", "Confirm the request before handover.", "There is no child-seat surcharge."] },
        { title: "Choosing a family car", paragraphs: ["A compact suits a smaller family without much luggage. A sedan adds boot space, an SUV adds a higher seating position, and a seven-seat vehicle suits a larger family."] },
        { title: "Family delivery", paragraphs: ["Airport delivery is free. City, hotel or villa delivery costs 500 THB. Cars are supplied clean and with a full tank."] },
      ],
      faq: [
        { question: "How much is a child seat?", answer: "0 THB — a car child seat is free." },
        { question: "Should I request it in advance?", answer: "Yes. Tell the manager before the vehicle handover is confirmed." },
        { question: "Is a child seat available for a scooter?", answer: "No. This condition applies only to cars." },
      ],
    },
  },
];

const categoryConfigs: Array<{
  category: VehicleCategory;
  slug: string;
  ru: { title: string; description: string; eyebrow: string; intro: string; use: string; insurance: string };
  en: { title: string; description: string; eyebrow: string; intro: string; use: string; insurance: string };
}> = [
  { category: "compact", slug: "compact-car-rental-phuket", ru: { title: "Аренда компактного автомобиля на Пхукете", description: "Компактные автомобили в аренду на Пхукете: реальные фото, цены по сроку, депозит и бесплатная доставка в аэропорт.", eyebrow: "Компактные автомобили", intro: "Манёвренные машины для города, пляжей и ежедневных поездок по острову.", use: "Компакт удобен для пары или небольшой семьи, проще парковается и подходит для регулярных поездок.", insurance: "Страховка класса 1, франшиза 5 000 ฿." }, en: { title: "Compact car rental in Phuket", description: "Compact cars for rent in Phuket with real photos, term-based rates, deposits and free airport delivery.", eyebrow: "Compact cars", intro: "Easy-to-drive vehicles for town, beaches and everyday island trips.", use: "A compact suits a couple or small family, is easier to park and works well for daily travel.", insurance: "Class 1 insurance with a 5,000 THB excess." } },
  { category: "sedan", slug: "sedan-rental-phuket", ru: { title: "Аренда седана на Пхукете", description: "Седаны в аренду на Пхукете: реальные машины, сезонные тарифы, страховка и доставка в аэропорт бесплатно.", eyebrow: "Седаны", intro: "Комфортные автомобили для поездок по острову, аэропорта и маршрутов с багажом.", use: "Седан подходит тем, кому важны комфорт на дистанции и отдельное багажное пространство.", insurance: "Страховка класса 1; стандартная франшиза 5 000 ฿, BMW — 30 000 ฿." }, en: { title: "Sedan rental in Phuket", description: "Sedans for rent in Phuket with real vehicles, seasonal rates, insurance and free airport delivery.", eyebrow: "Sedans", intro: "Comfortable cars for island journeys, airport travel and routes with luggage.", use: "A sedan suits drivers who value distance comfort and separate luggage space.", insurance: "Class 1 insurance; standard excess 5,000 THB, BMW 30,000 THB." } },
  { category: "suv", slug: "suv-rental-phuket", ru: { title: "Аренда SUV и кроссовера на Пхукете", description: "SUV и кроссоверы напрокат на Пхукете: реальные фото, тарифы, страховка, франшиза и доставка.", eyebrow: "SUV и кроссоверы", intro: "Высокая посадка и дополнительное пространство для багажа и активных поездок.", use: "Кроссовер удобен семье, путешественникам с багажом и тем, кто предпочитает высокую посадку.", insurance: "Класс 1: паркетники — франшиза 10 000 ฿; Fortuner, MUX и Legender — 20 000 ฿; Ford Raptor — 30 000 ฿." }, en: { title: "SUV and crossover rental in Phuket", description: "SUVs and crossovers for rent in Phuket with real photos, rates, insurance, excess and delivery terms.", eyebrow: "SUVs and crossovers", intro: "A higher seating position and extra room for luggage and active trips.", use: "A crossover suits families, travellers with luggage and drivers who prefer a higher seating position.", insurance: "Class 1: crossover excess 10,000 THB; Fortuner, MUX and Legender 20,000 THB; Ford Raptor 30,000 THB." } },
  { category: "7s", slug: "seven-seat-car-rental-phuket", ru: { title: "Аренда 7-местного автомобиля на Пхукете", description: "Семиместные автомобили и минивэны в аренду на Пхукете: реальные фото, цены, страховка и бесплатный аэропорт.", eyebrow: "7 мест и больше", intro: "Автомобили для большой семьи, компании и поездок с дополнительным багажом.", use: "Выбирайте 7-местную машину, если важно ехать одной группой и сохранить место для багажа.", insurance: "Страховка класса 1, франшиза 10 000 ฿." }, en: { title: "Seven-seat car rental in Phuket", description: "Seven-seat cars and minivans for rent in Phuket with real photos, rates, insurance and free airport delivery.", eyebrow: "Seven seats and more", intro: "Vehicles for larger families, groups and journeys with extra luggage.", use: "Choose a seven-seat vehicle when the group should travel together with room for luggage.", insurance: "Class 1 insurance with a 10,000 THB excess." } },
  { category: "bikes", slug: "scooter-rental-phuket", ru: { title: "Аренда байка и скутера на Пхукете", description: "Байки и скутеры напрокат на Пхукете: реальные фотографии, сезонные цены, депозит и условия доставки.", eyebrow: "Байки и скутеры", intro: "Компактный транспорт для коротких маршрутов и ежедневных поездок по острову.", use: "Байк подходит опытному водителю с правами соответствующей категории и небольшим количеством багажа.", insurance: "Байки передаются без страховки." }, en: { title: "Scooter and motorbike rental in Phuket", description: "Scooters and motorbikes for rent in Phuket with real photos, seasonal rates, deposits and delivery terms.", eyebrow: "Scooters and motorbikes", intro: "Compact transport for shorter routes and everyday island travel.", use: "A scooter suits an experienced rider with the correct licence category and limited luggage.", insurance: "Scooters are supplied without insurance." } },
];

for (const config of categoryConfigs) {
  commercialPages.push({
    ru: {
      slug: config.slug, published: true, updatedAt, title: config.ru.title, description: config.ru.description,
      eyebrow: config.ru.eyebrow, intro: config.ru.intro, vehicleCategories: [config.category],
      sections: [
        { title: "Кому подходит этот класс", paragraphs: [config.ru.use] },
        { title: "Цена и условия", paragraphs: ["На странице каждой машины показаны ставки на 1–6, 7–14, 15–29 и 30+ дней. Депозит указан отдельно."], items: [config.ru.insurance, "Аэропорт — 0 ฿.", "Город, отель или вилла — 500 ฿.", ...(config.category === "bikes" ? [] : ["Детское кресло — бесплатно."])] },
        { title: "Конкретный транспорт", paragraphs: ["В каталоге опубликованы реальные фотографии каждой машины. Выберите модель и продолжите в Telegram; менеджер подтвердит доступность на даты."] },
      ],
      faq: [
        { question: "Фотографии реальные?", answer: "Да, фотографии относятся к конкретному транспорту из каталога." },
        { question: "Как узнать точную цену?", answer: "Выберите даты: итог рассчитывается по сроку и сезону для конкретной машины." },
        { question: "Сколько стоит аэропорт?", answer: "Доставка в аэропорт Пхукета бесплатна — 0 ฿." },
      ],
    },
    en: {
      slug: config.slug, published: true, updatedAt, title: config.en.title, description: config.en.description,
      eyebrow: config.en.eyebrow, intro: config.en.intro, vehicleCategories: [config.category],
      sections: [
        { title: "Who this class suits", paragraphs: [config.en.use] },
        { title: "Rates and terms", paragraphs: ["Every vehicle page shows 1–6, 7–14, 15–29 and 30+ day rates. The deposit is separate."], items: [config.en.insurance, "Airport delivery: 0 THB.", "City, hotel or villa: 500 THB.", ...(config.category === "bikes" ? [] : ["A child seat is free."])] },
        { title: "A specific vehicle", paragraphs: ["The catalogue shows real photos of every vehicle. Choose a model and continue in Telegram; a manager confirms availability for your dates."] },
      ],
      faq: [
        { question: "Are the photos real?", answer: "Yes. Every photo belongs to the specific catalogue vehicle." },
        { question: "How do I get the exact price?", answer: "Select dates to calculate the total by rental term and season for the specific vehicle." },
        { question: "How much is airport delivery?", answer: "Phuket Airport delivery is free — 0 THB." },
      ],
    },
  });
}
