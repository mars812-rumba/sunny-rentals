import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const outputDirectory = new URL("../out/", import.meta.url);
const origin = "https://sunny-rentals.online";
const errors = [];

const decodeHtml = (value) =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&amp;", "&")
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");

const getMatch = (html, expression) => decodeHtml(html.match(expression)?.[1] ?? "");

const htmlPathForUrl = (url) => {
  const pathname = new URL(url).pathname;
  return new URL(`.${pathname}index.html`, outputDirectory);
};

const sitemapPath = new URL("sitemap.xml", outputDirectory);
if (!existsSync(sitemapPath)) {
  throw new Error("SEO verification requires a completed static export in apps/marketing/out.");
}

const sitemap = readFileSync(sitemapPath, "utf8");
const robots = readFileSync(new URL("robots.txt", outputDirectory), "utf8");
for (const directive of [
  "Disallow: /app/",
  "Disallow: /admin/",
  "Disallow: /dashboard/",
  "Disallow: /api/",
  "Disallow: /botapi/",
  "Disallow: /telegram/",
  "Disallow: /offer/",
  `Sitemap: ${origin}/sitemap.xml`,
]) {
  if (!robots.includes(directive)) errors.push(`robots.txt: missing ${directive}`);
}
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => ({
  xml: match[1],
  loc: getMatch(match[1], /<loc>([^<]+)<\/loc>/),
}));
const sitemapUrls = new Set(entries.map((entry) => entry.loc));
const titles = new Map();
const descriptions = new Map();
const headings = new Map();

for (const entry of entries) {
  const { loc, xml } = entry;
  if (!loc.startsWith(origin)) errors.push(`${loc}: URL is outside the canonical origin`);
  if (!new URL(loc).pathname.endsWith("/")) errors.push(`${loc}: missing trailing slash`);
  if (!/<lastmod>\d{4}-\d{2}-\d{2}(?:T[^<]+)?<\/lastmod>/.test(xml)) {
    errors.push(`${loc}: missing stable lastmod`);
  }

  const alternates = Object.fromEntries(
    [...xml.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );
  const pathname = new URL(loc).pathname;
  const languagePath = pathname.startsWith("/en/") ? pathname.slice(3) : pathname;
  const expectedAlternates = {
    ru: `${origin}${languagePath}`,
    en: `${origin}/en${languagePath}`,
    "x-default": `${origin}${languagePath}`,
  };
  for (const language of ["ru", "en", "x-default"]) {
    if (!alternates[language]) errors.push(`${loc}: missing ${language} sitemap alternate`);
    else if (alternates[language] !== expectedAlternates[language]) {
      errors.push(`${loc}: incorrect ${language} sitemap alternate`);
    }
    if (alternates[language] && !new URL(alternates[language]).pathname.endsWith("/")) {
      errors.push(`${loc}: ${language} alternate is missing a trailing slash`);
    }
  }

  const htmlPath = htmlPathForUrl(loc);
  if (!existsSync(htmlPath)) {
    errors.push(`${loc}: exported HTML is missing`);
    continue;
  }

  const html = readFileSync(htmlPath, "utf8");
  const canonical = getMatch(html, /<link rel="canonical" href="([^"]+)"/);
  if (canonical !== loc) errors.push(`${loc}: canonical is ${canonical || "missing"}`);
  if (/name="robots" content="[^"]*noindex/i.test(html)) {
    errors.push(`${loc}: sitemap URL is marked noindex`);
  }

  const htmlAlternates = Object.fromEntries(
    [...html.matchAll(/<link rel="alternate" hrefLang="([^"]+)" href="([^"]+)"/g)]
      .map((match) => [match[1], match[2]]),
  );
  for (const language of ["ru", "en", "x-default"]) {
    if (!htmlAlternates[language]) errors.push(`${loc}: missing ${language} HTML alternate`);
    else if (htmlAlternates[language] !== expectedAlternates[language]) {
      errors.push(`${loc}: incorrect ${language} HTML alternate`);
    }
  }

  const title = getMatch(html, /<title>([^<]+)<\/title>/);
  const description = getMatch(html, /<meta name="description" content="([^"]+)"/);
  const openGraphUrl = getMatch(html, /<meta property="og:url" content="([^"]+)"/);
  const openGraphTitle = getMatch(html, /<meta property="og:title" content="([^"]+)"/);
  const openGraphDescription = getMatch(
    html,
    /<meta property="og:description" content="([^"]+)"/,
  );
  if (openGraphUrl !== loc) errors.push(`${loc}: Open Graph URL does not match canonical`);
  if (!openGraphTitle || !openGraphDescription) errors.push(`${loc}: incomplete Open Graph metadata`);
  const h1 = getMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, "").trim();
  const localeKey = pathname.startsWith("/en/") ? "en" : "ru";
  for (const [label, value, collection] of [
    ["title", title, titles],
    ["description", description, descriptions],
    ["H1", h1, headings],
  ]) {
    const uniquenessKey = `${localeKey}|${value}`;
    if (!value) errors.push(`${loc}: missing ${label}`);
    else if (collection.has(uniquenessKey)) {
      errors.push(`${loc}: duplicate ${label} with ${collection.get(uniquenessKey)}`);
    } else collection.set(uniquenessKey, loc);
  }

  if (/\/cars\/[^/]+\/$/.test(new URL(loc).pathname)) {
    const jsonLd = getMatch(html, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    try {
      const graph = JSON.parse(jsonLd)["@graph"];
      const product = graph?.find((item) => item["@type"] === "Product");
      const productGroup = graph?.find((item) => item["@type"] === "ProductGroup");
      const breadcrumbs = graph?.find((item) => item["@type"] === "BreadcrumbList");
      const variants = productGroup?.hasVariant ?? [];
      const products = product ? [product] : variants;
      if (!products.length || products.some((item) => !item?.offers || item.offers.priceCurrency !== "THB")) {
        errors.push(`${loc}: invalid Product or ProductGroup Offer JSON-LD`);
      }
      if (productGroup && (!productGroup.productGroupID || variants.length < 2)) {
        errors.push(`${loc}: incomplete ProductGroup JSON-LD`);
      }
      if (!breadcrumbs?.itemListElement?.length) errors.push(`${loc}: invalid Breadcrumb JSON-LD`);
    } catch {
      errors.push(`${loc}: JSON-LD is missing or invalid`);
    }
  }
}

const carsDirectories = ["cars", "en/cars"];
for (const relativeDirectory of carsDirectories) {
  const directory = new URL(`${relativeDirectory}/`, outputDirectory);
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const pathname = `/${relativeDirectory}/${item.name}/`;
    const url = `${origin}${pathname}`;
    const html = readFileSync(join(directory.pathname, item.name, "index.html"), "utf8");
    if (!sitemapUrls.has(url)) {
      const canonical = getMatch(html, /<link rel="canonical" href="([^"]+)"/);
      if (/name="robots" content="[^"]*noindex/i.test(html)) {
        errors.push(`${url}: model variant must remain index/follow`);
      }
      if (!canonical || canonical === url || !sitemapUrls.has(canonical)) {
        errors.push(`${url}: model variant canonical is missing or does not point to a sitemap master`);
      }
    }
  }
}

const llmsPath = new URL("llms.txt", outputDirectory);
if (!existsSync(llmsPath)) {
  errors.push(`${origin}/llms.txt: exported file is missing`);
} else {
  const llms = readFileSync(llmsPath, "utf8");
  for (const required of ["# Sunny Rentals", `${origin}/cars/`, `${origin}/en/cars/`]) {
    if (!llms.includes(required)) errors.push(`${origin}/llms.txt: missing ${required}`);
  }
  for (const match of llms.matchAll(/\((https:\/\/sunny-rentals\.online\/[^)]+)\)/g)) {
    if (!sitemapUrls.has(match[1])) {
      errors.push(`${origin}/llms.txt: internal link is not a canonical sitemap URL: ${match[1]}`);
    }
  }
}

const httpBaseUrl = process.env.SEO_BASE_URL;
if (httpBaseUrl) {
  const baseUrl = new URL(httpBaseUrl);
  for (const { loc } of entries) {
    const target = new URL(new URL(loc).pathname, baseUrl);
    try {
      const response = await fetch(target, { redirect: "manual" });
      if (response.status !== 200) errors.push(`${target}: HTTP ${response.status}`);
    } catch (error) {
      errors.push(`${target}: ${error instanceof Error ? error.message : "request failed"}`);
    }
  }
}

if (errors.length) {
  console.error(`SEO verification failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `SEO verification passed for ${entries.length} canonical URLs` +
    (httpBaseUrl ? " including HTTP status checks." : "."),
);
