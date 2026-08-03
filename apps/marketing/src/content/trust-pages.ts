import type { Locale } from "@/lib/i18n";

export interface TrustPageContent {
  slug: string;
  published: true;
  updatedAt: string;
  title: string;
  description: string;
  eyebrow: string;
  intro: string;
  sections: Array<{
    title: string;
    paragraphs: string[];
    items?: string[];
  }>;
  faq: Array<{ question: string; answer: string }>;
}

type LocalizedTrustPage = Record<Locale, TrustPageContent>;

const updatedAt = "2026-08-03";

export const trustPages: LocalizedTrustPage[] = [
  {
    ru: {
      slug: "rental-terms", published: true, updatedAt,
      title: "Условия аренды авто и байков на Пхукете",
      description: "Порядок аренды Sunny Rentals: выбор машины, документы, цена, депозит, получение, полный бак и возврат транспорта на Пхукете.",
      eyebrow: "До бронирования",
      intro: "Sunny Rentals работает как агрегатор: помогает выбрать конкретный транспорт из каталога и передаёт заявку менеджеру. Доступность выбранной машины подтверждается после проверки дат.",
      sections: [
        { title: "Как проходит аренда", paragraphs: ["Вы выбираете конкретную машину или байк, даты и место получения. Telegram сохраняет выбранную модель и передаёт заявку менеджеру."], items: ["Выбор транспорта и расчёт по датам на сайте.", "Подтверждение модели, времени и места передачи менеджером.", "Получение транспорта и фиксация его состояния.", "Возврат в согласованное время и место."] },
        { title: "Цена и депозит", paragraphs: ["Ставка зависит от сезона и срока: 1–6, 7–14, 15–29 или 30+ дней. Депозит показывается отдельно в карточке конкретной машины и не включается в стоимость аренды."], items: ["Аэропорт Пхукета — доставка 0 ฿.", "Город, отель или вилла — доставка 500 ฿.", "Дополнительные условия согласуются до подтверждения брони."] },
        { title: "Получение и возврат", paragraphs: ["Автомобили передаются чистыми и с полным баком. Все фотографии в каталоге показывают реальные машины. При получении стоит вместе с менеджером осмотреть транспорт и зафиксировать его состояние."], items: ["Проверьте кузов, стёкла, колёса и салон.", "Сверьте уровень топлива.", "Уточните контакт менеджера на время аренды.", "Возвращайте транспорт в согласованном состоянии и месте."] },
        { title: "Документы", paragraphs: ["Обычно требуются паспорт и действующее водительское удостоверение нужной категории. Требования к международному водительскому удостоверению и конкретной категории прав необходимо подтвердить до поездки."] },
      ],
      faq: [
        { question: "Можно забронировать конкретную машину?", answer: "Да. Сайт и Telegram передают ID выбранной машины. Фактическую доступность на ваши даты подтверждает менеджер." },
        { question: "Цена на сайте окончательная?", answer: "Аренда рассчитывается по сезону и сроку. Депозит указывается отдельно, доставка стоит 0 ฿ в аэропорт или 500 ฿ по городу." },
        { question: "Машина будет с фотографий?", answer: "В каталоге используются реальные фотографии конкретного транспорта. Доступность именно этой машины подтверждается после выбора дат." },
      ],
    },
    en: {
      slug: "rental-terms", published: true, updatedAt,
      title: "Car and scooter rental terms in Phuket",
      description: "Sunny Rentals process: choosing a vehicle, documents, pricing, deposit, handover, full tank and return in Phuket.",
      eyebrow: "Before you book",
      intro: "Sunny Rentals operates as an aggregator: we help you choose a specific catalogue vehicle and pass the request to a manager. Availability is confirmed after your dates are checked.",
      sections: [
        { title: "How the rental works", paragraphs: ["Choose a specific car or scooter, dates and handover location. Telegram keeps the selected vehicle and sends your request to a manager."], items: ["Choose a vehicle and calculate your dates on the website.", "A manager confirms the model, time and handover location.", "Collect the vehicle and record its condition.", "Return it at the agreed time and place."] },
        { title: "Price and deposit", paragraphs: ["The rate depends on season and rental term: 1–6, 7–14, 15–29 or 30+ days. The deposit is shown separately on each vehicle page and is not included in the rental price."], items: ["Phuket Airport delivery: 0 THB.", "City, hotel or villa delivery: 500 THB.", "Any additional terms are agreed before confirmation."] },
        { title: "Handover and return", paragraphs: ["Cars are supplied clean and with a full tank. Every catalogue image is a real photo of the listed vehicle. Inspect and record the vehicle condition together with the manager at handover."], items: ["Check bodywork, glass, wheels and interior.", "Confirm the fuel level.", "Save the manager's contact details.", "Return the vehicle in the agreed condition and location."] },
        { title: "Documents", paragraphs: ["A passport and a valid driving licence for the relevant category are normally required. Confirm international driving permit and licence-category requirements before the trip."] },
      ],
      faq: [
        { question: "Can I request a specific vehicle?", answer: "Yes. The website and Telegram pass the selected vehicle ID. A manager confirms its availability for your dates." },
        { question: "Is the website price final?", answer: "Rental is calculated by season and term. The deposit is separate; delivery is 0 THB to the airport or 500 THB in the city." },
        { question: "Will I receive the vehicle in the photos?", answer: "The catalogue uses real photos of specific vehicles. A manager confirms that vehicle's availability after you select dates." },
      ],
    },
  },
  {
    ru: {
      slug: "insurance", published: true, updatedAt,
      title: "Страховка и франшиза при аренде на Пхукете",
      description: "Как работает страховка класса 1 у автомобилей Sunny Rentals, что такое франшиза и почему байки передаются без страховки.",
      eyebrow: "Страхование без догадок",
      intro: "У автомобилей действует страховка класса 1 при ДТП с участием двух сторон. На байки страховка не предоставляется.",
      sections: [
        { title: "Когда действует страховка", paragraphs: ["Обязательное условие страхового случая — наличие идентифицированной второй стороны ДТП. Нужно сразу связаться с менеджером и следовать инструкции по оформлению происшествия."], items: ["Не покидайте место происшествия без согласования.", "Зафиксируйте участников и повреждения.", "Свяжитесь с менеджером.", "Соблюдайте порядок оформления страхового случая."] },
        { title: "Что не входит", paragraphs: ["Царапины и повреждения на парковке без установленной второй стороны в страховое покрытие не входят. Это относится и к другим повреждениям, для которых отсутствует вторая сторона ДТП."] },
        { title: "Размер франшизы", paragraphs: ["Франшиза показывается отдельно от депозита и цены аренды."], items: ["Компакт и седан — 5 000 ฿.", "Паркетники и автомобили на 7 мест — 10 000 ฿.", "Fortuner, MUX и Legender — 20 000 ฿.", "BMW и Ford Ranger/Raptor — 30 000 ฿."] },
        { title: "Байки", paragraphs: ["Байки Sunny Rentals передаются без страховки. Перед бронированием необходимо учитывать личную ответственность за транспорт и возможный ущерб."] },
      ],
      faq: [
        { question: "Страховка покрывает царапину на парковке?", answer: "Нет, если нет идентифицированной второй стороны происшествия." },
        { question: "Франшиза и депозит — одно и то же?", answer: "Нет. Депозит — отдельная сумма по конкретной машине, франшиза определяет часть ответственности в страховом случае." },
        { question: "Есть ли страховка на байки?", answer: "Нет. Байки передаются без страховки." },
      ],
    },
    en: {
      slug: "insurance", published: true, updatedAt,
      title: "Rental insurance and excess in Phuket",
      description: "How Class 1 insurance works for Sunny Rentals cars, excess amounts and why scooters are supplied without insurance.",
      eyebrow: "Insurance without guesswork",
      intro: "Cars have Class 1 insurance for accidents with an identified second party. Scooters are supplied without insurance.",
      sections: [
        { title: "When insurance applies", paragraphs: ["An identified second party to the road accident is required for an insurance claim. Contact the manager immediately and follow the incident-reporting instructions."], items: ["Do not leave the scene without agreement.", "Record participants and damage.", "Contact the manager.", "Follow the required insurance procedure."] },
        { title: "What is excluded", paragraphs: ["Parking scratches and damage without an identified second party are excluded. The same applies to other damage where there is no second party to the accident."] },
        { title: "Excess amounts", paragraphs: ["The excess is separate from both the deposit and rental price."], items: ["Compact cars and sedans: 5,000 THB.", "Crossovers and seven-seat vehicles: 10,000 THB.", "Fortuner, MUX and Legender: 20,000 THB.", "BMW and Ford Ranger/Raptor: 30,000 THB."] },
        { title: "Scooters", paragraphs: ["Sunny Rentals scooters are supplied without insurance. Consider your personal liability for the vehicle and possible damage before booking."] },
      ],
      faq: [
        { question: "Does insurance cover a parking scratch?", answer: "No, when there is no identified second party to the incident." },
        { question: "Are the excess and deposit the same?", answer: "No. The deposit is set for a specific vehicle; the excess defines part of the liability for an insured event." },
        { question: "Are scooters insured?", answer: "No. Scooters are supplied without insurance." },
      ],
    },
  },
  {
    ru: {
      slug: "deposit", published: true, updatedAt,
      title: "Депозит при аренде автомобиля на Пхукете",
      description: "Чем депозит отличается от цены аренды и страховой франшизы, где посмотреть сумму для конкретной машины Sunny Rentals.",
      eyebrow: "Отдельно от цены аренды",
      intro: "Депозит указывается для каждой машины в каталоге и всегда показывается отдельной суммой. Мы не смешиваем его с тарифом аренды или доставкой.",
      sections: [
        { title: "Где посмотреть сумму", paragraphs: ["Точный депозит находится в карточке и на странице выбранной машины. Суммы различаются, поэтому ориентироваться нужно на конкретный транспорт, а не на среднее значение по категории."] },
        { title: "Депозит, аренда и доставка", paragraphs: ["Это три разные части условий."], items: ["Аренда рассчитывается по сезону и количеству дней.", "Депозит показывается отдельно для конкретной машины.", "Доставка в аэропорт стоит 0 ฿, по городу — 500 ฿."] },
        { title: "Депозит и франшиза", paragraphs: ["Депозит и страховая франшиза — не одно и то же. Франшиза относится к ответственности при страховом случае, а депозит указан отдельным полем выбранной машины."] },
        { title: "Что проверить до оплаты", paragraphs: ["До подтверждения бронирования сверьте модель, даты, стоимость аренды, депозит, франшизу, доставку и условия возврата. Если условия конкретной машины отличаются, менеджер должен сообщить об этом до бронирования."] },
      ],
      faq: [
        { question: "Депозит входит в стоимость аренды?", answer: "Нет. Он показывается и учитывается отдельно." },
        { question: "У всех машин одинаковый депозит?", answer: "Нет. Точная сумма указана в карточке конкретной машины." },
        { question: "Депозит равен франшизе?", answer: "Не обязательно. Это разные условия, и обе суммы показываются отдельно." },
      ],
    },
    en: {
      slug: "deposit", published: true, updatedAt,
      title: "Vehicle rental deposits in Phuket",
      description: "How the deposit differs from rental price and insurance excess, and where to find the amount for each Sunny Rentals vehicle.",
      eyebrow: "Separate from rental price",
      intro: "Every vehicle's deposit is shown in the catalogue as a separate amount. It is not merged with the rental rate or delivery price.",
      sections: [
        { title: "Where to find the amount", paragraphs: ["The exact deposit appears on the selected vehicle's card and page. Amounts vary, so use the specific vehicle rather than an average for its category."] },
        { title: "Deposit, rental and delivery", paragraphs: ["These are three separate parts of the terms."], items: ["Rental is calculated by season and number of days.", "The deposit is shown separately for the specific vehicle.", "Airport delivery is 0 THB; city delivery is 500 THB."] },
        { title: "Deposit and insurance excess", paragraphs: ["The deposit and insurance excess are not the same. The excess concerns liability in an insured event, while the deposit is a separate field for the selected vehicle."] },
        { title: "What to check before payment", paragraphs: ["Before confirmation, check the model, dates, rental price, deposit, excess, delivery and return terms. A manager must disclose any vehicle-specific difference before booking."] },
      ],
      faq: [
        { question: "Is the deposit included in the rental price?", answer: "No. It is shown and accounted for separately." },
        { question: "Do all vehicles have the same deposit?", answer: "No. The exact amount is shown on the specific vehicle's card." },
        { question: "Is the deposit equal to the excess?", answer: "Not necessarily. They are separate terms and both amounts are displayed independently." },
      ],
    },
  },
  {
    ru: {
      slug: "delivery", published: true, updatedAt,
      title: "Доставка и возврат автомобиля на Пхукете",
      description: "Стоимость доставки Sunny Rentals: аэропорт Пхукета бесплатно, город, отель или вилла — 500 бат. Порядок получения и возврата.",
      eyebrow: "Понятная стоимость",
      intro: "Доставка в аэропорт Пхукета бесплатна. Доставка по городу, к отелю или вилле стоит 500 ฿.",
      sections: [
        { title: "Аэропорт Пхукета", paragraphs: ["Стоимость доставки в аэропорт — 0 ฿. Укажите аэропорт как место получения или возврата при заполнении формы. Время и точку встречи менеджер согласует после проверки дат."] },
        { title: "Город, отель или вилла", paragraphs: ["Стоимость доставки по городу, к отелю или вилле — 500 ฿. Перед подтверждением сообщите точное название и адрес места передачи."] },
        { title: "Как проходит передача", paragraphs: ["Менеджер подтверждает доступность машины и время встречи. При получении осмотрите транспорт, зафиксируйте состояние и проверьте уровень топлива."], items: ["Автомобили передаются чистыми.", "Транспорт передаётся с полным баком.", "В каталоге используются реальные фотографии.", "Место возврата согласуется заранее."] },
        { title: "Изменение места", paragraphs: ["Если место получения или возврата меняется, сообщите менеджеру заранее. Новые время и точка должны быть подтверждены до передачи транспорта."] },
      ],
      faq: [
        { question: "Сколько стоит доставка в аэропорт?", answer: "0 ฿ — доставка в аэропорт Пхукета бесплатна." },
        { question: "Сколько стоит доставка к отелю?", answer: "500 ฿, как и доставка по городу или к вилле." },
        { question: "Можно вернуть машину в другом месте?", answer: "Новое место нужно заранее согласовать с менеджером." },
      ],
    },
    en: {
      slug: "delivery", published: true, updatedAt,
      title: "Vehicle delivery and return in Phuket",
      description: "Sunny Rentals delivery: Phuket Airport is free; city, hotel or villa delivery is 500 THB. Handover and return process.",
      eyebrow: "Clear delivery pricing",
      intro: "Phuket Airport delivery is free. City, hotel or villa delivery costs 500 THB.",
      sections: [
        { title: "Phuket Airport", paragraphs: ["Airport delivery costs 0 THB. Select the airport as your pick-up or return location in the form. A manager agrees the meeting time and point after checking your dates."] },
        { title: "City, hotel or villa", paragraphs: ["City, hotel or villa delivery costs 500 THB. Provide the exact property name and address before confirmation."] },
        { title: "How handover works", paragraphs: ["A manager confirms availability and meeting time. Inspect and record the vehicle condition and check the fuel level at handover."], items: ["Cars are supplied clean.", "Vehicles are supplied with a full tank.", "The catalogue uses real photos.", "Agree the return location in advance."] },
        { title: "Changing location", paragraphs: ["Tell the manager in advance if the pick-up or return location changes. The new time and point must be confirmed before handover."] },
      ],
      faq: [
        { question: "How much is airport delivery?", answer: "0 THB — Phuket Airport delivery is free." },
        { question: "How much is hotel delivery?", answer: "500 THB, the same as city or villa delivery." },
        { question: "Can I return the car somewhere else?", answer: "Agree the new return location with the manager in advance." },
      ],
    },
  },
  {
    ru: {
      slug: "faq", published: true, updatedAt,
      title: "Вопросы об аренде авто и байков на Пхукете",
      description: "Ответы Sunny Rentals о бронировании, ценах, доставке, депозите, страховке, документах, автомобилях и байках.",
      eyebrow: "Sunny Rentals · FAQ",
      intro: "Короткие ответы на основные вопросы до выбора транспорта и отправки заявки.",
      sections: [
        { title: "Выбор и бронирование", paragraphs: ["На сайте можно сравнить конкретные машины и байки, выбрать даты и передать выбранную модель в Telegram. Менеджер проверит доступность и подтвердит детали."] },
        { title: "Что уже известно заранее", paragraphs: ["В карточках опубликованы реальные фотографии, сезонные тарифы и депозит."], items: ["Аэропорт — доставка 0 ฿.", "Город, отель или вилла — 500 ฿.", "Детское кресло для автомобиля — бесплатно.", "Автомобили передаются чистыми и с полным баком."] },
        { title: "Автомобили и байки", paragraphs: ["На автомобили распространяется страховка класса 1 при наличии второй стороны ДТП. Байки передаются без страховки. Франшиза автомобиля зависит от его класса и модели."] },
      ],
      faq: [
        { question: "Как отправить заявку?", answer: "Выберите машину или категорию, укажите даты и продолжите в Telegram. Менеджер подтвердит доступность." },
        { question: "Как рассчитывается цена?", answer: "По сезону и сроку аренды: 1–6, 7–14, 15–29 или 30+ дней." },
        { question: "Депозит входит в аренду?", answer: "Нет, депозит показывается отдельно для каждой машины." },
        { question: "Доставка в аэропорт бесплатна?", answer: "Да, аэропорт — 0 ฿. Город, отель или вилла — 500 ฿." },
        { question: "Есть ли бесплатное детское кресло?", answer: "Да, для автомобилей кресло предоставляется бесплатно по запросу." },
        { question: "Какая страховка у автомобиля?", answer: "Класс 1 при ДТП с установленной второй стороной. Парковочные повреждения без второй стороны не входят." },
        { question: "Есть ли страховка на байки?", answer: "Нет, байки передаются без страховки." },
        { question: "Фотографии настоящие?", answer: "Да, в каталоге опубликованы реальные фотографии конкретного транспорта." },
      ],
    },
    en: {
      slug: "faq", published: true, updatedAt,
      title: "Phuket car and scooter rental FAQ",
      description: "Sunny Rentals answers about booking, rates, delivery, deposits, insurance, documents, cars and scooters in Phuket.",
      eyebrow: "Sunny Rentals · FAQ",
      intro: "Straight answers to the main questions before you select a vehicle and send a request.",
      sections: [
        { title: "Choosing and booking", paragraphs: ["Compare specific cars and scooters, select dates and pass the chosen model into Telegram. A manager checks availability and confirms the details."] },
        { title: "What is clear upfront", paragraphs: ["Cards show real photos, seasonal rates and the deposit."], items: ["Airport delivery: 0 THB.", "City, hotel or villa: 500 THB.", "A child seat for a car is free.", "Cars are supplied clean and with a full tank."] },
        { title: "Cars and scooters", paragraphs: ["Cars have Class 1 insurance when there is an identified second party to the accident. Scooters are supplied without insurance. A car's excess depends on its class and model."] },
      ],
      faq: [
        { question: "How do I send a request?", answer: "Choose a vehicle or category, select dates and continue in Telegram. A manager confirms availability." },
        { question: "How is the price calculated?", answer: "By season and rental term: 1–6, 7–14, 15–29 or 30+ days." },
        { question: "Is the deposit included?", answer: "No. Each vehicle's deposit is shown separately." },
        { question: "Is airport delivery free?", answer: "Yes, airport delivery is 0 THB. City, hotel or villa delivery is 500 THB." },
        { question: "Is a child seat free?", answer: "Yes, a child seat for a car is available free on request." },
        { question: "What insurance do cars have?", answer: "Class 1 for accidents with an identified second party. Parking damage without a second party is excluded." },
        { question: "Are scooters insured?", answer: "No. Scooters are supplied without insurance." },
        { question: "Are the photos real?", answer: "Yes. The catalogue shows real photos of the specific vehicles." },
      ],
    },
  },
];

export const trustPageSlugs = trustPages.map((page) => page.ru.slug);

export function getTrustPage(slug: string, locale: Locale) {
  return trustPages.find((page) => page[locale].slug === slug)?.[locale];
}
