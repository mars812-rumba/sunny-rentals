#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/home/sunny-rentals"
RELEASES_ROOT="${PROJECT_ROOT}/releases"
MARKETING_APP="${PROJECT_ROOT}/apps/marketing"
DIST_PATH="${PROJECT_ROOT}/dist"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="${RELEASES_ROOT}/${RELEASE_ID}"
NEXT_LINK="${PROJECT_ROOT}/.dist-next-${RELEASE_ID}"
PREVIOUS_RELEASE=""
PREVIOUS_DIST=""
SWITCHED=0
DEPLOY_NPM_CACHE="/tmp/sunny-rentals-npm-cache"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Deploy must run through the privileged production release command."
  exit 1
fi

if [[ "$(pwd)" != "${PROJECT_ROOT}" ]]; then
  cd "${PROJECT_ROOT}"
fi

if [[ "$(git branch --show-current)" != "marsel-collab" ]]; then
  echo "Refusing to deploy: expected branch marsel-collab."
  exit 1
fi

mkdir -p "${DEPLOY_NPM_CACHE}"

rollback() {
  local exit_code=$?

  if [[ "${exit_code}" -eq 0 ]]; then
    return
  fi

  echo "Deploy failed. Restoring the previous release where possible."

  if [[ -n "${PREVIOUS_DIST}" && -d "${PREVIOUS_DIST}" ]]; then
    if [[ -L "${DIST_PATH}" ]]; then
      mv -T "${DIST_PATH}" "${NEXT_LINK}.failed"
    fi
    if [[ ! -e "${DIST_PATH}" ]]; then
      mv -T "${PREVIOUS_DIST}" "${DIST_PATH}"
    fi
  elif [[ "${SWITCHED}" -eq 1 && -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then
    ln -s "${PREVIOUS_RELEASE}" "${NEXT_LINK}.rollback"
    mv -Tf "${NEXT_LINK}.rollback" "${DIST_PATH}"
  fi

  exit "${exit_code}"
}

trap rollback EXIT

mkdir -p "${RELEASE_DIR}/legacy" "${RELEASE_DIR}/site"

echo "Installing Vite dependencies..."
npm ci --cache "${DEPLOY_NPM_CACHE}" --no-audit --no-fund

echo "Building the existing Vite WebApp..."
npm run build:vite -- --outDir "${RELEASE_DIR}/legacy" --logLevel warn

echo "Installing pinned Next.js application dependencies..."
npm install \
  --prefix "${MARKETING_APP}" \
  --cache "${DEPLOY_NPM_CACHE}" \
  --no-package-lock \
  --no-audit \
  --no-fund

echo "Building the Next.js marketing application..."
npm run build --prefix "${MARKETING_APP}"

echo "Combining the exported Next.js site with legacy WebApp routes..."
cp -a "${RELEASE_DIR}/legacy/." "${RELEASE_DIR}/site/"
cp -a "${MARKETING_APP}/out/." "${RELEASE_DIR}/site/"

LEGACY_ROUTES=(
  "app"
  "admin"
  "admin/app"
  "admin/offer"
  "admin/scheduler"
  "dashboard"
  "offer"
  "blog"
  "offers"
)

for route in "${LEGACY_ROUTES[@]}"; do
  mkdir -p "${RELEASE_DIR}/site/${route}"
  cp "${RELEASE_DIR}/legacy/index.html" "${RELEASE_DIR}/site/${route}/index.html"
done

while IFS= read -r content_file; do
  slug="$(basename "${content_file}" .json)"
  mkdir -p "${RELEASE_DIR}/site/blog/${slug}"
  cp "${RELEASE_DIR}/legacy/index.html" "${RELEASE_DIR}/site/blog/${slug}/index.html"
done < <(find "${PROJECT_ROOT}/public/content/blog" -maxdepth 1 -type f -name '*.json' ! -name 'index.json')

while IFS= read -r content_file; do
  slug="$(basename "${content_file}" .json)"
  mkdir -p "${RELEASE_DIR}/site/offers/${slug}"
  cp "${RELEASE_DIR}/legacy/index.html" "${RELEASE_DIR}/site/offers/${slug}/index.html"
done < <(find "${PROJECT_ROOT}/public/content/offers" -maxdepth 1 -type f -name '*.json' ! -name 'index.json')

test -f "${RELEASE_DIR}/site/index.html"
test -f "${RELEASE_DIR}/site/cars/index.html"
test -f "${RELEASE_DIR}/site/cars/toyota-yaris/index.html"
test -f "${RELEASE_DIR}/site/en/index.html"
test -f "${RELEASE_DIR}/site/en/cars/index.html"
test -f "${RELEASE_DIR}/site/en/cars/toyota-yaris/index.html"
test -f "${RELEASE_DIR}/site/app/index.html"
test -d "${RELEASE_DIR}/site/_next/static"

if [[ -L "${DIST_PATH}" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "${DIST_PATH}")"
elif [[ -d "${DIST_PATH}" ]]; then
  PREVIOUS_DIST="${RELEASE_DIR}/previous-dist"
  mv -T "${DIST_PATH}" "${PREVIOUS_DIST}"
elif [[ -e "${DIST_PATH}" ]]; then
  echo "Refusing to replace unexpected non-directory dist path."
  exit 1
fi

ln -s "${RELEASE_DIR}/site" "${NEXT_LINK}"
mv -Tf "${NEXT_LINK}" "${DIST_PATH}"
SWITCHED=1

echo "Checking public Next.js pages and the legacy WebApp..."
curl --fail --silent --show-error \
  https://sunny-rentals.online/ >/dev/null
curl --fail --silent --show-error \
  https://sunny-rentals.online/cars/toyota-yaris >/dev/null
curl --fail --silent --show-error \
  https://sunny-rentals.online/en/cars/toyota-yaris >/dev/null
curl --fail --silent --show-error \
  https://sunny-rentals.online/app >/dev/null

trap - EXIT

echo "Sunny Rentals static Next.js release ${RELEASE_ID} is active."
echo "Previous release: ${PREVIOUS_RELEASE:-none}"
