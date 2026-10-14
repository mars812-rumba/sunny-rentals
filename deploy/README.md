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

## New park routes (AR Rentals and future parks)

Application publication and tenant publication do not install nginx rules.
The generic `try_files $uri $uri/ /index.html` serves the marketing homepage
for parks created after the release, because they have no per-tenant HTML yet.

The minimal fix is `deploy/nginx.park-routes.conf`. An authorized server
administrator should add this fragment **inside the existing HTTPS server**
for `sunny-rentals.online`, leaving all other locations and virtual hosts alone:

```nginx
include /home/sunny-rentals/deploy/nginx.park-routes.conf;
```

Do not also add it if that server already has `/p/` and `/owner/` locations;
update the existing locations instead. Do not replace the whole enabled config
with the larger proposed marketing configuration to fix this particular bug.
Back up the enabled config, validate it with `nginx -t`, and only then apply a
separately authorized reload. The Telegram coding task must not perform these
production operations.

Before activation, verify `dist/p/index.html` and `dist/owner/index.html` exist.
After activation, check `/p/ar-rentals`, `/owner/ar-rentals`, the existing park
routes, the homepage and static assets. A nonexistent tenant should still open
the park application and display its own not-found state, never the Sunny
marketing homepage. Future parks must not require another frontend release.

## Search isolation (pending server configuration)

Only Sunny Rentals public content should be indexed. The checked-in nginx
configurations preserve service routing but send `X-Robots-Tag: noindex, nofollow`
for `weldwood`, `ar`, `demo` and `n8n` subdomains. Their exact `/robots.txt`
permits crawling so Google can read noindex on already indexed URLs.
The main-domain configuration excludes the unrelated `/food-market`,
`/food-market-api`, `/dimohod`, `/dymohod`, `/dimohod-media` and `/irma`
routes, without adding a site-wide noindex or disallow.

These files are proposals copied from the enabled subdomain configurations.
Publishing the application with `deploy.sh` does **not** install nginx changes.
A separately authorized server administrator must review the diffs, apply each
configuration to its existing virtual host (the `ar` host currently uses the
filename `ar`), validate nginx, and reload it. Do not enable duplicate virtual
hosts. Leave the separate `loftfire.ru` host untouched.

After activation, check both HTTP and HTTPS responses on each subdomain,
including `/?restaurant_id=bella_madre_pizza`, `/robots.txt` and asset paths.
Check that `https://sunny-rentals.online/`, `/cars/` and `/en/` remain
indexable and that its sitemap contains only canonical Sunny Rentals URLs.
New subdomain virtual hosts must apply the same noindex policy explicitly.
For faster removal, the owner can request a prefix removal for the affected
subdomain in Search Console; do not remove the parent-domain prefix.
