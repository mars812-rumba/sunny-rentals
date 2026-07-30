import { absoluteUrl } from "@/lib/site";

export const locales = ["ru", "en"] as const;
export type Locale = (typeof locales)[number];

export const messages = {
  ru: {
    htmlLang: "ru",
    ogLocale: "ru_RU",
    numberLocale: "ru-RU",
    nav: {
      homeLabel: "Sunny Rentals — главная",
      aria: "Основная навигация",
      fleet: "Автопарк",
      booking: "Подобрать",
      footerAria: "Навигация в подвале",
    },
    hero: {
      loading: "Загружаем Sunny Rentals",
      rating: "4,8 средний рейтинг партнёров",
      title: "Аренда авто и байков на Пхукете",
      subtitle: "Подберите транспорт и зафиксируйте бронирование через Telegram.",
      category: "Категория",
      from: "от",
      perDay: "за сутки",
      categoriesAria: "Категории транспорта",
      showCategory: "Показать категорию",
      swipe: "Свайпните категории",
      imageAlt: "аренда на Пхукете",
      slides: [
        ["Компакт", "Экономия и лёгкая парковка"],
        ["Седан", "Комфорт на маршрутах по острову"],
        ["7+ мест", "Для семьи и большой компании"],
        ["SUV", "Высокая посадка и больше пространства"],
        ["Байк", "Быстро по Пхукету без пробок"],
      ],
    },
    booking: {
      eyebrow: "Онлайн-подбор",
      title: "Транспорт на ваши даты",
      intro: "Заполните параметры здесь, затем подтвердите профиль в Telegram.",
      category: "Категория",
      pickupDate: "Получение",
      returnDate: "Возврат",
      pickup: "Выдача",
      returnLocation: "Возврат авто",
      continue: "Продолжить в Telegram",
      dateRequired: "Укажите даты начала и окончания аренды.",
      dateOrder: "Дата возврата должна быть позже даты получения.",
      note: "Бронь попадёт в CRM только после вашего подтверждения в WebApp.",
      categories: ["Компакт", "Седан", "SUV", "7+ мест", "Байк"],
      locations: ["Аэропорт", "Отель", "Вилла"],
    },
    fleet: {
      eyebrow: "Автопарк на острове",
      title: "Выберите свой маршрут",
      intro:
        "Реальные автомобили Sunny Rentals. Цена «от» указана для аренды от 30 дней в низкий сезон.",
      variants: "варианта",
      all: "Смотреть весь автопарк",
      details: "Подробнее",
      book: "Забронировать",
      from: "от",
      perDay: "/ день",
      specsAria: "Основные характеристики",
      cardDetails: "Подробнее",
      imageAlt: "в аренду на Пхукете",
    },
    catalog: {
      eyebrow: "Sunny Rentals · Автопарк",
      title: "Автопарк на Пхукете",
      intro:
        "От компактной Toyota Yaris до семиместных автомобилей и максискутеров. Выберите модель, а даты и доставку подтвердите в Telegram WebApp.",
    },
    trust: {
      eyebrow: "Без сюрпризов",
      title: "Всё важное до поездки",
      intro:
        "Сайт помогает выбрать модель, Telegram подтверждает клиента, а CRM сохраняет весь путь бронирования для менеджера.",
      benefits: [
        ["Проверенный транспорт", "Показываем реальные фотографии и состояние автомобиля до подтверждения."],
        ["Понятная стоимость", "Срок аренды, депозит и доставка фиксируются до создания брони."],
        ["Доставка по Пхукету", "Передадим транспорт в аэропорту, у отеля или виллы."],
        ["Связь в Telegram", "Профиль подтверждается через Telegram, а бронь сразу попадает в CRM."],
      ],
      faqEyebrow: "Помощь перед бронью",
      faqTitle: "Частые вопросы",
      faqIntro: "Если ответа нет, напишите нам — подскажем по машине и маршруту.",
      whatsapp: "Написать в WhatsApp",
      questions: [
        ["Как забронировать автомобиль?", "Выберите категорию, даты и место выдачи. Затем откройте Telegram, подтвердите профиль и отправьте бронь из WebApp."],
        ["Можно получить машину в аэропорту?", "Да. При подборе выберите аэропорт как место получения или возврата. Итоговые условия доставки будут показаны до подтверждения."],
        ["Цена на странице окончательная?", "В карточках указана цена «от» для длительной аренды в низкий сезон. Точная ставка зависит от дат и срока и рассчитывается в WebApp."],
        ["Какие документы нужны?", "Обычно нужны паспорт и действующее водительское удостоверение соответствующей категории. Менеджер подтвердит требования к выбранному транспорту."],
        ["Когда бронь появляется в CRM?", "После авторизации Telegram фиксирует интерес к модели. Полноценная бронь создаётся после подтверждения дат, доставки и автомобиля в WebApp."],
      ],
    },
    contact: {
      title: "Бронь и связь",
      subtitle: "Выберите удобный способ",
      telegram: "Забронировать через Telegram",
      whatsapp: "Написать в WhatsApp",
      close: "Закрыть меню связи",
      open: "Открыть меню бронирования",
    },
    vehicle: {
      rental: "Аренда на Пхукете",
      home: "Главная",
      fleet: "Автопарк",
      imageAlt: "в аренду на Пхукете",
      longTermPrice: "Цена при аренде от 30 дней",
      from: "от",
      perDay: "/ день",
      deposit: "Депозит",
      book: "Забронировать через Telegram",
      handoff:
        "После авторизации откроется WebApp с выбранной моделью. Там вы укажете даты и место доставки.",
      detailsEyebrow: "Подробности",
      detailsTitle: "Подходит для Пхукета",
      delivery:
        "Автомобиль можно получить в аэропорту, у отеля или виллы. Точную стоимость на ваши даты и доступность конкретного цвета покажет WebApp.",
      transmission: "Коробка",
      engine: "Двигатель",
      fuel: "Топливо",
      capacity: "Вместимость",
      alternatives: "Альтернативы",
      similar: "Похожие варианты",
      allFleet: "Весь автопарк",
    },
  },
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    numberLocale: "en-US",
    nav: {
      homeLabel: "Sunny Rentals — home",
      aria: "Main navigation",
      fleet: "Fleet",
      booking: "Find a vehicle",
      footerAria: "Footer navigation",
    },
    hero: {
      loading: "Loading Sunny Rentals",
      rating: "4.8 average partner rating",
      title: "Car and scooter rental in Phuket",
      subtitle: "Choose your vehicle and confirm the booking securely in Telegram.",
      category: "Category",
      from: "from",
      perDay: "per day",
      categoriesAria: "Vehicle categories",
      showCategory: "Show category",
      swipe: "Swipe through categories",
      imageAlt: "rental in Phuket",
      slides: [
        ["Compact", "Easy parking and lower fuel costs"],
        ["Sedan", "Comfort for routes across the island"],
        ["7+ seats", "For families and larger groups"],
        ["SUV", "Higher seating and more room"],
        ["Scooter", "Move around Phuket without traffic"],
      ],
    },
    booking: {
      eyebrow: "Online search",
      title: "A vehicle for your dates",
      intro: "Set your preferences here, then confirm your profile in Telegram.",
      category: "Category",
      pickupDate: "Pick-up date",
      returnDate: "Return date",
      pickup: "Pick-up",
      returnLocation: "Return location",
      continue: "Continue in Telegram",
      dateRequired: "Select both pick-up and return dates.",
      dateOrder: "The return date must be after the pick-up date.",
      note: "The booking enters our CRM after you confirm it in the WebApp.",
      categories: ["Compact", "Sedan", "SUV", "7+ seats", "Scooter"],
      locations: ["Airport", "Hotel", "Villa"],
    },
    fleet: {
      eyebrow: "Island fleet",
      title: "Choose your way around Phuket",
      intro:
        "Real Sunny Rentals vehicles. “From” prices apply to rentals of 30 days or more during low season.",
      variants: "options",
      all: "View the full fleet",
      details: "Details",
      book: "Book now",
      from: "from",
      perDay: "/ day",
      specsAria: "Key specifications",
      cardDetails: "Details",
      imageAlt: "for rent in Phuket",
    },
    catalog: {
      eyebrow: "Sunny Rentals · Fleet",
      title: "Rental fleet in Phuket",
      intro:
        "From a compact Toyota Yaris to seven-seat cars and maxi scooters. Choose a model, then confirm dates and delivery in our Telegram WebApp.",
    },
    trust: {
      eyebrow: "No surprises",
      title: "Everything clear before your trip",
      intro:
        "The website helps you choose a model, Telegram verifies your profile, and our CRM keeps the complete booking history for the manager.",
      benefits: [
        ["Verified vehicles", "See real photos and the vehicle condition before you confirm."],
        ["Clear pricing", "Rental period, deposit and delivery are confirmed before booking."],
        ["Delivery across Phuket", "Collect your vehicle at the airport, hotel or villa."],
        ["Telegram support", "Verify your profile in Telegram and send the booking straight to our CRM."],
      ],
      faqEyebrow: "Before you book",
      faqTitle: "Frequently asked questions",
      faqIntro: "Need anything else? Message us and we will help with the vehicle and route.",
      whatsapp: "Message us on WhatsApp",
      questions: [
        ["How do I book a car?", "Choose a category, dates and pick-up point. Then open Telegram, verify your profile and confirm the booking in the WebApp."],
        ["Can I collect the car at the airport?", "Yes. Select the airport as your pick-up or return point. Final delivery terms are shown before confirmation."],
        ["Is the listed price final?", "Cards show a “from” price for long-term rentals during low season. Your exact rate depends on dates and rental length and is calculated in the WebApp."],
        ["Which documents do I need?", "You will normally need a passport and a valid driving licence for the relevant vehicle class. A manager will confirm the exact requirements."],
        ["When does the booking appear in the CRM?", "Telegram records your interest after verification. The full booking is created after you confirm the dates, delivery and vehicle in the WebApp."],
      ],
    },
    contact: {
      title: "Bookings and support",
      subtitle: "Choose how to contact us",
      telegram: "Book through Telegram",
      whatsapp: "Message us on WhatsApp",
      close: "Close contact menu",
      open: "Open booking menu",
    },
    vehicle: {
      rental: "Phuket vehicle rental",
      home: "Home",
      fleet: "Fleet",
      imageAlt: "for rent in Phuket",
      longTermPrice: "Rate for rentals of 30 days or more",
      from: "from",
      perDay: "/ day",
      deposit: "Deposit",
      book: "Book through Telegram",
      handoff:
        "After verification, the WebApp opens with this model selected. Add your dates and delivery location there.",
      detailsEyebrow: "Details",
      detailsTitle: "Made for Phuket",
      delivery:
        "Collect the vehicle at the airport, your hotel or villa. The WebApp shows the exact price for your dates and available colours.",
      transmission: "Transmission",
      engine: "Engine",
      fuel: "Fuel",
      capacity: "Capacity",
      alternatives: "Alternatives",
      similar: "Similar vehicles",
      allFleet: "View all vehicles",
    },
  },
} as const;

export function getMessages(locale: Locale) {
  return messages[locale];
}

export function localePath(locale: Locale, path = "/"): string {
  if (locale === "ru") return path;
  if (path === "/") return "/en";
  return `/en${path}`;
}

export function languageAlternates(locale: Locale, path = "/") {
  return {
    canonical: localePath(locale, path),
    languages: {
      ru: localePath("ru", path),
      en: localePath("en", path),
      "x-default": localePath("ru", path),
    },
  };
}

export function absoluteLanguageUrls(path = "/") {
  return {
    ru: absoluteUrl(localePath("ru", path)),
    en: absoluteUrl(localePath("en", path)),
  };
}
