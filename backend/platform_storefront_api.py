"""Read-only tenant storefronts; drafts require a scoped, expiring preview capability."""

import hashlib
import hmac
import json
import secrets
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import FileResponse

from platform_core.admin_auth import PlatformAdminAuth, _decode, _encode
from platform_core.asset_admin import MEDIA_PATTERN
from platform_core.context import TenantContext, validate_tenant_id
from platform_core.models import AssetStatus, RentalAsset, TenantStatus
from platform_core.provisioning import TenantProvisioner
from platform_core.repositories import TenantStorage


class StorefrontPreview:
    TTL = 3600

    def __init__(self, auth: PlatformAdminAuth):
        self.auth = auth
        self.key = hmac.new(auth.secret, b"sunny-storefront-preview-v1", hashlib.sha256).digest()

    def issue(self, tenant_id: str, actor_id: str) -> str:
        body = _encode(json.dumps({"tenant": validate_tenant_id(tenant_id), "actor": actor_id,
                                   "exp": int(self.auth.clock()) + self.TTL,
                                   "nonce": secrets.token_urlsafe(12)}, separators=(",", ":")).encode())
        return body + "." + _encode(hmac.new(self.key, body.encode(), hashlib.sha256).digest())

    def verify(self, token: str, tenant_id: str):
        try:
            if len(token) > 2048:
                raise ValueError()
            body, signature = token.split(".")
            expected = _encode(hmac.new(self.key, body.encode(), hashlib.sha256).digest())
            payload = json.loads(_decode(body))
            if not hmac.compare_digest(signature, expected) or payload["tenant"] != tenant_id:
                raise ValueError()
            if payload["actor"] not in self.auth.allowed_actor_ids or int(payload["exp"]) <= self.auth.clock():
                raise ValueError()
        except Exception:
            raise HTTPException(401, "Ссылка превью истекла. Откройте витрину из суперадминки заново")


class StorefrontReader:
    def __init__(self, root: Path, tenant_id: str, preview: bool):
        self.context = TenantContext(validate_tenant_id(tenant_id))
        self.storage = TenantStorage(root, self.context)
        # The control plane owns publication status. Do not create folders/locks on public reads.
        state = TenantProvisioner(root)._load_state()
        self.tenant = next((t for t in state.tenants if t.tenant_id == tenant_id), None)
        allowed = {TenantStatus.TRIAL, TenantStatus.ACTIVE}
        if preview:
            allowed.add(TenantStatus.DRAFT)
        if self.tenant is None or self.tenant.status not in allowed:
            raise HTTPException(404, "Витрина не найдена или ещё не опубликована")
        path = self.storage.path_for("assets.json", ".json")
        if path.is_symlink():
            raise ValueError("Invalid asset collection")
        document = json.loads(path.read_text()) if path.exists() else {"tenant_id": tenant_id, "items": []}
        self.context.require_record_tenant(document["tenant_id"])
        assets = [RentalAsset.parse_obj(item) for item in document["items"]]
        for asset in assets:
            self.context.require_record_tenant(asset.tenant_id)
        self.assets = [a for a in assets if not a.archived_at and a.status not in {AssetStatus.ARCHIVED, AssetStatus.HIDDEN}
                       and (preview or (a.public and a.status in {AssetStatus.AVAILABLE, AssetStatus.RESERVED, AssetStatus.RENTED}))]

    @staticmethod
    def reference(value):
        return value if isinstance(value, str) and MEDIA_PATTERN.fullmatch(value) else None

    def photos(self, asset):
        # Only this asset's own processed images, never arbitrary paths/another asset's media.
        prefix = f"assets/{asset.id}/"
        values = [asset.photos.get("main"), *asset.photos.get("gallery", [])]
        return list(dict.fromkeys(ref for value in values if (ref := self.reference(value)) and ref.startswith(prefix)))

    def media_path(self, reference):
        permitted = {self.logo()}
        for asset in self.assets:
            permitted.update(self.photos(asset))
        if reference not in permitted or not self.reference(reference):
            raise HTTPException(404, "Изображение не найдено")
        media = self.storage.tenant_dir / "media"
        path = media / reference
        if not media.resolve().is_relative_to(self.storage.tenant_dir.resolve()) or not path.resolve().is_relative_to(media.resolve()) or not path.is_file():
            raise HTTPException(404, "Изображение не найдено")
        return path

    def logo(self):
        reference = self.reference(self.tenant.branding.get("logo"))
        return reference if reference and reference.startswith("logo/") else None

    def catalog(self, preview):
        def number(value):
            return value if isinstance(value, (int, float)) and not isinstance(value, bool) and 0 <= value <= 100000000 else None

        return {"tenant": {"id": self.tenant.tenant_id, "slug": self.tenant.slug,
                           "name": self.tenant.name, "currency": self.tenant.currency,
                           "logo": self.logo()},
                "preview": preview, "booking_enabled": False,
                "assets": [{"id": a.id, "name": a.name, "asset_type": a.asset_type,
                            "specs": {k: v for k, v in a.specs.items() if k in {"brand", "model", "year", "color"} and isinstance(v, (str, int))},
                            "daily_rate": number(a.pricing.get("daily_rate")),
                            "deposit": number(a.deposit_policy.get("amount")),
                            "photos": self.photos(a)} for a in self.assets]}


def create_storefront_router(root: Path, auth: PlatformAdminAuth, booking_enabled: bool = False):
    router = APIRouter(prefix="/api/storefront", tags=["storefront"])
    previews = StorefrontPreview(auth)

    def reader(tenant_id, token):
        if token:
            previews.verify(token, tenant_id)
        try:
            return StorefrontReader(root, tenant_id, bool(token))
        except (ValueError, KeyError, TypeError, OSError):
            raise HTTPException(404, "Витрина недоступна")

    @router.get("/{tenant_id}")
    def catalog(tenant_id: str, x_storefront_preview: str = Header(default="")):
        from fastapi.responses import JSONResponse
        from fastapi.encoders import jsonable_encoder
        result = reader(tenant_id, x_storefront_preview).catalog(bool(x_storefront_preview))
        result['booking_enabled'] = booking_enabled and not result['preview']
        return JSONResponse(jsonable_encoder(result), headers={"Cache-Control": "no-store", "X-Robots-Tag": "noindex"})

    @router.get("/{tenant_id}/media/{reference:path}")
    def media(tenant_id: str, reference: str, x_storefront_preview: str = Header(default="")):
        path = reader(tenant_id, x_storefront_preview).media_path(reference)
        return FileResponse(path, media_type="image/webp", headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Robots-Tag": "noindex"})

    return router
