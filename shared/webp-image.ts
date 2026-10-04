import manifest from "./image-webp-manifest.json";

const paths: Record<string, string> = manifest;

/** Use a generated WebP only when its original exists in the conversion map. */
export function webpImagePath(path: string): string {
  const absolute = path.startsWith("/");
  const key = absolute ? path : `/images_web/${path}`;
  const converted = paths[key];
  return converted ? (absolute ? converted : converted.slice("/images_web/".length)) : path;
}
