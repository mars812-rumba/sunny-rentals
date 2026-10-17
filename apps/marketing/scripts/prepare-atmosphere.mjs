// Usage: node scripts/prepare-atmosphere.mjs sunset.png waves.png palms.png
// Deterministic export only; source photos are generated with the built-in image tool.
import sharp from "sharp";
import { mkdir, readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const prompts = JSON.parse(await readFile(resolve(app, "../../docs/assets/sunny-atmosphere-prompts.json"), "utf8"));
const sources = process.argv.slice(2);
if (sources.length !== 3) throw new Error("Pass the generated sunset, waves and palms source files, in that order.");
const destination = resolve(app, "public/images/atmosphere");
await mkdir(destination, { recursive: true });
const names = ["kata-sunset", "phuket-waves", "phuket-palms"];
for (const [index, source] of sources.entries()) {
  for (const mobile of [false, true]) {
    const path = resolve(destination, `${names[index]}${mobile ? "-mobile" : ""}.webp`);
    for (const quality of [80, 74, 68, 60]) {
      await sharp(source).rotate()
        .resize(mobile ? { width: 800, height: 1200, fit: "cover", position: "centre" }
          : { width: index === 0 ? 1920 : 1600, height: index === 0 ? 1080 : 900, fit: "cover", position: "centre" })
        .withExif({ IFD0: { ImageDescription: `AI-generated decorative Phuket scene. ${prompts[index]}`, Copyright: "Sunny Rentals — AI-generated atmosphere, not documentary location photography" } })
        .webp({ quality, effort: 6 }).toFile(path);
      if ((await stat(path)).size <= 250 * 1024) break;
    }
    const bytes = (await stat(path)).size;
    if (bytes > 250 * 1024) throw new Error(`WebP exceeds budget: ${path}`);
    console.log(`${path}: ${Math.round(bytes / 1024)} KiB`);
  }
}
