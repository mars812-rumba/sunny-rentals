import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const prompts = JSON.parse(await readFile(resolve(root, "docs/assets/winter-guide-images.json"), "utf8"));
const originals = process.argv.slice(2);
if (originals.length !== prompts.length) throw new Error("Pass the three generated originals in manifest order");
for (const [index, asset] of prompts.entries()) {
  for (const folder of ["public/images/articles", "apps/marketing/public/images/articles"]) {
    await mkdir(resolve(root, folder), { recursive: true });
    const destination = resolve(root, folder, asset.file);
    for (const quality of [76, 68, 60]) {
      const bytes = await sharp(originals[index]).resize(1600, 900, { fit: "cover" })
        .webp({ quality, effort: 5 }).withExif({ IFD0: { ImageDescription: JSON.stringify(asset) } }).toBuffer();
      if (bytes.length > 250 * 1024 && quality !== 60) continue;
      if (bytes.length > 250 * 1024) throw new Error(`Image budget exceeded: ${asset.file}`);
      // Raster compression only; semantic image creation is done by image_gen.
      await writeFile(destination, bytes);
      console.log(asset.key, bytes.length, destination);
      break;
    }
  }
}
