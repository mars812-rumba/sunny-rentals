import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const [manifest] = process.argv.slice(2);
if (!manifest) throw new Error('Pass the review-icon provenance manifest');
const provenance = JSON.parse(await readFile(manifest, 'utf8'));
for (const icon of provenance.icons) {
  if (!['telegram', 'instagram'].includes(icon.name) || !icon.prompt || !icon.original) throw new Error('Invalid icon provenance');
  const source = sharp(icon.original);
  if (!(await source.metadata()).hasAlpha) throw new Error('The edited icon has no alpha channel');
  // Asset optimization only: preserve the generated transparency and white marks.
  const data = await source.resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ lossless: true, effort: 6 })
    .withExif({ IFD0: { ImageDescription: JSON.stringify({ tool: provenance.tool, ...icon }) } }).toBuffer();
  if (data.length > 20000) throw new Error('Review icon exceeds its payload budget');
  for (const folder of ['public/media/reviews', 'apps/marketing/public/media/reviews']) {
    await mkdir(resolve(root, folder), { recursive: true });
    await writeFile(resolve(root, folder, `${icon.name}-transparent.webp`), data);
  }
  console.log(`${icon.name}: ${data.length} bytes, alpha preserved`);
}
