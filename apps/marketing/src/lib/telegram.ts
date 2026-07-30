import type { MarketingCar, VehicleCategory } from "@/content/cars";
import { siteConfig } from "@/lib/site";

const categoryCodes: Record<VehicleCategory, string> = {
  compact: "c",
  sedan: "d",
  suv: "s",
  "7s": "7",
  bikes: "b",
};

export function createModelHandoffPayload(car: MarketingCar): string {
  return `sr2_${categoryCodes[car.category]}_${car.inventoryId}`;
}

export function createModelHandoffLink(car: MarketingCar): string {
  return `${siteConfig.telegramBotUrl}?start=${createModelHandoffPayload(car)}`;
}
