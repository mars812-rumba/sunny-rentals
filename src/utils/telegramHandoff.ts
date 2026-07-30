import { format, parse } from "date-fns";

const BOT_URL = "https://t.me/webapp_rent_bot";
const HANDOFF_PREFIX = "sr1_";

const CATEGORY_TO_CODE: Record<string, string> = {
  sedan: "d",
  suv: "s",
  compact: "c",
  "7s": "7",
  bikes: "b",
};

const CODE_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_TO_CODE).map(([category, code]) => [code, category]),
);

const LOCATION_TO_CODE: Record<string, string> = {
  airport: "a",
  hotel: "h",
  villa: "v",
};

const CODE_TO_LOCATION = Object.fromEntries(
  Object.entries(LOCATION_TO_CODE).map(([location, code]) => [code, location]),
);

export interface TelegramHandoffData {
  category: string;
  startDate: Date;
  endDate: Date;
  pickupLocation: string;
  returnLocation: string;
}

export const createTelegramHandoffPayload = ({
  category,
  startDate,
  endDate,
  pickupLocation,
  returnLocation,
}: TelegramHandoffData): string | null => {
  const categoryCode = CATEGORY_TO_CODE[category];
  const pickupCode = LOCATION_TO_CODE[pickupLocation];
  const returnCode = LOCATION_TO_CODE[returnLocation];

  if (!categoryCode || !pickupCode || !returnCode) {
    return null;
  }

  const payload = [
    HANDOFF_PREFIX,
    categoryCode,
    format(startDate, "yyyyMMdd"),
    format(endDate, "yyyyMMdd"),
    pickupCode,
    returnCode,
  ].join("");

  return /^[A-Za-z0-9_-]{1,64}$/.test(payload) ? payload : null;
};

export const createTelegramHandoffLink = (data: TelegramHandoffData): string => {
  const payload = createTelegramHandoffPayload(data);
  return payload ? `${BOT_URL}?start=${payload}` : BOT_URL;
};

export const parseTelegramHandoffPayload = (
  rawPayload: string | null | undefined,
): TelegramHandoffData | null => {
  if (!rawPayload || !rawPayload.startsWith(HANDOFF_PREFIX)) {
    return null;
  }

  const encoded = rawPayload.slice(HANDOFF_PREFIX.length);
  if (!/^[dsc7b]\d{16}[ahv]{2}$/.test(encoded)) {
    return null;
  }

  const category = CODE_TO_CATEGORY[encoded[0]];
  const startDate = parse(encoded.slice(1, 9), "yyyyMMdd", new Date());
  const endDate = parse(encoded.slice(9, 17), "yyyyMMdd", new Date());
  const pickupLocation = CODE_TO_LOCATION[encoded[17]];
  const returnLocation = CODE_TO_LOCATION[encoded[18]];

  if (!category || !pickupLocation || !returnLocation || endDate < startDate) {
    return null;
  }

  return {
    category,
    startDate,
    endDate,
    pickupLocation,
    returnLocation,
  };
};

