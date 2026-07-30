# Next.js production cutover

The production sandbox does not allow the release command to modify systemd or
nginx. The marketing application is therefore exported by Next.js as static
HTML and merged with the existing Vite WebApp into one release:

- Next.js export: Russian `/` and `/cars/*`, English `/en/*`, shared
  `/_next/*`, sitemap, robots and the manifest.
- Existing Vite SPA: `/app`, `/admin/*`, `/dashboard`, `/offer`, `/blog/*`,
  `/offers/*` and `/assets/*`.
- Existing FastAPI/Telegram services: `/api/*`, `/images_web/*`, `/botapi/*`.

`deploy.sh` builds both applications into a timestamped directory under
`releases/`, creates static entry points for the legacy SPA routes and
atomically switches the existing `dist` path. The previous release is retained
for rollback. No files under `/etc` are changed.

Run deployment only through the Telegram bot `/deploy` or `/ship` command.
