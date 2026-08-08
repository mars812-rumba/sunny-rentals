import { marketingCars, type MarketingCar } from "@/content/cars";
import type { Locale } from "@/lib/i18n";

export interface VehicleModelGroup {
  key: string;
  slug: string;
  brand: string;
  model: string;
  master: MarketingCar;
  variants: MarketingCar[];
  updatedAt: string;
}

const trimTokens = new Set(["rs", "hev", "hybrid", "premium"]);

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeText = (value: string) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

function getStableModelIdentity(car: MarketingCar) {
  const source = normalizeText(`${car.brand} ${car.model} ${car.inventoryId}`);

  if (source.includes("nmax")) {
    return { brand: "Yamaha", model: "NMAX 155" };
  }
  if (source.includes("adv350") || source.includes("adv 350")) {
    return { brand: "Honda", model: "ADV 350" };
  }
  if (source.includes("pcx160") || source.includes("pcx 160")) {
    return { brand: "Honda", model: "PCX 160" };
  }

  const brand = normalizeText(car.brand) === "mg5" ? "MG" : car.brand.trim();
  const modelTokens = normalizeText(car.model)
    .split(" ")
    .filter((token) => token && !trimTokens.has(token) && !/^(?:19|20)\d{2}$/.test(token));
  const model = modelTokens.join(" ") || normalizeText(car.model);

  return {
    brand,
    model: model
      .split(" ")
      .map((token) => token.toUpperCase() === token && token.length <= 4
        ? token.toUpperCase()
        : token.charAt(0).toUpperCase() + token.slice(1))
      .join(" "),
  };
}

function chooseStableMaster(
  variants: MarketingCar[],
  preferredSlug: string,
) {
  return [...variants].sort((left, right) => {
    const leftExact = left.slug === preferredSlug ? 0 : 1;
    const rightExact = right.slug === preferredSlug ? 0 : 1;
    if (leftExact !== rightExact) return leftExact - rightExact;
    if (left.slug.length !== right.slug.length) return left.slug.length - right.slug.length;
    return left.slug.localeCompare(right.slug, "en");
  })[0];
}

const groupedCars = new Map<string, {
  brand: string;
  model: string;
  variants: MarketingCar[];
}>();

for (const car of marketingCars) {
  const identity = getStableModelIdentity(car);
  const key = normalizeText(`${identity.brand}|${identity.model}`);
  const existing = groupedCars.get(key);

  if (existing) {
    existing.variants.push(car);
  } else {
    groupedCars.set(key, { ...identity, variants: [car] });
  }
}

export const vehicleModelGroups: VehicleModelGroup[] = [...groupedCars.entries()]
  .map(([key, group]) => {
    const preferredSlug = slugify(`${group.brand}-${group.model}`);
    const master = chooseStableMaster(group.variants, preferredSlug);
    const variants = [...group.variants].sort((left, right) => {
      if (left.slug === master.slug) return -1;
      if (right.slug === master.slug) return 1;
      return (right.year ?? 0) - (left.year ?? 0) || left.slug.localeCompare(right.slug, "en");
    });

    return {
      key,
      slug: master.slug,
      brand: group.brand,
      model: group.model,
      master,
      variants,
      updatedAt: variants.reduce(
        (latest, car) => car.inventoryUpdatedAt > latest ? car.inventoryUpdatedAt : latest,
        variants[0].inventoryUpdatedAt,
      ),
    };
  })
  .sort((left, right) => left.slug.localeCompare(right.slug, "en"));

const modelGroupByCarSlug = new Map<string, VehicleModelGroup>();
const modelGroupByMasterSlug = new Map<string, VehicleModelGroup>();

for (const group of vehicleModelGroups) {
  modelGroupByMasterSlug.set(group.slug, group);
  for (const variant of group.variants) modelGroupByCarSlug.set(variant.slug, group);
}

export const getModelGroupByCarSlug = (slug: string) => modelGroupByCarSlug.get(slug);
export const getModelGroupByMasterSlug = (slug: string) => modelGroupByMasterSlug.get(slug);
export const isModelMaster = (car: MarketingCar, group: VehicleModelGroup) =>
  car.slug === group.master.slug;

export function getLocalizedModelGroup(group: VehicleModelGroup, locale: Locale) {
  const years = [...new Set(group.variants.map((car) => car.year).filter((year): year is number => year !== null))]
    .sort((left, right) => left - right);
  const colors = [...new Set(group.variants.map((car) => locale === "ru" ? car.color : car.colorEn))];
  const prices = group.variants.map((car) => car.fromPrice);
  const deposits = [...new Set(group.variants.map((car) => car.deposit))].sort((left, right) => left - right);
  const yearLabel = years.length === 0
    ? locale === "ru" ? "год уточняется" : "year to be confirmed"
    : years.length === 1
      ? String(years[0])
      : `${years[0]}–${years.at(-1)}`;
  const colorLabel = colors.join(", ");

  if (locale === "ru") {
    return {
      name: `${group.brand} ${group.model}`,
      title: `Аренда ${group.brand} ${group.model} на Пхукете`,
      description: `${group.brand} ${group.model} в аренду на Пхукете: ${group.variants.length} ${pluralizeRu(group.variants.length, "вариант", "варианта", "вариантов")}, реальные фото и цены от ${Math.min(...prices)} ฿ в день.`,
      summary: `В каталоге собрано ${group.variants.length} ${pluralizeRu(group.variants.length, "конкретное предложение", "конкретных предложения", "конкретных предложений")} ${group.brand} ${group.model}: ${yearLabel}, цвета — ${colorLabel}. У каждого варианта собственные реальные фотографии, тарифы и депозит.`,
      variantsTitle: "Другие варианты этой модели",
      variantsIntro: "Сравните год, цвет, цену и депозит. Доступность конкретной машины на выбранные даты подтвердит менеджер.",
      current: "Выбранный вариант",
      from: "от",
      perDay: "в день",
      deposit: "Депозит",
      questions: [
        {
          question: `Какие варианты ${group.brand} ${group.model} есть в каталоге?`,
          answer: `На странице собрано ${group.variants.length} ${pluralizeRu(group.variants.length, "предложение", "предложения", "предложений")}: годы — ${yearLabel}, цвета — ${colorLabel}. Это конкретные машины с собственными фотографиями и условиями.`,
        },
        {
          question: `Чем отличаются варианты ${group.brand} ${group.model}?`,
          answer: `Варианты могут отличаться годом, цветом, фотографиями, тарифом и депозитом${deposits.length > 1 ? ` (${deposits.map((value) => `${value.toLocaleString("ru-RU")} ฿`).join(" или ")})` : ""}. Выберите конкретную машину перед переходом в Telegram.`,
        },
      ],
    };
  }

  return {
    name: `${group.brand} ${group.model}`,
    title: `${group.brand} ${group.model} rental in Phuket`,
    description: `Rent a ${group.brand} ${group.model} in Phuket: ${group.variants.length} specific ${group.variants.length === 1 ? "vehicle" : "vehicles"}, real photos and rates from ${Math.min(...prices)} THB per day.`,
    summary: `The catalogue contains ${group.variants.length} specific ${group.brand} ${group.model} ${group.variants.length === 1 ? "option" : "options"}: ${yearLabel}, colours — ${colorLabel}. Every option has its own real photos, rates and deposit.`,
    variantsTitle: "Other options of this model",
    variantsIntro: "Compare year, colour, rate and deposit. A manager confirms the specific vehicle for your dates.",
    current: "Selected option",
    from: "from",
    perDay: "per day",
    deposit: "Deposit",
    questions: [
      {
        question: `Which ${group.brand} ${group.model} options are in the catalogue?`,
        answer: `This page groups ${group.variants.length} specific ${group.variants.length === 1 ? "vehicle" : "vehicles"}: years — ${yearLabel}, colours — ${colorLabel}. Every vehicle has its own photos and terms.`,
      },
      {
        question: `How do the ${group.brand} ${group.model} options differ?`,
        answer: `Options can differ by year, colour, photos, rate and deposit${deposits.length > 1 ? ` (${deposits.map((value) => `${value.toLocaleString("en-US")} THB`).join(" or ")})` : ""}. Choose a specific vehicle before continuing in Telegram.`,
      },
    ],
  };
}

function pluralizeRu(value: number, one: string, few: string, many: string) {
  const mod100 = value % 100;
  const mod10 = value % 10;
  if (mod100 >= 11 && mod100 <= 14) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
