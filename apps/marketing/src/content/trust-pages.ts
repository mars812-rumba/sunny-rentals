import type { VehicleCategory } from "@/content/car-contract";
import type { Locale } from "@/lib/i18n";
import { getPageFaq } from "@/content/audit-faq";
import { contentUpdatedAt, policyCopy } from "@/content/rental-policy";

export interface TrustPageContent {
  slug: string;
  published: true;
  updatedAt: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  vehicleCategories?: VehicleCategory[];
  requiresChildSeat?: boolean;
  sections: Array<{ title: string; paragraphs: string[]; items?: string[] }>;
  faq: Array<{ question: string; answer: string }>;
}
export type LocalizedTrustPage = Record<Locale, TrustPageContent>;
type EditorialPage = Omit<TrustPageContent, "slug" | "published" | "updatedAt" | "faq">;

export function localizePage(slug: string, ru: EditorialPage, en: EditorialPage): LocalizedTrustPage {
  return {
    ru: { ...ru, slug, published: true, updatedAt: contentUpdatedAt, faq: getPageFaq(slug, "ru") },
    en: { ...en, slug, published: true, updatedAt: contentUpdatedAt, faq: getPageFaq(slug, "en") },
  };
}

const ruPolicy = policyCopy("ru");
const enPolicy = policyCopy("en");

export const trustPages: LocalizedTrustPage[] = [
  localizePage("rental-terms", {
    title: "Условия аренды авто и байков на Пхукете",
    description: "Заявка и подтверждение аренды Sunny Rentals: документы, оплата, депозит, осмотр и возврат автомобиля или байка.",
    eyebrow: "До бронирования",
    intro: "Sunny Rentals помогает выбрать конкретный транспорт из каталога. Заявка на сайте ещё не подтверждает бронь: сначала проверяются даты, доступность и условия выбранного предложения.",
    sections: [
      { title: "От выбора до выдачи", paragraphs: ["Выбранная машина и параметры сохраняются при переходе в Telegram. Проверьте данные и отправьте заявку."], items: ["Выберите транспорт, даты, время и обе точки передачи.", "Получите подтверждение конкретного транспорта, полной стоимости и условий.", "Сверьте договор, осмотрите транспорт и оформите передачу.", "Верните транспорт в согласованные время и место."] },
      { title: "Деньги до подтверждения", paragraphs: ["Аренда, согласованные услуги и депозит — отдельные суммы. До оплаты получите порядок подтверждения брони и досрочного возврата в условиях выбранного предложения.", ruPolicy.carBooking, ruPolicy.delivery] },
      { title: "Документы и водители", paragraphs: ["Документы для законного управления, требования выдачи и условия страховщика — разные проверки. Перед поездкой проверьте допустимость удостоверения в Таиланде и категорию для выбранного транспорта. Для мотоцикла автомобильная категория сама по себе не подтверждает допуск.", "До подтверждения согласуйте возраст и стаж, оригиналы документов, порядок обращения с паспортом и включение дополнительного водителя в договор. Разрешение арендатора не заменяет согласование второго водителя."] },
      { title: "Осмотр и возврат", paragraphs: ["Сверьте машину и договор. Снимите кузов, стёкла, колёса, салон, уровень топлива и оборудование; внесите существующие повреждения в акт.", "Перед поездкой сохраните контакт помощи. Проверьте правила топлива, мойки, дополнительных часов, продления, пробега и разрешённых маршрутов в своём договоре. Не считайте поездки за пределы острова автоматически разрешёнными."] },
    ],
  }, {
    title: "Car and scooter rental terms in Phuket",
    description: "Sunny Rentals requests and booking confirmation: documents, payment, deposit, inspection and return of cars and scooters.",
    eyebrow: "Before booking",
    intro: "Sunny Rentals helps you choose a specific catalogue vehicle. A website request is not a confirmed booking: dates, availability and the selected offer's terms are checked first.",
    sections: [
      { title: "From selection to handover", paragraphs: ["Your vehicle and request details are kept when you continue in Telegram. Check them and send the request."], items: ["Choose a vehicle, dates, times and both meeting points.", "Obtain confirmation of the specific vehicle, total cost and terms.", "Check the agreement, inspect the vehicle and record handover.", "Return it at the agreed time and place."] },
      { title: "Money before confirmation", paragraphs: ["Rental, agreed extras and the deposit are separate amounts. Before paying, obtain the selected offer's rules for booking confirmation and early return.", enPolicy.carBooking, enPolicy.delivery] },
      { title: "Documents and drivers", paragraphs: ["Legal driving documents, rental handover requirements and insurer conditions are separate checks. Check that your licence is valid in Thailand and covers the selected vehicle. A car entitlement alone does not establish permission to ride a motorcycle.", "Agree age and experience requirements, original documents, passport handling and additional drivers before confirmation. The renter's permission does not replace approval of a second driver."] },
      { title: "Inspection and return", paragraphs: ["Match the car and agreement. Photograph bodywork, glass, wheels, interior, fuel and equipment, and record existing damage at handover.", "Save the assistance contact before driving. Check your agreement's fuel, cleaning, additional-hour, extension, mileage and route rules. Do not assume travel outside the island is automatically permitted."] },
    ],
  }),
  localizePage("deposit", {
    title: "Депозит при аренде автомобиля на Пхукете",
    description: "Депозит выбранного транспорта Sunny Rentals: отдельная сумма, отличие от аренды и франшизы, проверка внесения и возврата.",
    eyebrow: "Отдельно от аренды",
    intro: "Депозит указан у конкретного транспорта. Это обеспечение по договору, а не цена аренды и не страховая франшиза.",
    sections: [
      { title: "Сумма конкретного предложения", paragraphs: ["Откройте карточку выбранной машины или байка: у вариантов одной модели могут быть разные депозиты. Используйте сумму этого экземпляра, а не среднюю по классу."] },
      { title: "Четыре разных понятия", paragraphs: ["Аренда — плата за период. Предоплата, если она предусмотрена, относится к подтверждению брони. Депозит обеспечивает обязательства по договору. Франшиза относится к расходам при покрываемом страховом случае; она не является универсальным пределом ответственности."] },
      { title: "Внесение, возврат и удержания", paragraphs: [ruPolicy.depositReturn, "До оплаты получите условия выбранного предложения: способ и момент внесения, срок и способ возврата, основания удержаний и документы, подтверждающие ущерб. Проверьте отдельно валюту и банковские комиссии.", "При получении и сдаче фиксируйте состояние транспорта и сохраняйте акт. Размер депозита не означает автоматический размер любого удержания."] },
      { title: "Предоплата — не депозит", paragraphs: [ruPolicy.carBooking] },
    ],
  }, {
    title: "Vehicle rental deposits in Phuket",
    description: "Sunny Rentals vehicle deposits: separate amounts, rental and insurance excess differences, payment and refund checks.",
    eyebrow: "Separate from rental",
    intro: "The deposit is listed for the specific vehicle. It is security under the agreement, not rental price or insurance excess.",
    sections: [
      { title: "The selected offer's amount", paragraphs: ["Open the selected car or scooter's card. Variants of one model can have different deposits. Use that vehicle's value rather than an average for the category."] },
      { title: "Four separate concepts", paragraphs: ["Rental pays for the period. An advance payment, if required, relates to booking confirmation. The deposit secures obligations under the agreement. The excess concerns costs for a covered insurance claim; it is not a universal liability limit."] },
      { title: "Payment, refund and deductions", paragraphs: [enPolicy.depositReturn, "Before paying, obtain the selected offer's payment method and timing, refund method and deadline, deduction grounds and evidence required for damage. Check currency and bank fees separately.", "Record the condition at collection and return and keep the handover record. The deposit amount does not automatically determine every deduction."] },
      { title: "Booking advance is not the deposit", paragraphs: [enPolicy.carBooking] },
    ],
  }),
  localizePage("insurance", {
    title: "Страховка и франшиза при аренде на Пхукете",
    description: "Опубликованные условия страхования Sunny Rentals: вторая сторона ДТП, франшиза, исключения и отдельные условия байков.",
    eyebrow: "Покрытие и ответственность",
    intro: ruPolicy.insurance,
    sections: [
      { title: "Проверяйте конкретный полис", paragraphs: ["Название «класс 1» не заменяет условия договора. До аренды проверьте покрываемые события, франшизу и её применение, исключения, коммерческую аренду и порядок обращения.", "Отдельно проверьте парковочные повреждения, ДТП без второй стороны, кражу, стёкла и шины, воду и нарушения условий водителем. Наличие покрытия этих случаев здесь не обещается."] },
      { title: "Франшиза и депозит", paragraphs: ["Сумма франшизы берётся из условий конкретной машины и показана в карточке рядом с депозитом. У обычного седана, BMW и большого SUV могут быть разные значения.", "Депозит не равен франшизе. Франшиза не означает, что расходы при любом повреждении ограничены этой суммой."] },
      { title: "При происшествии", paragraphs: ["При непосредственной опасности или травмах сначала нужна экстренная помощь. Затем сообщите по контакту из договора, зафиксируйте обстоятельства и согласуйте оформление.", "Не ремонтируйте транспорт самостоятельно до фиксации повреждений и согласования."] },
      { title: "Байк и медицинская страховка", paragraphs: [ruPolicy.scooterCover, "Медицинская страховка путешественника — отдельный договор. Проверьте у своего страховщика категорию прав, объём двигателя и покрытие водителя и пассажира."] },
    ],
  }, {
    title: "Rental insurance and excess in Phuket",
    description: "Sunny Rentals published insurance terms: identified second party, excess, exclusions and separate scooter conditions.",
    eyebrow: "Coverage and liability",
    intro: enPolicy.insurance,
    sections: [
      { title: "Check the specific policy", paragraphs: ["The Class 1 name does not replace agreement terms. Check covered events, excess and how it applies, exclusions, commercial rental and reporting procedures before renting.", "Check parking damage, accidents without another party, theft, glass and tyres, water and breaches of driver conditions separately. This page does not promise cover for those events."] },
      { title: "Excess and deposit", paragraphs: ["The excess follows the specific car's terms and appears beside the deposit on its card. A standard sedan, BMW and large SUV can have different values.", "The deposit and excess are not equal by definition. The excess does not limit costs for every kind of damage."] },
      { title: "After an incident", paragraphs: ["In immediate danger or injury, emergency assistance comes first. Then use the contact in your agreement, record the circumstances and agree reporting steps.", "Do not arrange repairs before damage is recorded and the next steps are agreed."] },
      { title: "Scooters and medical insurance", paragraphs: [enPolicy.scooterCover, "Travel medical insurance is a separate agreement. Check licence category, engine size and driver and passenger cover with your insurer."] },
    ],
  }),
  localizePage("delivery", {
    title: "Доставка и возврат автомобиля на Пхукете",
    description: "Тариф доставки Sunny Rentals, отдельные места получения и возврата, встреча в аэропорту и изменение точки передачи.",
    eyebrow: "Обе точки передачи",
    intro: ruPolicy.delivery,
    sections: [
      { title: "Получение и возврат отдельно", paragraphs: [ruPolicy.delivery, "При получении в аэропорту и возврате в городе оплачивается одна городская передача. При получении и возврате в городе — две. До подтверждения в итоговых условиях должны быть указаны каждая операция и сумма за обе."] },
      { title: "Встреча и связь", paragraphs: ["Укажите точные даты, время и карту обеих точек. Для аэропорта добавьте рейс и терминал; до вылета сохраните подтверждение встречи и рабочий контакт.", "Ночную выдачу, ожидание при задержке рейса и возможные дополнительные сборы согласуйте заранее. При переносе рейса получите подтверждение нового времени."] },
      { title: "Передача и изменение места", paragraphs: ["Осмотрите транспорт, снимите состояние и уровень топлива, проверьте согласованное оборудование. До изменения точки возврата согласуйте новое место, время и стоимость."] },
    ],
  }, {
    title: "Vehicle delivery and return in Phuket",
    description: "Sunny Rentals delivery rates, separate pick-up and return locations, airport meetings and changing handover points.",
    eyebrow: "Both handover points",
    intro: enPolicy.delivery,
    sections: [
      { title: "Pick-up and return separately", paragraphs: [enPolicy.delivery, "Airport collection and city return mean one city handover charge. City collection and city return mean two. Obtain separate charges and the total for both operations before confirmation."] },
      { title: "Meeting and contact", paragraphs: ["Provide exact dates, times and map pins for both points. For the airport, include your flight and terminal; save the meeting confirmation and working contact before departure.", "Agree night handover, flight-delay waiting and any additional fees beforehand. If the flight changes, obtain confirmation of the revised time."] },
      { title: "Handover and location changes", paragraphs: ["Inspect the vehicle, record condition and fuel, and check agreed equipment. Agree the new point, time and cost before changing the return location."] },
    ],
  }),
  localizePage("faq", {
    title: "Вопросы об аренде авто и байков на Пхукете",
    description: "Стоимость, подтверждение заявки, депозит, страховка, доставка и выбор машины или байка Sunny Rentals.",
    eyebrow: "Ответы по темам",
    intro: "Начните с вопроса, который влияет на выбор. Подробные условия вынесены на отдельные страницы, а суммы конкретного транспорта — в его карточку.",
    sections: [
      { title: "Цена и бронирование", paragraphs: ["Сравнивайте сумму за весь период. Депозит и согласованные услуги учитывайте отдельно. Открытие Telegram и отправленная заявка ещё не подтверждают наличие."] },
      { title: "Деньги и покрытие", paragraphs: ["Депозит, предоплата и франшиза — разные условия. Их сумма и правила применения должны быть понятны до оплаты. Ограничения полиса важнее названия класса."] },
      { title: "Получение и выбор", paragraphs: ["Укажите обе точки передачи, пассажиров и багаж. Семь мест не гарантируют большой багажник, а байку нужны собственные документы и экипировка."] },
    ],
  }, {
    title: "Phuket car and scooter rental FAQ",
    description: "Sunny Rentals costs, requests and confirmation, deposits, insurance, delivery and choosing a car or scooter.",
    eyebrow: "Questions by topic",
    intro: "Start with the question that affects your choice. Detailed terms have their own pages, and vehicle-specific amounts appear on the vehicle card.",
    sections: [
      { title: "Price and booking", paragraphs: ["Compare totals for the whole period. Budget separately for the deposit and agreed extras. Opening Telegram or submitting a request does not confirm availability."] },
      { title: "Money and coverage", paragraphs: ["Deposit, advance payment and excess are different terms. Amounts and rules should be clear before payment. Policy limitations matter more than the class name."] },
      { title: "Collection and selection", paragraphs: ["Specify both meeting points, passengers and luggage. Seven seats do not guarantee a large boot; scooters require their own documents and equipment."] },
    ],
  }),
];

export const trustPageSlugs = trustPages.map((page) => page.ru.slug);
export function getTrustPage(slug: string, locale: Locale) {
  return trustPages.find((page) => page[locale].slug === slug)?.[locale];
}
