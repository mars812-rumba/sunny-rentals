import type { MetadataRoute } from "next";

import { indexableMarketingCars, marketingCars } from "@/content/cars";
import { trustPages } from "@/content/trust-pages";
import {
  absoluteLanguageUrls,
  localePath,
  type Locale,
} from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

const editorialUpdatedAt = "2026-08-03";

const contentDate = (value: string) => value.slice(0, 10);

function newestDate(values: string[]) {
  return values.reduce((latest, value) => (value > latest ? value : latest));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const languages: Locale[] = ["ru", "en"];
  const fleetUpdatedAt = newestDate([
    editorialUpdatedAt,
    ...marketingCars.map((car) => contentDate(car.inventoryUpdatedAt)),
  ]);
  const staticPaths = [
    { path: "/", lastModified: fleetUpdatedAt, changeFrequency: "weekly" as const, priority: 1 },
    { path: "/cars", lastModified: fleetUpdatedAt, changeFrequency: "daily" as const, priority: 0.9 },
  ];

  const staticPages: MetadataRoute.Sitemap = staticPaths.flatMap((page) =>
    languages.map((locale) => ({
      url: absoluteUrl(localePath(locale, page.path)),
      lastModified: page.lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: absoluteLanguageUrls(page.path),
      },
    })),
  );

  const carPages: MetadataRoute.Sitemap = indexableMarketingCars.flatMap((car) => {
    const path = `/cars/${car.slug}`;
    return languages.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      lastModified: contentDate(car.contentUpdatedAt ?? car.inventoryUpdatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: absoluteLanguageUrls(path),
      },
    }));
  });

  const trustPageEntries: MetadataRoute.Sitemap = trustPages.flatMap((localizedPage) =>
    languages.map((locale) => {
      const page = localizedPage[locale];
      const path = `/${page.slug}`;
      return {
        url: absoluteUrl(localePath(locale, path)),
        lastModified: page.updatedAt,
        changeFrequency: "monthly" as const,
        priority: 0.75,
        alternates: { languages: absoluteLanguageUrls(path) },
      };
    }),
  );

  return [...staticPages, ...trustPageEntries, ...carPages];
}
