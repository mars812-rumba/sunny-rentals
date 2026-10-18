// Mechanical resize/compression of existing approved artwork, not a new image.
import sharp from 'sharp';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
for (const mobile of [false, true]) {
  const input = resolve(app, `public/images/atmosphere/kata-sunset${mobile ? '-mobile' : ''}.webp`);
  for (const publicRoot of [resolve(app, 'public'), resolve(app, '../../public')]) {
    const output = resolve(publicRoot, `images/atmosphere/kata-sunset-hero${mobile ? '-mobile' : ''}.webp`);
    await mkdir(dirname(output), { recursive: true });
    await sharp(input).resize({ width: mobile ? 640 : 1600, withoutEnlargement: true })
      .withExifMerge({ IFD0: { ImageDescription: 'AI-generated decorative Phuket sunset; compressed from the approved Sunny Rentals artwork, not documentary photography.' } })
      .webp({ quality: 68, effort: 6 }).toFile(output);
    console.log(`${output}: ${(await stat(output)).size} bytes`);
  }
}
