import type { MetadataRoute } from "next";

import { marketingCars } from "@/content/cars";
import {
  absoluteLanguageUrls,
  localePath,
  type Locale,
} from "@/lib/i18n";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const languages: Locale[] = ["ru", "en"];
  const staticPaths = [
    { path: "/", changeFrequency: "weekly" as const, priority: 1 },
    { path: "/cars", changeFrequency: "daily" as const, priority: 0.9 },
  ];

  const staticPages: MetadataRoute.Sitemap = staticPaths.flatMap((page) =>
    languages.map((locale) => ({
      url: absoluteUrl(localePath(locale, page.path)),
      lastModified: new Date(),
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: absoluteLanguageUrls(page.path),
      },
    })),
  );

  const carPages: MetadataRoute.Sitemap = marketingCars.flatMap((car) => {
    const path = `/cars/${car.slug}`;
    return languages.map((locale) => ({
      url: absoluteUrl(localePath(locale, path)),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: absoluteLanguageUrls(path),
      },
    }));
  });

  return [...staticPages, ...carPages];
}
