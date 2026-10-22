import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(app, "out");
const slugs = JSON.parse(readFileSync(resolve(app, "../../public/content/blog/index.json"), "utf8"));
for (const slug of slugs) {
  const source = JSON.parse(readFileSync(resolve(app, `../../public/content/blog/${slug}.json`), "utf8"));
  for (const prefix of ["articles", "blog"]) {
    const html = readFileSync(resolve(out, prefix, slug, "index.html"), "utf8");
    const visible = html.replace(/<script\b[\s\S]*?<\/script>/g, "");
    assert.match(visible, /<h1\b[^>]*>[^<]+<\/h1>/, `${prefix}/${slug}: server-rendered title missing`);
    assert.match(visible, /class="article-reading__prose"/);
    assert.ok(html.includes(`rel="canonical" href="https://sunny-rentals.online/articles/${slug}/"`));
  }
  const index = readFileSync(resolve(out, "articles/index.html"), "utf8");
  assert.ok(index.includes(`/articles/${slug}/`), `Article missing from main collection: ${slug}`);
}
const slug = "choose-car-rental-phuket-reviews";
const en = readFileSync(resolve(out, `en/articles/${slug}/index.html`), "utf8");
assert.match(en, /How to choose a Phuket car rental company using reviews/);
assert.match(en, /From reviews to a booking decision/);
assert.match(en, /choosing-a-rental-phuket\.webp/);
assert.ok(readFileSync(resolve(out, "en/articles/index.html"), "utf8").includes(`/en/articles/${slug}/`));
assert.ok(existsSync(resolve(out, "images/articles/choosing-a-rental-phuket.webp")));
const winterSlug = '7-luchshih-mest-dlya-zimovschikov-na-phukete';
const winter = readFileSync(resolve(out, `en/articles/${winterSlug}/index.html`), "utf8");
assert.match(winter, /Where to stay in Phuket for the winter/);
for (const area of ['Patong', 'Kathu', 'Rawai', 'Chalong', 'Kamala', 'Surin', 'Bang Tao']) assert.ok(winter.includes(area));
for (const name of ['winter-coast', 'winter-inland', 'winter-harbour']) assert.ok(existsSync(resolve(out, `images/articles/${name}.webp`)));
assert.ok(readFileSync(resolve(out, "en/articles/index.html"), "utf8").includes(`/en/articles/${winterSlug}/`));
const taxi = readFileSync(resolve(out, 'en/articles/car-or-taxi-phuket/index.html'), 'utf8');
assert.match(taxi, /Car rental or taxis in Phuket/);
assert.match(taxi, /low season/);
assert.match(taxi, /6 236/);
assert.match(taxi, /car-or-taxi-phuket-vs-en\.webp/);
assert.ok(readFileSync(resolve(out, 'en/articles/index.html'), 'utf8').includes('/en/articles/car-or-taxi-phuket/'));
assert.ok(existsSync(resolve(out, 'images/articles/car-or-taxi-phuket-vs-en.webp')));
const driving = readFileSync(resolve(out, 'en/articles/phuket-driving-itineraries/index.html'), 'utf8');
assert.match(driving, /What to see in Phuket by car/);
assert.match(driving, /Karon Viewpoint/);
assert.match(driving, /Promthep Cape/);
assert.ok(driving.includes('rel="canonical" href="https://sunny-rentals.online/en/articles/phuket-driving-itineraries/"'));
assert.ok(readFileSync(resolve(out, 'en/articles/index.html'), 'utf8').includes('/en/articles/phuket-driving-itineraries/'));
for (const locale of ['ru', 'en']) {
  const prefix = locale === 'en' ? 'en/' : '';
  const krabi = readFileSync(resolve(out, `${prefix}articles/phuket-krabi-by-car/index.html`), 'utf8');
  assert.match(krabi, new RegExp(`phuket-krabi-route-${locale}\\.webp`));
  assert.ok(krabi.includes(`rel="canonical" href="https://sunny-rentals.online/${prefix}articles/phuket-krabi-by-car/"`));
  assert.ok(readFileSync(resolve(out, `${prefix}articles/index.html`), 'utf8').includes(`/${prefix}articles/phuket-krabi-by-car/`));
}
console.log(`Published-article export verified: ${slugs.length} RU guides, compatibility pages, translated guides including Krabi, indices and images.`);
