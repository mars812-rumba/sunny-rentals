import type { VehicleCategory } from "@/content/car-contract";
import type { Locale } from "@/lib/i18n";

// Existing owner confirmation, not a substitute for the rental agreement or policy.
// Source: docs/sunny-rentals-etapy-0-7-itogi.md, sections 3.2–3.3.
export const contentUpdatedAt = "2026-10-06";
export const rentalPolicy = {
  source: "product-owner-confirmation:2026-08-03",
  latestOwnerConfirmation: "2026-10-06",
  delivery: { airport: 0, city: 500, chargedPerDirection: true },
  carBooking: { highSeasonAdvance: 1_000, refundableOnCustomerCancellation: false, lowSeasonAdvanceUsuallyRequired: false },
  carReturn: { inspectBeforeDepositRefund: true, sameFuelLevel: true },
  childSeat: { price: 0, onRequest: true },
  handover: { fullTank: true, cleanCar: true },
  excess: { standard: 5_000, suv: 10_000, largeSuv: 20_000, premium: 30_000 },
} as const;

export function insuranceExcess(identity: string, category: VehicleCategory) {
  if (category === "bikes") return undefined;
  if (/\bbmw\b|\bford\s+(?:ranger|raptor)\b/i.test(identity)) return rentalPolicy.excess.premium;
  if (/\bfortuner\b|\bmux\b|\bmu-x\b|\blegender\b/i.test(identity)) return rentalPolicy.excess.largeSuv;
  return category === "suv" || category === "7s" ? rentalPolicy.excess.suv : rentalPolicy.excess.standard;
}

export function policyCopy(locale: Locale) {
  return locale === "ru" ? {
    delivery: `Аэропорт — ${rentalPolicy.delivery.airport} бат. Доставка по городу к отелю или вилле — ${rentalPolicy.delivery.city} бат в одну сторону. Получение и возврат оплачиваются отдельно: две городские передачи — ${rentalPolicy.delivery.city * 2} бат. Точки и общую стоимость согласуйте до подтверждения.`,
    carBooking: `При бронировании автомобиля в высокий сезон предоплата составляет ${rentalPolicy.carBooking.highSeasonAdvance} бат и не возвращается при отмене клиентом. В низкий сезон предоплату обычно не берём; при отмене клиентом бронь отменяется. Предоплата за бронь и возвратный депозит — разные суммы. Сезон и условия выбранных дат подтвердите до оплаты.`,
    depositReturn: "Депозит за автомобиль возвращается после проверки машины на повреждения. При возврате уровень топлива должен быть таким же, как при получении. Способ возврата депозита и условия возможных удержаний проверьте в договоре.",
    insurance: "По опубликованным условиям Sunny для страхового обращения нужна установленная вторая сторона ДТП; парковочные повреждения без неё не покрываются. Это условия предложения Sunny, а не универсальное правило класса страхования. Полис, исключения и расходы проверьте для выбранной машины.",
    scooterCover: "Для байков Sunny не заявляет страховое покрытие повреждений самого транспорта. Обязательные полисы, ответственность перед третьими лицами, кража и медицинское покрытие проверяются отдельно по документам; условия авто к байкам не относятся.",
    childSeat: "Детское кресло предоставляется бесплатно по предварительному запросу. Сообщите возраст, рост и вес ребёнка и подтвердите подходящий тип, крепление и наличие вместе с машиной.",
  } : {
    delivery: `Airport: ${rentalPolicy.delivery.airport} THB. City delivery to a hotel or villa: ${rentalPolicy.delivery.city} THB each way. Pick-up and return are charged separately: two city handovers cost ${rentalPolicy.delivery.city * 2} THB. Agree the locations and total before confirmation.`,
    carBooking: `High-season car bookings require a ${rentalPolicy.carBooking.highSeasonAdvance} THB advance payment, which is not refunded if the customer cancels. In low season, we usually do not take an advance payment; a customer cancellation cancels the booking. The booking advance and refundable security deposit are separate amounts. Confirm the season and terms for your dates before paying.`,
    depositReturn: "The car's security deposit is returned after the vehicle is inspected for damage. Return it with the same fuel level as at collection. Check the agreement for the refund method and any deduction conditions.",
    insurance: "Sunny's published terms require an identified second party for a claim and exclude parking damage without one. These are terms of Sunny's offer, not a universal rule for an insurance class. Check the selected car's policy, exclusions and costs.",
    scooterCover: "Sunny does not advertise cover for damage to the rented bike itself. Mandatory policies, third-party liability, theft and medical cover must be checked separately against documents; car terms do not apply to bikes.",
    childSeat: "A child seat is free on advance request. Share the child's age, height and weight and confirm the correct type, fitting method and availability with the car.",
  };
}
