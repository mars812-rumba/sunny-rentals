import assert from "node:assert/strict";
import { test } from "node:test";
import inventory from "../../../backend/data/web_cars.json";
import { marketingCars, getLocalizedCar } from "../src/content/cars";
import { displayColour, displayIdentity, displaySpec, verifiedVehicleDetails } from "../src/content/vehicle-display";
import { getModelGroupByCarSlug } from "../src/content/model-groups";
import { commercialPages } from "../src/content/commercial-pages";
import { contentPages } from "../src/content/content-pages";
import { createModelHandoffPayload } from "../src/lib/telegram";
import { getPageFaq } from "../src/content/audit-faq";
import { rentalPolicy, policyCopy } from "../src/content/rental-policy";

test("owner-confirmed car policies remain separate from bike terms and rental tariffs", () => {
  assert.equal(rentalPolicy.delivery.chargedPerDirection, true);
  assert.equal(rentalPolicy.delivery.city * 2, 1000);
  assert.equal(rentalPolicy.carBooking.highSeasonAdvance, 1000);
  assert.equal(rentalPolicy.carBooking.refundableOnCustomerCancellation, false);
  assert.equal(rentalPolicy.carBooking.lowSeasonAdvanceUsuallyRequired, false);
  assert.equal(rentalPolicy.carReturn.inspectBeforeDepositRefund, true);
  assert.equal(rentalPolicy.carReturn.sameFuelLevel, true);
  for (const locale of ["ru", "en"] as const) {
    const policy = policyCopy(locale);
    assert.ok(getPageFaq("deposit", locale).some((faq) => faq.answer === policy.depositReturn));
    assert.ok(getPageFaq("rental-terms", locale).some((faq) => faq.answer === policy.carBooking));
    assert.ok(getPageFaq("delivery", locale).some((faq) => faq.answer === policy.delivery));
    assert.ok(!getPageFaq("scooter-rental-phuket", locale).some((faq) => faq.answer === policy.carBooking || faq.answer === policy.depositReturn));
  }
});

test("display correction keeps every inventory ID, tariff and booking payload", () => {
  const categories = { compact: "c", sedan: "d", suv: "s", "7s": "7", bikes: "b" };
  const inventoryCars = inventory.cars as Record<string, { id: string; pricing: unknown }>;
  const rawIds = Object.values(inventoryCars).map((car) => car.id).sort();
  assert.deepEqual(marketingCars.map((car) => car.inventoryId).sort(), rawIds);
  for (const car of marketingCars) {
    const raw = Object.values(inventoryCars).find((item) => item.id === car.inventoryId)!;
    assert.deepEqual(car.pricing, raw.pricing);
    assert.equal(createModelHandoffPayload(car), `sr2_${categories[car.category]}_${car.inventoryId}`);
    const group = getModelGroupByCarSlug(car.slug);
    assert.ok(group?.variants.some((item) => item.inventoryId === car.inventoryId));
  }
});

test("body style is not a colour and malformed bike names display only one year", () => {
  assert.deepEqual(displayColour("Sedan", "toyota_yaris_white_sedan"), { ru: "Белый", en: "White" });
  assert.deepEqual(displayColour("Blackv"), { ru: "Чёрный", en: "Black" });
  assert.deepEqual(displayColour("unknown"), { ru: "", en: "" });
  assert.deepEqual(displayIdentity("Nmax155", "2019", "bikes"), { brand: "Yamaha", model: "NMAX 155" });
  assert.deepEqual(displayIdentity("Pcx160", "2023", "bikes"), { brand: "Honda", model: "PCX 160" });
  assert.deepEqual(displayIdentity("Honda", "ADV", "bikes"), { brand: "Honda", model: "ADV" });
  const bike = marketingCars.find((car) => car.inventoryId === "nmax155_2019_black")!;
  assert.equal(bike.slug, "nmax155-2019-black");
  assert.equal(bike.year, 2019);
  assert.equal(bike.model, "NMAX 155");
});

test("all English physical values are localized without assigning unseen options", () => {
  assert.equal(displaySpec("Бензин/Гибрид", "en"), "Petrol/hybrid");
  for (const source of marketingCars) {
    const car = getLocalizedCar(source, "en");
    assert.ok(!/[а-яё]/i.test([car.fuel, car.engine, car.transmission, source.colorEn].join(" ")), source.inventoryId);
    if (!source.verifiedDetails) {
      assert.equal(car.seats, undefined);
      assert.equal(source.verifiedDetails?.equipment, undefined);
    }
    if (source.category === "bikes") assert.equal(source.terms.childSeat, undefined);
  }
});

test("physical details require an explicit source and verification date", () => {
  const details = { source: "operator-confirmation", verifiedAt: "2026-10-06", seats: 7, childSeatCompatible: true };
  assert.equal(verifiedVehicleDetails(details), details);
  assert.equal(verifiedVehicleDetails({ ...details, source: "" }), undefined);
  assert.equal(verifiedVehicleDetails({ ...details, verifiedAt: "" }), undefined);
  assert.equal(verifiedVehicleDetails({ ...details, verifiedAt: "2026-99-99" }), undefined);
});

test("each scenario has its own questions, child-seat selection requires vehicle-specific verification", () => {
  assert.equal(commercialPages.length, 9);
  const questions = new Set<string>();
  for (const pair of commercialPages) {
    assert.ok(pair.ru.faq.length >= 3 && pair.en.faq.length >= 3);
    const signature = JSON.stringify(pair.ru.faq.map((item) => item.question));
    assert.ok(!questions.has(signature));
    questions.add(signature);
    assert.equal(pair.ru.slug, pair.en.slug);
    assert.ok(pair.ru.faq.every((item) => !/\{(?:airport|city)Price\}|O1–O3/.test(item.answer)));
  }
  assert.ok(commercialPages.find((pair) => pair.ru.slug === "car-rental-with-child-seat-phuket")?.ru.requiresChildSeat);
  assert.equal(getPageFaq("home", "ru").length, 6);
  assert.equal(contentPages.length, 14);
});
