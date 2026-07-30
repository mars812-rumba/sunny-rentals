import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sunny Rentals",
    short_name: "Sunny Rentals",
    description: "Аренда авто и байков на Пхукете",
    start_url: "/",
    display: "standalone",
    background_color: "#082f49",
    theme_color: "#075985",
    lang: "ru",
  };
}
