# Next.js production cutover

Production is split into two zones behind nginx:

- Next.js on `127.0.0.1:3100`: `/`, `/cars/*`, `/_next/*`, sitemap, robots and
  the manifest.
- Existing Vite release: `/app`, `/admin/*`, `/dashboard`, `/offer`,
  `/blog/*`, `/offers/*` and `/assets/*`.
- Existing FastAPI/Telegram services: `/api/*`, `/images_web/*`, `/botapi/*`.

The first cutover is deliberately allow-listed. Unknown paths and content pages
that have not been migrated yet continue to use Vite.

`deploy.sh` builds both applications into a timestamped directory under
`releases/`, checks the standalone Next server, atomically switches `current`,
validates nginx, and reloads it. Previous releases are retained for rollback.

Run deployment only through the Telegram bot `/deploy` or `/ship` command.
