import type { SeasonKey } from "@/content/cars";

export function getPhuketSeason(date = new Date()): SeasonKey {
  const month = Number(
    new Intl.DateTimeFormat("en-US", {
      month: "numeric",
      timeZone: "Asia/Bangkok",
    }).format(date),
  );

  return month >= 11 || month <= 4 ? "high_season" : "low_season";
}
