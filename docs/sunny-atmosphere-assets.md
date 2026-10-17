# Sunny Rentals: generated coastal backgrounds

Local changes only. No production publication, restart or scheduled job.

## Owner direction

Replace the generic dark-blue gradient backgrounds with generated Phuket sea, waves, palms and sunset imagery. The homepage uses an imagined Kata Beach sunset. Preserve the existing content, layout, booking flow, real fleet photographs and yellow brand accent. Generated pictures are decorative atmosphere, not photographic proof of a location, a vehicle or a rental service.

## Assets and provenance

Generated using the built-in image generation tool, not an API/CLI fallback. Exact prompts, in sunset / waves / palms order: [sunny-atmosphere-prompts.json](assets/sunny-atmosphere-prompts.json).

Final project directory: `apps/marketing/public/images/atmosphere/`.

| File | Dimensions | Approx. size |
| --- | --- | --- |
| kata-sunset.webp | 1920 × 1080 | 154 KiB |
| kata-sunset-mobile.webp | 800 × 1200 | 62 KiB |
| phuket-waves.webp | 1600 × 900 | 168 KiB |
| phuket-waves-mobile.webp | 800 × 1200 | 89 KiB |
| phuket-palms.webp | 1600 × 900 | 175 KiB |
| phuket-palms-mobile.webp | 800 × 1200 | 110 KiB |

Generated originals remain in `/root/.codex/generated_images/01a11c50-09b1-7f61-98c1-2e4aa619918e/`:

- Sunset: `exec-cafa50d4-27ac-4dad-a6c4-645a5c9f1d3e.png`.
- Waves: `exec-7ef2cf99-891a-4499-8b74-1c8a9d711d2d.png`.
- Palms: `exec-6997f655-6060-4305-949d-9f13538be449.png`.

Shipping WebPs include the exact prompt and AI-generated provenance in EXIF. `scripts/prepare-atmosphere.mjs` uses Sharp for deterministic resizing, centre crops and WebP compression, capped at 250 KiB per file. No generated source path is referenced by the website.

## Surface decisions

- Homepage: sunset; remove cyan radial washes and the near-opaque blue gradient. Responsive background preloads choose one viewport variant.
- Catalogue and Articles index: waves.
- Terms/content/monthly heroes: palms. Contact sections alternate palms and waves.
- Keep forms, vehicle cards and article reading surfaces light. Use a neutral dark header/footer rather than extending a busy photo behind every piece of UI.
- All backdrop copies in the existing stylesheet, including later mobile overrides, use the same shared variables. At 700px and below those variables choose the portrait files.
- Neutral overlays retain visible photography while keeping white text readable. Body text directly on the photos is white rather than faint translucent blue. The tested worst-case white photograph pixel remains above 4.5:1 against white text.

## Verification

- Inspected all three generated originals and the mobile sunset crop. No people, vehicles, logos or text were generated into the backgrounds.
- `node --test tests/marketing-atmosphere.test.mjs tests/monthly-rental-page.test.mjs` passes: format, dimensions, file budgets, provenance, responsive references/preloads, worst-case white-text contrast and existing article flow.
- Targeted ESLint passes for the changed hero component and export script.
- App-only Next build runs in `/tmp/sunny-monthly-check-nz7F8z`, separate from production, with the existing unrelated test-script type error excluded as documented in `monthly-rental-page.md`.
- No browser is available for page screenshots. Source and asset inspection are not a visual approval of desktop/mobile page composition; check the preview before publication.

This is a scoped background treatment, not a new global design system. Existing Sunny typography, spacing, forms and real catalogue assets remain authoritative. No DESIGN.md rewrite or unrelated restyling was performed.
