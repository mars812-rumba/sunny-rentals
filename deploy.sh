#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_ROOT="/home/sunny-rentals"
RELEASES_ROOT="${PROJECT_ROOT}/releases"
CURRENT_LINK="${PROJECT_ROOT}/current"
MARKETING_APP="${PROJECT_ROOT}/apps/marketing"
SERVICE_SOURCE="${PROJECT_ROOT}/deploy/sunny-marketing.service"
SERVICE_TARGET="/etc/systemd/system/sunny-marketing.service"
NGINX_SOURCE="${PROJECT_ROOT}/deploy/nginx.sunny-rentals.online.conf"
NGINX_TARGET="/etc/nginx/sites-available/sunny-rentals.online"
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
RELEASE_DIR="${RELEASES_ROOT}/${RELEASE_ID}"
NEXT_LINK="${PROJECT_ROOT}/.current-${RELEASE_ID}"
PREVIOUS_RELEASE=""
NGINX_BACKUP=""
SWITCHED=0

if [[ "${EUID}" -ne 0 ]]; then
  echo "Deploy must run as root so systemd and nginx can be updated safely."
  exit 1
fi

if [[ "$(pwd)" != "${PROJECT_ROOT}" ]]; then
  cd "${PROJECT_ROOT}"
fi

if [[ "$(git branch --show-current)" != "marsel-collab" ]]; then
  echo "Refusing to deploy: expected branch marsel-collab."
  exit 1
fi

rollback() {
  local exit_code=$?

  if [[ "${exit_code}" -eq 0 ]]; then
    return
  fi

  echo "Deploy failed. Restoring the previous release where possible."

  if [[ "${SWITCHED}" -eq 1 && -n "${PREVIOUS_RELEASE}" && -d "${PREVIOUS_RELEASE}" ]]; then
    ln -s "${PREVIOUS_RELEASE}" "${NEXT_LINK}.rollback"
    mv -Tf "${NEXT_LINK}.rollback" "${CURRENT_LINK}"
    systemctl restart sunny-marketing.service || true
  fi

  if [[ -n "${NGINX_BACKUP}" && -f "${NGINX_BACKUP}" ]]; then
    cp "${NGINX_BACKUP}" "${NGINX_TARGET}"
    nginx -t && systemctl reload nginx || true
  fi

  exit "${exit_code}"
}

trap rollback EXIT

mkdir -p "${RELEASE_DIR}/legacy" "${RELEASE_DIR}/marketing"

echo "Installing Vite dependencies..."
npm ci --no-audit --no-fund

echo "Building the existing Vite WebApp..."
npm run build -- --outDir "${RELEASE_DIR}/legacy"

echo "Installing pinned Next.js application dependencies..."
npm install --prefix "${MARKETING_APP}" --no-package-lock --no-audit --no-fund

echo "Building the Next.js marketing application..."
npm run build --prefix "${MARKETING_APP}"

echo "Preparing the minimal standalone Next.js runtime..."
cp -a "${MARKETING_APP}/.next/standalone/." "${RELEASE_DIR}/marketing/"
mkdir -p "${RELEASE_DIR}/marketing/.next"
cp -a "${MARKETING_APP}/.next/static" "${RELEASE_DIR}/marketing/.next/static"
cp -a "${MARKETING_APP}/public" "${RELEASE_DIR}/marketing/public"

test -f "${RELEASE_DIR}/legacy/index.html"
test -f "${RELEASE_DIR}/marketing/server.js"
test -d "${RELEASE_DIR}/marketing/.next/static"

if [[ -L "${CURRENT_LINK}" ]]; then
  PREVIOUS_RELEASE="$(readlink -f "${CURRENT_LINK}")"
fi

ln -s "${RELEASE_DIR}" "${NEXT_LINK}"
mv -Tf "${NEXT_LINK}" "${CURRENT_LINK}"
SWITCHED=1

install -m 0644 "${SERVICE_SOURCE}" "${SERVICE_TARGET}"
systemctl daemon-reload
systemctl enable sunny-marketing.service
systemctl restart sunny-marketing.service

echo "Checking the Next.js service..."
curl --fail --silent --show-error --retry 10 --retry-delay 1 \
  http://127.0.0.1:3100/healthz >/dev/null

if [[ -f "${NGINX_TARGET}" ]]; then
  NGINX_BACKUP="${NGINX_TARGET}.pre-next-${RELEASE_ID}"
  cp "${NGINX_TARGET}" "${NGINX_BACKUP}"
fi

install -m 0644 "${NGINX_SOURCE}" "${NGINX_TARGET}"
nginx -t
systemctl reload nginx

echo "Checking public Next.js and legacy WebApp routes through nginx..."
curl --fail --silent --show-error --noproxy "*" \
  --resolve sunny-rentals.online:443:127.0.0.1 \
  https://sunny-rentals.online/ >/dev/null
curl --fail --silent --show-error --noproxy "*" \
  --resolve sunny-rentals.online:443:127.0.0.1 \
  https://sunny-rentals.online/cars/toyota-yaris >/dev/null
curl --fail --silent --show-error --noproxy "*" \
  --resolve sunny-rentals.online:443:127.0.0.1 \
  https://sunny-rentals.online/app >/dev/null

trap - EXIT

echo "Sunny Rentals release ${RELEASE_ID} is active."
echo "Previous release: ${PREVIOUS_RELEASE:-none}"
