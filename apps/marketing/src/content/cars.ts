import inventoryCatalog from "../../../../backend/data/web_cars.json";

import type {
  InventoryCar,
  MarketingCar,
  SeasonalPricing,
  VehicleCategory,
  VerifiedCarTerms,
} from "@/content/car-contract";

export type {
  MarketingCar,
  SeasonalPricing,
  SeasonKey,
  SeasonRates,
  VehicleCategory,
} from "@/content/car-contract";

interface MarketingCarDefinition {
  slug: string;
  inventoryId: string;
  category: VehicleCategory;
  brand: string;
  model: string;
  year: number;
  color: string;
  colorEn: string;
  power: string;
  powerEn: string;
  rating: number;
  image: string;
  images?: string[];
  fromPrice: number;
  deposit: number;
  seats: string;
  transmission: string;
  engine: string;
  fuel: string;
  summary: string;
  bestFor: string;
}

export const vehicleCategories: Array<{
  id: VehicleCategory;
  name: string;
  shortName: string;
  description: string;
}> = [
  {
    id: "compact",
    name: "Компактные автомобили",
    shortName: "Компакт",
    description: "Манёвренные машины для пляжей, кафе и ежедневных поездок.",
  },
  {
    id: "sedan",
    name: "Седаны",
    shortName: "Седаны",
    description: "Комфорт для дальних маршрутов и поездок по всему острову.",
  },
  {
    id: "suv",
    name: "Кроссоверы и SUV",
    shortName: "SUV",
    description: "Больше пространства, высокая посадка и уверенность в дороге.",
  },
  {
    id: "7s",
    name: "Автомобили на 7+ мест",
    shortName: "7+ мест",
    description: "Просторные варианты для семьи, компании и большого багажа.",
  },
  {
    id: "bikes",
    name: "Байки и максискутеры",
    shortName: "Байки",
    description: "Свобода передвижения по Пхукету без пробок и поиска парковки.",
  },
];

const marketingCarDefinitions: MarketingCarDefinition[] = [
  {
    slug: "toyota-yaris",
    inventoryId: "toyota_yaris_2024_gray",
    category: "compact",
    brand: "Toyota",
    model: "Yaris",
    year: 2024,
    color: "Серый",
    colorEn: "Gray",
    power: "91 л.с.",
    powerEn: "91 hp",
    rating: 4.5,
    image: "/images_web/compact/ar_yaris_premium_gray_2024/1.jpg",
    images: [
      "/images_web/compact/ar_yaris_premium_gray_2024/1.jpg",
      "/images_web/compact/ar_yaris_premium_gray_2024/IMG-20241129-WA0246.jpg",
      "/images_web/compact/ar_yaris_premium_gray_2024/IMG-20241129-WA0248.jpg",
      "/images_web/compact/ar_yaris_premium_gray_2024/IMG-20241129-WA0250.jpg",
    ],
    fromPrice: 425,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.2 л",
    fuel: "Бензин",
    summary: "Экономичный городской автомобиль с понятными габаритами и лёгкой парковкой.",
    bestFor: "Пар, небольших семей и ежедневных поездок по острову.",
  },
  {
    slug: "suzuki-swift",
    inventoryId: "namo_suzuki_swift_2020",
    category: "compact",
    brand: "Suzuki",
    model: "Swift",
    year: 2020,
    color: "Белый",
    colorEn: "White",
    power: "90 л.с.",
    powerEn: "90 hp",
    rating: 4.5,
    image: "/images_web/compact/namo_suzuki_swift_2020/1.jpg",
    fromPrice: 425,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.3 л",
    fuel: "Бензин",
    summary: "Компактный хэтчбек с живой управляемостью и небольшим расходом топлива.",
    bestFor: "Городских маршрутов, пляжей и узких улиц Пхукета.",
  },
  {
    slug: "honda-jazz",
    inventoryId: "Nm_jazz_white_2019",
    category: "compact",
    brand: "Honda",
    model: "Jazz",
    year: 2019,
    color: "Белый",
    colorEn: "White",
    power: "120 л.с.",
    powerEn: "120 hp",
    rating: 4.5,
    image: "/images_web/compact/Nm_jazz_white_2019/7.jpg",
    images: [
      "/images_web/compact/Nm_jazz_white_2019/7.jpg",
      "/images_web/compact/Nm_jazz_white_2019/1.jpg",
      "/images_web/compact/Nm_jazz_white_2019/2.jpg",
      "/images_web/compact/Nm_jazz_white_2019/3.jpg",
    ],
    fromPrice: 475,
    deposit: 5000,
    seats: "5 мест",
    transmission: "CVT",
    engine: "1.5 л",
    fuel: "Бензин",
    summary: "Компактный снаружи и удивительно просторный внутри хэтчбек.",
    bestFor: "Путешествий вдвоём, семей с ребёнком и багажа.",
  },
  {
    slug: "toyota-vios",
    inventoryId: "namo_vios_white_2022",
    category: "compact",
    brand: "Toyota",
    model: "Vios",
    year: 2022,
    color: "Белый",
    colorEn: "White",
    power: "112 л.с.",
    powerEn: "112 hp",
    rating: 4.5,
    image: "/images_web/compact/namo_vios_white_2022/1.jpg",
    images: [
      "/images_web/compact/namo_vios_white_2022/1.jpg",
      "/images_web/compact/namo_vios_white_2022/2.jpg",
      "/images_web/compact/namo_vios_white_2022/3.jpg",
      "/images_web/compact/namo_vios_white_2022/4.jpg",
    ],
    fromPrice: 425,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.5 л",
    fuel: "Бензин",
    summary: "Практичный автомобиль с вместительным багажником и спокойным характером.",
    bestFor: "Повседневной аренды и поездок между районами острова.",
  },
  {
    slug: "toyota-ativ",
    inventoryId: "toyota_ativ_2024_gray",
    category: "sedan",
    brand: "Toyota",
    model: "Ativ",
    year: 2024,
    color: "Серый",
    colorEn: "Gray",
    power: "86 л.с.",
    powerEn: "86 hp",
    rating: 4.9,
    image: "/images_web/sedan/ar_ativ_dark_gray_2024/1.jpg",
    images: [
      "/images_web/sedan/ar_ativ_dark_gray_2024/1.jpg",
      "/images_web/sedan/ar_ativ_dark_gray_2024/IMG-20250207-WA0041.jpg",
      "/images_web/sedan/ar_ativ_dark_gray_2024/IMG-20250207-WA0043.jpg",
      "/images_web/sedan/ar_ativ_dark_gray_2024/IMG-20250319-WA0037.jpg",
    ],
    fromPrice: 453,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.2 л",
    fuel: "Бензин",
    summary: "Современный седан с мягкой подвеской, камерой и просторным салоном.",
    bestFor: "Комфортных поездок по Пхукету и трансферов с багажом.",
  },
  {
    slug: "honda-civic",
    inventoryId: "honda_civic_2024_black",
    category: "sedan",
    brand: "Honda",
    model: "Civic RS",
    year: 2024,
    color: "Чёрный",
    colorEn: "Black",
    power: "250 л.с.",
    powerEn: "250 hp",
    rating: 4.5,
    image: "/images_web/sedan/ar_civic_rs_black_2024/1.jpg",
    images: [
      "/images_web/sedan/ar_civic_rs_black_2024/1.jpg",
      "/images_web/sedan/ar_civic_rs_black_2024/photo_2_2025-10-12_02-47-24.jpg",
      "/images_web/sedan/ar_civic_rs_black_2024/photo_3_2025-10-12_02-47-24.jpg",
      "/images_web/sedan/ar_civic_rs_black_2024/photo_4_2025-10-12_02-47-24.jpg",
    ],
    fromPrice: 851,
    deposit: 5000,
    seats: "5 мест",
    transmission: "CVT",
    engine: "2.0 л",
    fuel: "Бензин",
    summary: "Динамичный седан с выразительным дизайном и уверенным запасом мощности.",
    bestFor: "Тех, кто ценит комфорт, стиль и удовольствие от дороги.",
  },
  {
    slug: "honda-city",
    inventoryId: "Ar_city_rs_black_2025",
    category: "sedan",
    brand: "Honda",
    model: "City RS",
    year: 2025,
    color: "Чёрный",
    colorEn: "Black",
    power: "159",
    powerEn: "159",
    rating: 4.5,
    image: "/images_web/sedan/Ar_city_rs_black_2025/2.jpg",
    images: [
      "/images_web/sedan/Ar_city_rs_black_2025/2.jpg",
      "/images_web/sedan/Ar_city_rs_black_2025/1.jpg",
      "/images_web/sedan/Ar_city_rs_black_2025/3.jpg",
      "/images_web/sedan/Ar_city_rs_black_2025/4.jpg",
    ],
    fromPrice: 425,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.6 л",
    fuel: "Бензин",
    summary: "Свежий городской седан с удобным салоном и экономичным двигателем.",
    bestFor: "Длительной аренды и активных поездок каждый день.",
  },
  {
    slug: "toyota-camry",
    inventoryId: "toyota_camry_2020_black",
    category: "sedan",
    brand: "Toyota",
    model: "Camry",
    year: 2020,
    color: "Чёрный",
    colorEn: "Black",
    power: "178 л.с.",
    powerEn: "178 hp",
    rating: 4.9,
    image: "/images_web/sedan/ar_camry_black_2020/1.jpg",
    images: [
      "/images_web/sedan/ar_camry_black_2020/1.jpg",
      "/images_web/sedan/ar_camry_black_2020/12.jpg",
      "/images_web/sedan/ar_camry_black_2020/13.jpg",
      "/images_web/sedan/ar_camry_black_2020/14.jpg",
    ],
    fromPrice: 851,
    deposit: 5000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "2.5 л",
    fuel: "Бензин / гибрид",
    summary: "Большой комфортный седан для спокойных поездок на любые расстояния.",
    bestFor: "Деловых поездок, семей и повышенных требований к комфорту.",
  },
  {
    slug: "toyota-yaris-cross",
    inventoryId: "namo_yaris_cross_2025",
    category: "suv",
    brand: "Toyota",
    model: "Yaris Cross",
    year: 2025,
    color: "Серый",
    colorEn: "Gray",
    power: "125 л.с.",
    powerEn: "125 hp",
    rating: 4.5,
    image: "/images_web/suv/namo_yaris_cross_2025/2.jpg",
    images: [
      "/images_web/suv/namo_yaris_cross_2025/2.jpg",
      "/images_web/suv/namo_yaris_cross_2025/1.jpg",
      "/images_web/suv/namo_yaris_cross_2025/3.jpg",
      "/images_web/suv/namo_yaris_cross_2025/4.jpg",
    ],
    fromPrice: 865,
    deposit: 10000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "1.5 л",
    fuel: "Бензин",
    summary: "Компактный кроссовер с высокой посадкой и современным оснащением.",
    bestFor: "Семей, активных маршрутов и поездок с пляжным снаряжением.",
  },
  {
    slug: "toyota-corolla-cross",
    inventoryId: "ar_corolla_cross_blue_2024",
    category: "suv",
    brand: "Toyota",
    model: "Corolla Cross",
    year: 2024,
    color: "Синий",
    colorEn: "Blue",
    power: "140 л.с.",
    powerEn: "140 hp",
    rating: 4.5,
    image: "/images_web/suv/ar_corolla_cross_blue_2024/1.jpg",
    images: [
      "/images_web/suv/ar_corolla_cross_blue_2024/1.jpg",
      "/images_web/suv/ar_corolla_cross_blue_2024/2.jpg",
      "/images_web/suv/ar_corolla_cross_blue_2024/3.jpg",
      "/images_web/suv/ar_corolla_cross_blue_2024/4.jpg",
    ],
    fromPrice: 865,
    deposit: 10000,
    seats: "5 мест",
    transmission: "Вариатор",
    engine: "1.8 л",
    fuel: "Гибрид",
    summary: "Комфортный гибридный кроссовер с просторным салоном и экономичным ходом.",
    bestFor: "Дальних маршрутов по острову и семейного отдыха.",
  },
  {
    slug: "mazda-cx-30",
    inventoryId: "PW_mazda_cx30_gray_2023",
    category: "suv",
    brand: "Mazda",
    model: "CX-30",
    year: 2023,
    color: "Серый",
    colorEn: "Gray",
    power: "153 л.с.",
    powerEn: "153 hp",
    rating: 4.5,
    image: "/images_web/suv/PW_mazda_cx30_gray_2023/4.jpg",
    images: [
      "/images_web/suv/PW_mazda_cx30_gray_2023/4.jpg",
      "/images_web/suv/PW_mazda_cx30_gray_2023/1.jpg",
      "/images_web/suv/PW_mazda_cx30_gray_2023/2.jpg",
      "/images_web/suv/PW_mazda_cx30_gray_2023/3.jpg",
    ],
    fromPrice: 865,
    deposit: 10000,
    seats: "5 мест",
    transmission: "Автомат",
    engine: "2.0 л",
    fuel: "Бензин",
    summary: "Стильный кроссовер с точной управляемостью и качественным интерьером.",
    bestFor: "Пар и небольших семей, которым важны дизайн и комфорт.",
  },
  {
    slug: "honda-hr-v",
    inventoryId: "ar_hrvrs_black_2024",
    category: "suv",
    brand: "Honda",
    model: "HR-V RS",
    year: 2024,
    color: "Чёрный",
    colorEn: "Black",
    power: "121 л.с.",
    powerEn: "121 hp",
    rating: 4.5,
    image: "/images_web/suv/ar_hrvrs_black_2024/1.jpg",
    fromPrice: 945,
    deposit: 10000,
    seats: "5 мест",
    transmission: "CVT",
    engine: "1.5 л",
    fuel: "Гибрид",
    summary: "Современный гибридный SUV с высокой посадкой и гибким салоном.",
    bestFor: "Активного отдыха, багажа и комфортных поездок на весь день.",
  },
  {
    slug: "toyota-veloz",
    inventoryId: "toyota_veloz_2024_gray",
    category: "7s",
    brand: "Toyota",
    model: "Veloz",
    year: 2024,
    color: "Серый",
    colorEn: "Gray",
    power: "105 л.с.",
    powerEn: "105 hp",
    rating: 4.7,
    image: "/images_web/7s/namo_veloz_gray_2024/1.jpg",
    images: [
      "/images_web/7s/namo_veloz_gray_2024/1.jpg",
      "/images_web/7s/namo_veloz_gray_2024/2.jpg",
      "/images_web/7s/namo_veloz_gray_2024/3.jpg",
      "/images_web/7s/namo_veloz_gray_2024/4.jpg",
    ],
    fromPrice: 851,
    deposit: 10000,
    seats: "7 мест",
    transmission: "CVT",
    engine: "1.5 л",
    fuel: "Бензин",
    summary: "Семиместный автомобиль с тремя рядами сидений и удобной посадкой.",
    bestFor: "Семей, компаний друзей и поездок с большим количеством вещей.",
  },
  {
    slug: "mitsubishi-xpander",
    inventoryId: "mitsubishi_xpander_2023_white",
    category: "7s",
    brand: "Mitsubishi",
    model: "Xpander",
    year: 2023,
    color: "Белый",
    colorEn: "White",
    power: "105 л.с.",
    powerEn: "105 hp",
    rating: 4.6,
    image: "/images_web/7s/namo_xpander_white_2023/1.jpg",
    images: [
      "/images_web/7s/namo_xpander_white_2023/1.jpg",
      "/images_web/7s/namo_xpander_white_2023/2.jpg",
      "/images_web/7s/namo_xpander_white_2023/3.jpg",
      "/images_web/7s/namo_xpander_white_2023/4.jpg",
    ],
    fromPrice: 665,
    deposit: 10000,
    seats: "7 мест",
    transmission: "Автомат",
    engine: "1.5 л",
    fuel: "Бензин",
    summary: "Практичный семиместный минивэн с просторным салоном и мягким ходом.",
    bestFor: "Больших семей и путешествий по Пхукету одной машиной.",
  },
  {
    slug: "h1-12-seats",
    inventoryId: "Namo_h1_blackvagon_2023",
    category: "7s",
    brand: "H1",
    model: "12 Seats",
    year: 2023,
    color: "Чёрный",
    colorEn: "Black",
    power: "175 л.с.",
    powerEn: "175 hp",
    rating: 4.5,
    image: "/images_web/7s/Namo_h1_blackvagon_2023/1.jpg",
    images: [
      "/images_web/7s/Namo_h1_blackvagon_2023/1.jpg",
      "/images_web/7s/Namo_h1_blackvagon_2023/2.jpg",
      "/images_web/7s/Namo_h1_blackvagon_2023/3.jpg",
      "/images_web/7s/Namo_h1_blackvagon_2023/4.jpg",
    ],
    fromPrice: 1690,
    deposit: 10000,
    seats: "12 мест",
    transmission: "Автомат",
    engine: "2.5 л",
    fuel: "Дизель",
    summary: "Вместительный пассажирский автомобиль для большой компании и багажа.",
    bestFor: "Групп, трансферов и совместных поездок без второй машины.",
  },
  {
    slug: "toyota-alphard",
    inventoryId: "namo_alphard_white_2024",
    category: "7s",
    brand: "Toyota",
    model: "Alphard",
    year: 2024,
    color: "Белый",
    colorEn: "White",
    power: "190 л.с.",
    powerEn: "190 hp",
    rating: 4.5,
    image: "/images_web/7s/namo_alphard_white_2024/1.jpg",
    images: [
      "/images_web/7s/namo_alphard_white_2024/1.jpg",
      "/images_web/7s/namo_alphard_white_2024/2.jpg",
      "/images_web/7s/namo_alphard_white_2024/3.jpg",
      "/images_web/7s/namo_alphard_white_2024/4.jpg",
    ],
    fromPrice: 5511,
    deposit: 30000,
    seats: "до 12 мест",
    transmission: "Автомат",
    engine: "2.5 л",
    fuel: "Гибрид",
    summary: "Премиальный минивэн с просторным салоном и высоким уровнем комфорта.",
    bestFor: "VIP-трансферов, больших семей и особых поездок.",
  },
  {
    slug: "honda-adv-350",
    inventoryId: "Fb_bike1_honda_adv350_black_2025",
    category: "bikes",
    brand: "Honda",
    model: "ADV 350",
    year: 2025,
    color: "Чёрный",
    colorEn: "Black",
    power: "40",
    powerEn: "40",
    rating: 4.5,
    image: "/images_web/bikes/Fb_bike1_honda_adv350_black_2025/1.jpg",
    fromPrice: 395,
    deposit: 7000,
    seats: "2 места",
    transmission: "Автомат",
    engine: "350 см³",
    fuel: "Бензин",
    summary: "Универсальный максискутер с комфортной посадкой и запасом мощности.",
    bestFor: "Дальних маршрутов, поездок вдвоём и активного исследования острова.",
  },
  {
    slug: "yamaha-tmax",
    inventoryId: "Den_t-max2024",
    category: "bikes",
    brand: "Yamaha",
    model: "TMAX",
    year: 2024,
    color: "Чёрный",
    colorEn: "Black",
    power: "—",
    powerEn: "—",
    rating: 4.5,
    image: "/images_web/bikes/Den_t-max2024/1.jpg",
    images: [
      "/images_web/bikes/Den_t-max2024/1.jpg",
      "/images_web/bikes/Den_t-max2024/2.jpg",
      "/images_web/bikes/Den_t-max2024/3.jpg",
    ],
    fromPrice: 969,
    deposit: 15000,
    seats: "2 места",
    transmission: "Автомат",
    engine: "Максискутер",
    fuel: "Бензин",
    summary: "Мощный премиальный максискутер для быстрых и комфортных маршрутов.",
    bestFor: "Опытных водителей и поездок на большие расстояния.",
  },
  {
    slug: "honda-forza-350",
    inventoryId: "Forza_350_2024_topbox",
    category: "bikes",
    brand: "Honda",
    model: "Forza 350",
    year: 2024,
    color: "Серый",
    colorEn: "Gray",
    power: "33 л.с.",
    powerEn: "33 hp",
    rating: 4.5,
    image: "/images_web/bikes/Forza_350_2024_topbox/1.jpg",
    images: [
      "/images_web/bikes/Forza_350_2024_topbox/1.jpg",
      "/images_web/bikes/Forza_350_2024_topbox/2.jpg",
      "/images_web/bikes/Forza_350_2024_topbox/3.jpg",
    ],
    fromPrice: 412,
    deposit: 10000,
    seats: "2 места",
    transmission: "Автомат",
    engine: "350 см³",
    fuel: "Бензин",
    summary: "Комфортный туристический максискутер с кофром для вещей.",
    bestFor: "Поездок вдвоём, пляжных маршрутов и путешествий на весь день.",
  },
  {
    slug: "yamaha-nmax-155",
    inventoryId: "Nmax_2024_blue_topbox",
    category: "bikes",
    brand: "Yamaha",
    model: "NMAX 155",
    year: 2024,
    color: "Синий",
    colorEn: "Blue",
    power: "15 л.с.",
    powerEn: "15 hp",
    rating: 4.5,
    image: "/images_web/bikes/Nmax_2024_blue_topbox/1.jpg",
    images: [
      "/images_web/bikes/Nmax_2024_blue_topbox/1.jpg",
      "/images_web/bikes/Nmax_2024_blue_topbox/2.jpg",
      "/images_web/bikes/Nmax_2024_blue_topbox/3.jpg",
      "/images_web/bikes/Nmax_2024_blue_topbox/4.jpg",
    ],
    fromPrice: 204,
    deposit: 5000,
    seats: "2 места",
    transmission: "CVT",
    engine: "155 см³",
    fuel: "Бензин",
    summary: "Лёгкий и экономичный скутер с удобной посадкой и кофром.",
    bestFor: "Ежедневных поездок, пляжей и движения по загруженным районам.",
  },
];

const inventoryCars = (inventoryCatalog as { cars: Record<string, InventoryCar> }).cars;
const marketingDefinitionsByInventoryId = new Map(
  marketingCarDefinitions.map((definition) => [definition.inventoryId, definition]),
);

const vehicleCategoryIds = new Set<VehicleCategory>([
  "compact",
  "sedan",
  "suv",
  "7s",
  "bikes",
]);

const colorNamesEnToRu: Record<string, string> = {
  black: "Чёрный",
  blackv: "Чёрный",
  blue: "Синий",
  gray: "Серый",
  grey: "Серый",
  green: "Зелёный",
  red: "Красный",
  silver: "Серебристый",
  white: "Белый",
  yellow: "Жёлтый",
  bege: "Бежевый",
  beige: "Бежевый",
  "dark gray": "Тёмно-серый",
};

const colorNamesRuToEn: Record<string, string> = {
  белый: "White",
  серый: "Gray",
  синий: "Blue",
  черный: "Black",
  чёрный: "Black",
};

const categoryUseCases: Record<VehicleCategory, { ru: string; en: string }> = {
  compact: {
    ru: "Подходит для ежедневных поездок и городских маршрутов по Пхукету.",
    en: "Suitable for everyday trips and urban routes around Phuket.",
  },
  sedan: {
    ru: "Подходит для комфортных поездок по острову и маршрутов с багажом.",
    en: "Suitable for comfortable island trips and routes with luggage.",
  },
  suv: {
    ru: "Подходит для длительных маршрутов и поездок с дополнительным багажом.",
    en: "Suitable for longer routes and trips with additional luggage.",
  },
  "7s": {
    ru: "Подходит для семьи или компании; точную вместимость подтвердит менеджер.",
    en: "Suitable for a family or group; a manager confirms the exact capacity.",
  },
  bikes: {
    ru: "Подходит для поездок по острову; требования к категории прав подтвердит менеджер.",
    en: "Suitable for island trips; a manager confirms the required licence category.",
  },
};

const publicImagePath = (path: string) =>
  path.startsWith("/") ? path : `/images_web/${path}`;

const PRODUCT_OWNER_TERMS_SOURCE = "product-owner-confirmation:2026-08-03";

type VerifiedBadge = NonNullable<VerifiedCarTerms["badges"]>[number];

function selectVerifiedBadges(inventoryId: string, category: VehicleCategory) {
  const appliesToCars = category !== "bikes";
  const pool: VerifiedBadge[] = [
    { labelRu: "Аэропорт 0 ฿", labelEn: "Airport 0 ฿", source: PRODUCT_OWNER_TERMS_SOURCE, color: "blue" },
    { labelRu: "Хит", labelEn: "Popular", source: PRODUCT_OWNER_TERMS_SOURCE, color: "orange" },
    { labelRu: "Полный бак", labelEn: "Full tank", source: PRODUCT_OWNER_TERMS_SOURCE, color: "green" },
    { labelRu: "Реальные фото", labelEn: "Real photos", source: PRODUCT_OWNER_TERMS_SOURCE, color: "white" },
    { labelRu: "Цена по сроку", labelEn: "Rate by rental term", source: PRODUCT_OWNER_TERMS_SOURCE, color: "blue" },
    ...(appliesToCars
      ? [
          { labelRu: "Страховка класс 1", labelEn: "Class 1 insurance", source: PRODUCT_OWNER_TERMS_SOURCE, color: "green" as const },
          { labelRu: "Детское кресло 0 ฿", labelEn: "Child seat 0 ฿", source: PRODUCT_OWNER_TERMS_SOURCE, color: "blue" as const },
          { labelRu: "Чистая машина", labelEn: "Clean vehicle", source: PRODUCT_OWNER_TERMS_SOURCE, color: "white" as const },
        ]
      : []),
  ];
  let seed = [...inventoryId].reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  const shuffled = [...pool];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const target = seed % (index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  const count = 2 + (seed % 2);
  const selected: VerifiedBadge[] = [];
  const colors = new Set<VerifiedBadge["color"]>();

  for (const badge of shuffled) {
    if (colors.has(badge.color)) continue;
    selected.push(badge);
    colors.add(badge.color);
    if (selected.length === count) break;
  }

  return selected;
}

function getInsuranceExcessThb(inventory: InventoryCar, category: VehicleCategory) {
  const identity = `${inventory.brand ?? ""} ${inventory.model ?? ""} ${inventory.name ?? ""}`.toLowerCase();

  if (/\bbmw\b|\bford\s+(?:ranger|raptor)\b/.test(identity)) return 30_000;
  if (/\bfortuner\b|\bmux\b|\bmu-x\b|\blegender\b/.test(identity)) return 20_000;
  if (category === "suv" || category === "7s") return 10_000;
  if (category === "compact" || category === "sedan") return 5_000;
  return undefined;
}

function getVerifiedTerms(inventory: InventoryCar, category: VehicleCategory) {
  const excessThb = getInsuranceExcessThb(inventory, category);
  const childSeatAvailable = category !== "bikes";

  return {
    insurance: childSeatAvailable
      ? {
          class: "1" as const,
          summary: "Страховка класса 1 действует при ДТП с участием двух сторон.",
          summaryEn: "Class 1 insurance applies to two-party road accidents.",
          requirements: ["Для страхового случая обязательно наличие второй стороны ДТП."],
          requirementsEn: ["A second party to the road accident is required for an insurance claim."],
          exclusions: ["Царапины и повреждения, полученные на парковке без второй стороны."],
          exclusionsEn: ["Scratches and parking damage without an identified second party."],
          excessThb,
        }
      : undefined,
    childSeat: childSeatAvailable ? { available: true, priceThb: 0 } : undefined,
    handover: {
      fullTank: true,
      cleanVehicle: category !== "bikes",
    },
    delivery: [
      { zone: "airport" as const, priceThb: 0 },
      { zone: "city" as const, priceThb: 500 },
    ],
    badges: selectVerifiedBadges(inventory.id ?? "vehicle", category),
  };
}

const slugifyInventoryId = (id: string) =>
  id
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parseInventoryYear(inventory: InventoryCar): number | null {
  const directYear = Number(inventory.year);
  if (Number.isInteger(directYear) && directYear >= 1900 && directYear <= 2100) {
    return directYear;
  }

  const match = `${inventory.name ?? ""} ${inventory.id ?? ""}`.match(/(?:19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function getInventoryColors(color?: string, inventoryId = "") {
  const inferredColor = inventoryId
    .toLowerCase()
    .split(/[^a-z]+/)
    .find((part) => part in colorNamesEnToRu);
  const source = color?.trim() || inferredColor;
  if (!source) return { ru: "Цвет не указан", en: "Color not specified" };

  const normalized = source.toLowerCase();
  return {
    ru: colorNamesEnToRu[normalized] ?? source,
    en: colorNamesRuToEn[normalized] ?? source,
  };
}

function getGenericContent(
  inventory: InventoryCar,
  category: VehicleCategory,
  year: number | null,
) {
  const name = [inventory.brand, inventory.model, year].filter(Boolean).join(" ");
  return {
    summary: `${name} из актуального каталога Sunny Rentals. Тариф рассчитывается по сезону и сроку аренды.`,
    summaryEn: `${name} from the current Sunny Rentals catalogue. The rate is calculated by season and rental length.`,
    bestFor: categoryUseCases[category].ru,
    bestForEn: categoryUseCases[category].en,
  };
}

function hasCompletePricing(pricing: InventoryCar["pricing"]): pricing is SeasonalPricing {
  if (!pricing?.low_season || !pricing.high_season) return false;
  const values = [
    ...Object.values(pricing.low_season),
    ...Object.values(pricing.high_season),
    pricing.deposit,
  ];
  return values.every((value) => Number.isFinite(value) && value >= 0);
}

function adaptInventoryCar(
  inventory: InventoryCar,
  definition?: MarketingCarDefinition,
): MarketingCar | undefined {
  if (!inventory.brand || !inventory.model) return undefined;
  if (!inventory.photos?.main || !hasCompletePricing(inventory.pricing)) return undefined;

  const year = parseInventoryYear(inventory);
  const inventoryCategory = inventory.class ?? inventory.class_;
  if (!inventory.updated_at || !inventory.id) return undefined;
  if (!inventoryCategory || !vehicleCategoryIds.has(inventoryCategory as VehicleCategory)) {
    return undefined;
  }

  const category = inventoryCategory as VehicleCategory;
  const colors = getInventoryColors(inventory.color, inventory.id);
  const content = getGenericContent(inventory, category, year);
  const gallery = [inventory.photos.main, ...(inventory.photos.gallery ?? [])]
    .filter((path, index, paths) => Boolean(path) && paths.indexOf(path) === index)
    .map(publicImagePath);
  const specs = inventory.specs ?? {};
  const priceValues = [
    ...Object.values(inventory.pricing.low_season),
    ...Object.values(inventory.pricing.high_season),
  ];

  return {
    slug: definition?.slug ?? slugifyInventoryId(inventory.id),
    inventoryId: inventory.id,
    published: true,
    indexable: true,
    category,
    brand: inventory.brand,
    model: inventory.model,
    year,
    color: colors.ru,
    colorEn: colors.en,
    power: specs.power ?? "—",
    powerEn: specs.power?.replace(/л\.?с\.?/gi, "hp") ?? "—",
    photos: {
      main: gallery[0],
      gallery,
    },
    image: gallery[0],
    images: gallery,
    fromPrice: Math.min(...priceValues),
    deposit: inventory.pricing.deposit,
    pricing: inventory.pricing,
    transmission: specs.transmission ?? "—",
    engine: specs.engine ?? "—",
    fuel: specs.fuel ?? "—",
    summary: definition?.summary ?? content.summary,
    summaryEn: content.summaryEn,
    bestFor: definition?.bestFor ?? content.bestFor,
    bestForEn: content.bestForEn,
    inventoryUpdatedAt: inventory.updated_at,
    terms: getVerifiedTerms(inventory, category),
  };
}

const adaptedMarketingCars = Object.values(inventoryCars).flatMap((inventory) => {
  const definition = inventory.id
    ? marketingDefinitionsByInventoryId.get(inventory.id)
    : undefined;
  const car = adaptInventoryCar(inventory, definition);
  return car ? [car] : [];
});

const indexedVehicleIdentities = new Set<string>();

export const marketingCars: MarketingCar[] = adaptedMarketingCars.map((car) => {
  const identity = [car.category, car.brand, car.model, car.year, car.colorEn]
    .join("|")
    .toLowerCase();
  const indexable = !indexedVehicleIdentities.has(identity);
  indexedVehicleIdentities.add(identity);
  return { ...car, indexable };
});

export const indexableMarketingCars = marketingCars.filter(
  (car) => car.published && car.indexable,
);

export const getCarBySlug = (slug: string): MarketingCar | undefined =>
  marketingCars.find((car) => car.slug === slug);

export const getCarsByCategory = (category: VehicleCategory): MarketingCar[] =>
  marketingCars.filter((car) => car.category === category);

export const getCategoryById = (category: VehicleCategory) =>
  vehicleCategories.find((item) => item.id === category);

const englishCategoryCopy: Record<
  VehicleCategory,
  { name: string; shortName: string; description: string }
> = {
  compact: {
    name: "Compact cars",
    shortName: "Compact",
    description: "Easy-to-drive cars for beaches, cafés and everyday trips.",
  },
  sedan: {
    name: "Sedans",
    shortName: "Sedan",
    description: "Extra comfort for longer routes across the island.",
  },
  suv: {
    name: "Crossovers and SUVs",
    shortName: "SUV",
    description: "More room, a higher driving position and relaxed island travel.",
  },
  "7s": {
    name: "7+ seat vehicles",
    shortName: "7+ seats",
    description: "Spacious options for families, groups and extra luggage.",
  },
  bikes: {
    name: "Scooters and maxi scooters",
    shortName: "Scooters",
    description: "Move freely around Phuket with easier parking and less traffic.",
  },
};

const englishCarCopy: Record<string, { summary: string; bestFor: string }> = {
  "toyota-yaris": {
    summary: "An economical city car with easy-to-judge dimensions and effortless parking.",
    bestFor: "Couples, small families and everyday trips around the island.",
  },
  "suzuki-swift": {
    summary: "A compact hatchback with lively handling and low fuel consumption.",
    bestFor: "City routes, beaches and Phuket’s narrower streets.",
  },
  "honda-jazz": {
    summary: "Compact outside yet surprisingly spacious inside, with a flexible cabin.",
    bestFor: "Couples, families with a child and travellers carrying luggage.",
  },
  "toyota-vios": {
    summary: "A practical car with a roomy boot and an easy, predictable drive.",
    bestFor: "Daily rental and regular trips between different parts of the island.",
  },
  "toyota-ativ": {
    summary: "A modern sedan with a smooth ride, reversing camera and spacious cabin.",
    bestFor: "Comfortable Phuket journeys and airport transfers with luggage.",
  },
  "honda-civic": {
    summary: "A dynamic sedan with distinctive styling and confident performance.",
    bestFor: "Drivers who value comfort, style and an engaging drive.",
  },
  "honda-city": {
    summary: "A fresh city sedan with a comfortable cabin and efficient engine.",
    bestFor: "Longer rentals and active everyday driving.",
  },
  "toyota-camry": {
    summary: "A large, comfortable sedan for relaxed journeys over any distance.",
    bestFor: "Business travel, families and guests who want extra comfort.",
  },
  "toyota-yaris-cross": {
    summary: "A compact crossover with a high driving position and modern equipment.",
    bestFor: "Families, active routes and trips with beach equipment.",
  },
  "toyota-corolla-cross": {
    summary: "A spacious hybrid crossover with a smooth ride and efficient drivetrain.",
    bestFor: "Long island routes and relaxed family holidays.",
  },
  "mazda-cx-30": {
    summary: "A stylish crossover with precise handling and a high-quality interior.",
    bestFor: "Couples and small families who care about design and comfort.",
  },
  "honda-hr-v": {
    summary: "A modern hybrid SUV with a high seating position and flexible interior.",
    bestFor: "Active holidays, luggage and comfortable full-day routes.",
  },
  "toyota-veloz": {
    summary: "A seven-seat vehicle with three rows and easy access to the cabin.",
    bestFor: "Families, groups of friends and journeys with plenty of luggage.",
  },
  "mitsubishi-xpander": {
    summary: "A practical seven-seat MPV with a spacious cabin and comfortable ride.",
    bestFor: "Larger families exploring Phuket together in one vehicle.",
  },
  "h1-12-seats": {
    summary: "A roomy passenger vehicle for a large group and all their luggage.",
    bestFor: "Group transfers and shared trips without needing a second car.",
  },
  "toyota-alphard": {
    summary: "A premium minivan with a spacious cabin and a high level of comfort.",
    bestFor: "VIP transfers, larger families and special journeys.",
  },
  "honda-adv-350": {
    summary: "A versatile maxi scooter with a comfortable riding position and ample power.",
    bestFor: "Longer routes, two-up riding and active island exploration.",
  },
  "yamaha-tmax": {
    summary: "A powerful premium maxi scooter for fast and comfortable journeys.",
    bestFor: "Experienced riders and longer-distance routes.",
  },
  "honda-forza-350": {
    summary: "A comfortable touring maxi scooter with a top box for personal items.",
    bestFor: "Two-up rides, beach routes and full-day trips.",
  },
  "yamaha-nmax-155": {
    summary: "A light, economical scooter with a comfortable seat and useful top box.",
    bestFor: "Everyday travel, beaches and busy parts of Phuket.",
  },
};

const englishSpecs: Record<string, string> = {
  "5 мест": "5 seats",
  "7 мест": "7 seats",
  "12 мест": "12 seats",
  "до 12 мест": "up to 12 seats",
  "2 места": "2 seats",
  Автомат: "Automatic",
  Вариатор: "CVT",
  Бензин: "Petrol",
  "Бензин / гибрид": "Petrol / hybrid",
  Гибрид: "Hybrid",
  Дизель: "Diesel",
  "1.2 л": "1.2 L",
  "1.3 л": "1.3 L",
  "1.5 л": "1.5 L",
  "1.6 л": "1.6 L",
  "1.8 л": "1.8 L",
  "2.0 л": "2.0 L",
  "2.5 л": "2.5 L",
  "350 см³": "350 cc",
  "155 см³": "155 cc",
  Максискутер: "Maxi scooter",
};

export function getLocalizedCategory(category: VehicleCategory, locale: "ru" | "en") {
  const source = getCategoryById(category);
  if (!source || locale === "ru") return source;
  return { id: category, ...englishCategoryCopy[category] };
}

export function getLocalizedCar(car: MarketingCar, locale: "ru" | "en") {
  if (locale === "ru") return car;

  const copy = englishCarCopy[car.slug];
  return {
    ...car,
    seats: car.seats ? englishSpecs[car.seats] ?? car.seats : undefined,
    transmission: englishSpecs[car.transmission] ?? car.transmission,
    engine: englishSpecs[car.engine] ?? car.engine,
    fuel: englishSpecs[car.fuel] ?? car.fuel,
    summary: copy?.summary ?? car.summaryEn,
    bestFor: copy?.bestFor ?? car.bestForEn,
  };
}
