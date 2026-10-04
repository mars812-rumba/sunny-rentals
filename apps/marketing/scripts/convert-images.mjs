import { readdir, readFile, writeFile, stat, mkdir } from "node:fs/promises";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const roots = ["public", "apps/marketing/public", "src/assets"];
const manifest = {};
const sources = new Map();
let originalBytes = 0;
let webpBytes = 0;
let converted = 0;
const skipped = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

// Preserve original filenames and files for Telegram and existing links.
// Appending .webp avoids collisions between e.g. logo.jpg and logo.png.
for (const sourceRoot of roots) {
  const directory = resolve(root, sourceRoot);
  for (const source of await walk(directory)) {
    if (!/\.(jpe?g|png)$/i.test(source)) continue;
    const destination = `${source}.webp`;
    const original = await stat(source);
    const cached = await stat(destination).catch(() => null);
    if (!cached || cached.mtimeMs < original.mtimeMs) {
      try {
        await sharp(source).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80, effort: 5 }).toFile(destination);
      } catch (error) {
        skipped.push({ file: relative(root, source), error: error.message });
        console.warn(`Cannot convert ${relative(root, source)}: ${error.message}`);
        continue;
      }
    }
    let output = await stat(destination);
    if (output.size >= original.size && original.size > 80 * 1024) {
      await sharp(source).rotate().resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 72, effort: 5 }).toFile(destination);
      output = await stat(destination);
    }
    originalBytes += original.size;
    webpBytes += output.size;
    converted++;
    sources.set(source, destination);
    if (sourceRoot !== "src/assets") {
      const url = `/${relative(directory, source).split("\\").join("/")}`;
      manifest[url] = `${url}.webp`;
    }
  }
}
await mkdir(resolve(root, "shared"), { recursive: true });
await writeFile(resolve(root, "shared/image-webp-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

// Update static imports, CSS URLs and content images only when a converted
// file exists. Dynamic catalogue paths use the same manifest at render time.
for (const folder of ["src", "apps/marketing/src", "public/content"]) {
  const files = await walk(resolve(root, folder)).catch(() => []);
  for (const file of files) {
    if (!/\.(tsx?|css|json)$/.test(file)) continue;
    const original = await readFile(file, "utf8");
    let updated = original.replace(/(["'])([^"'\n]+\.(?:jpe?g|png))\1/gi, (match, quote, path) => {
      if (manifest[path]) return `${quote}${manifest[path]}${quote}`;
      const absolute = path.startsWith("@/assets/")
        ? resolve(root, "src", path.slice(2))
        : resolve(dirname(file), path);
      return sources.has(absolute) ? `${quote}${path}.webp${quote}` : match;
    });
    if (folder === "src" && /\.tsx?$/.test(file)) {
      updated = updated.replace(/\/images_web\/\$\{([^}]+)\}/g, (match, expression) => {
        if (expression.includes("webpImagePath(")) return match;
        return `/images_web/\${webpImagePath(${expression})}`;
      });
      if (updated.includes("webpImagePath(") && !original.includes("import { webpImagePath }")) {
        const importPath = relative(dirname(file), resolve(root, "shared/webp-image")).split("\\").join("/");
        updated = `import { webpImagePath } from "${importPath}";\n${updated}`;
      }
    }
    if (updated !== original) await writeFile(file, updated);
  }
}
console.log(JSON.stringify({ converted, originalBytes, webpBytes, savedPercent: Math.round((1 - webpBytes / originalBytes) * 100), skipped }));
