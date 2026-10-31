import manifest from './image-responsive-manifest.json';
import { webpImagePath } from './webp-image';

const srcSets: Record<string, string> = manifest;

/** Only advertise generated variants; unknown and external photos stay unchanged. */
export function vehicleImageSrcSet(src: string, baseUrl = ''): string | undefined {
  const absolute = src.startsWith('/') ? src : `/images_web/${src}`;
  const variants = srcSets[webpImagePath(absolute)];
  if (!variants) return undefined;
  return variants.split(', ').map(entry => `${baseUrl.replace(/\/$/, '')}${entry}`).join(', ');
}
