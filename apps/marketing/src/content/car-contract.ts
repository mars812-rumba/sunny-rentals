export type VehicleCategory = "compact" | "sedan" | "suv" | "7s" | "bikes";

export type SeasonKey = "low_season" | "high_season";

export interface SeasonRates {
  price_1_6: number;
  price_7_14: number;
  price_15_29: number;
  price_30: number;
}

export interface SeasonalPricing {
  low_season: SeasonRates;
  high_season: SeasonRates;
  deposit: number;
}

export interface PublicCarPhotoSet {
  main: string;
  gallery: string[];
  /** Not populated until the inventory stores a separate photo verification date. */
  verifiedAt?: string;
}

export interface VerifiedCarTerms {
  insurance?: {
    class: "1";
    summary: string;
    summaryEn: string;
    requirements: string[];
    requirementsEn: string[];
    exclusions: string[];
    exclusionsEn: string[];
    excessThb?: number;
  };
  mileage?: {
    dailyLimitKm?: number;
    excessPriceThbPerKm?: number;
    unlimited?: boolean;
  };
  minimumRentalDays?: number;
  childSeat?: {
    available: boolean;
    priceThb?: number;
  };
  handover?: {
    fullTank: boolean;
    cleanVehicle: boolean;
  };
  delivery?: Array<{
    zone: "airport" | "city";
    priceThb: number;
  }>;
  badges?: Array<{
    labelRu: string;
    labelEn: string;
    source: string;
    color: "orange" | "green" | "blue" | "white";
  }>;
  rating?: {
    value: number;
    reviewCount: number;
    source: string;
  };
}

/**
 * The public contract consumed by every marketing card and vehicle page.
 * Optional commercial fields must stay hidden when the inventory cannot prove them.
 */
export interface MarketingCar {
  slug: string;
  inventoryId: string;
  published: true;
  indexable: boolean;
  category: VehicleCategory;
  brand: string;
  model: string;
  year: number | null;
  color: string;
  colorEn: string;
  power: string;
  powerEn: string;
  photos: PublicCarPhotoSet;
  image: string;
  images: string[];
  fromPrice: number;
  deposit: number;
  pricing: SeasonalPricing;
  seats?: string;
  transmission: string;
  engine: string;
  fuel: string;
  summary: string;
  summaryEn: string;
  bestFor: string;
  bestForEn: string;
  inventoryUpdatedAt: string;
  /** Separate editorial date is not available in the current inventory. */
  contentUpdatedAt?: string;
  terms: VerifiedCarTerms;
}

export interface InventoryCar {
  id?: string;
  name?: string;
  brand?: string;
  model?: string;
  year?: string | number;
  color?: string;
  class?: string;
  class_?: string;
  photos?: {
    main?: string;
    gallery?: string[];
  };
  pricing?: SeasonalPricing;
  specs?: {
    fuel?: string;
    engine?: string;
    power?: string;
    transmission?: string;
  };
  updated_at?: string;
}

export const unsupportedPublicCarFields = [
  "mileage limit and excess price",
  "minimum rental period",
  "photo verification date",
  "rating and reviews source",
  "editorial content update date",
] as const;
