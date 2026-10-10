"""Control-plane asset editing and private, tenant-scoped image storage.

FFmpeg/ffprobe decode and re-encode accepted raster files; filenames supplied by
clients are never used as paths. Originals remain private and previews are WebP.
"""

import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field, validator

from .context import TenantContext
from .models import AssetStatus, AssetType, RentalAsset, utc_now
from .provisioning import PlatformContext, TenantNotFoundError, TenantProvisioner, trial_summary, _jsonable
from .repositories import JsonCollectionRepository, JsonlEventRepository


MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_PHOTOS = 20
MEDIA_PATTERN = re.compile(r"^(?:logo|assets/[a-f0-9]{32})/[a-f0-9]{32}\.webp$")


class AssetInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    asset_type: AssetType = AssetType.CAR
    brand: str = Field(default="", max_length=80)
    model: str = Field(default="", max_length=80)
    year: Optional[int] = Field(default=None, ge=1950, le=2100)
    color: str = Field(default="", max_length=80)
    daily_rate: float = Field(default=0, ge=0, le=100000000)
    deposit: float = Field(default=0, ge=0, le=100000000)
    public: Optional[bool] = None

    @validator("name")
    def meaningful_name(cls, value):
        if not value.strip():
            raise ValueError("Укажите название техники")
        return value.strip()

    class Config:
        extra = "forbid"
        allow_inf_nan = False


class TenantAssetAdmin:
    def __init__(self, root: Path, context: PlatformContext, tenant_id: str):
        context.require_platform_admin()
        self.provisioner = TenantProvisioner(root)
        self.tenant = self.provisioner.get_tenant(context, tenant_id)
        self.admin = context
        self.context = TenantContext.for_actor(self.tenant.tenant_id, context.actor_id, {"platform_admin"})
        self._owner_auth = None
        self._init_storage(root)

    @classmethod
    def for_owner(cls, partners, tenant_id: str, init_data: str):
        """Reuse asset operations without granting a tenant owner platform privileges."""
        instance = cls.__new__(cls)
        _, context = partners.resolve_identity(tenant_id, init_data, require_owner=True)
        instance.provisioner = partners.provisioner
        instance.tenant = partners.tenant(partners.provisioner._load_state(), context.tenant_id)
        instance.admin = instance.context = context
        instance._owner_auth = lambda: partners.resolve_identity(tenant_id, init_data, require_owner=True)
        instance._init_storage(partners.provisioner.root)
        return instance

    def _authorize(self):
        if self._owner_auth is not None:
            _, context = self._owner_auth()
            context.require_record_tenant(self.context.tenant_id)
            if context.actor_id != self.context.actor_id:
                raise PermissionError('Owner identity changed')

    def _init_storage(self, root):
        self.assets = JsonCollectionRepository(root, self.context, "assets.json", RentalAsset)
        self.audit = JsonlEventRepository(root, self.context, "audit.jsonl")
        self.media_dir = self.assets.storage.tenant_dir / "media"
        if not self.media_dir.resolve().is_relative_to(self.assets.storage.tenant_dir.resolve()):
            raise ValueError("Недопустимое хранилище изображений")

    def _event(self, kind: str, **fields):
        self.audit.append({"schema_version": 1, "type": kind, "actor_id": self.admin.actor_id,
                           "timestamp": utc_now().isoformat(), **fields})

    def tenant_overview(self):
        with self.provisioner._locked():
            self._authorize()
            state = self.provisioner._load_state()
            tenant = next((item for item in state.tenants if item.tenant_id == self.context.tenant_id), None)
            if tenant is None:
                raise TenantNotFoundError('Tenant not found')
            return {**_jsonable(tenant), 'trial': trial_summary(state, self.context.tenant_id)}

    def list(self):
        with self.provisioner._locked():
            self._authorize()
            return self.assets.list()

    def _asset(self, asset_id: str):
        if not re.fullmatch(r"[a-f0-9]{32}", asset_id):
            raise TenantNotFoundError("Техника не найдена")
        asset = self.assets.get(asset_id)
        if asset is None:
            raise TenantNotFoundError("Техника не найдена")
        return asset

    def _commit_asset(self, asset: RentalAsset, event_type: str, **fields):
        """Rollback the JSON mutation if its audit event cannot be persisted."""
        with self.assets.storage.exclusive(self.assets.path):
            previous = self.assets._read_document()
            document = {**previous, "items": list(previous["items"])}
            serialized = json.loads(asset.json())
            document["items"] = [item for item in document["items"] if item["id"] != asset.id] + [serialized]
            try:
                self.assets._write_document(document)
                self._event(event_type, asset_id=asset.id, **fields)
            except Exception:
                self.assets._write_document(previous)
                raise

    def save(self, data: AssetInput, asset_id: Optional[str] = None):
        with self.provisioner._locked():
            self._authorize()
            asset = self._asset(asset_id) if asset_id else RentalAsset(tenant_id=self.context.tenant_id, name=data.name)
            asset.name = data.name
            asset.asset_type = data.asset_type
            asset.specs = {**asset.specs, "brand": data.brand, "model": data.model, "year": data.year, "color": data.color}
            asset.pricing = {**asset.pricing, "daily_rate": data.daily_rate, "currency": self.tenant.currency}
            asset.deposit_policy = {**asset.deposit_policy, "amount": data.deposit, "currency": self.tenant.currency}
            if data.public is not None:
                asset.public = data.public
                if data.public and asset.status == AssetStatus.DRAFT:
                    asset.status = AssetStatus.AVAILABLE
            asset.updated_at = utc_now()
            self._commit_asset(asset, "asset_updated" if asset_id else "asset_created")
            return asset

    def archive(self, asset_id: str):
        with self.provisioner._locked():
            self._authorize()
            asset = self._asset(asset_id)
            asset.archived_at = asset.updated_at = utc_now()
            asset.public = False
            self._commit_asset(asset, "asset_archived")

    def media_path(self, reference: str):
        self._authorize()
        if not MEDIA_PATTERN.fullmatch(reference):
            raise TenantNotFoundError("Изображение не найдено")
        path = self.media_dir / reference
        if not path.resolve().is_relative_to(self.media_dir.resolve()) or not path.is_file():
            raise TenantNotFoundError("Изображение не найдено")
        return path

    def _encode(self, content: bytes, folder: str):
        if not content or len(content) > MAX_IMAGE_BYTES:
            raise ValueError("Размер изображения должен быть от 1 байта до 8 МБ")
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            extension = "png"
        elif content.startswith(b"\xff\xd8\xff"):
            extension = "jpg"
        elif content[:4] == b"RIFF" and content[8:12] == b"WEBP":
            extension = "webp"
        else:
            raise ValueError("Загрузите JPEG, PNG или WebP")
        target = self.media_dir / folder
        if not target.resolve().is_relative_to(self.media_dir.resolve()):
            raise ValueError("Недопустимый путь изображения")
        target.mkdir(parents=True, exist_ok=True)
        file_id = uuid4().hex
        preview = target / f"{file_id}.webp"
        original = target / "original" / f"{file_id}.{extension}"
        original.parent.mkdir(exist_ok=True)
        try:
            with tempfile.TemporaryDirectory(prefix=".upload-", dir=target) as temporary:
                source = Path(temporary) / f"source.{extension}"
                output = Path(temporary) / "preview.webp"
                source.write_bytes(content)
                probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                        "stream=width,height", "-of", "json", str(source)],
                                       capture_output=True, timeout=10, check=True)
                stream = json.loads(probe.stdout)["streams"][0]
                width, height = int(stream["width"]), int(stream["height"])
                if width <= 0 or height <= 0 or width * height > 24000000:
                    raise ValueError("Изображение должно содержать не более 24 мегапикселей")
                subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-threads", "1", "-i", str(source),
                                "-frames:v", "1", "-map_metadata", "-1", "-vf",
                                "scale=w='min(1600,iw)':h='min(1600,ih)':force_original_aspect_ratio=decrease",
                                "-c:v", "libwebp", "-quality", "82", "-threads", "1", str(output)],
                               capture_output=True, timeout=20, check=True)
                os.replace(source, original)
                os.replace(output, preview)
        except (subprocess.SubprocessError, KeyError, IndexError, json.JSONDecodeError) as error:
            original.unlink(missing_ok=True)
            preview.unlink(missing_ok=True)
            raise ValueError("Не удалось прочитать изображение. Загрузите другой JPEG, PNG или WebP") from error
        except Exception:
            original.unlink(missing_ok=True)
            preview.unlink(missing_ok=True)
            raise
        return f"{folder}/{file_id}.webp", (preview, original)

    def upload_photo(self, asset_id: str, content: bytes):
        with self.provisioner._locked():
            self._authorize()
            asset = self._asset(asset_id)
            gallery = list(asset.photos.get("gallery", []))
            if len(gallery) >= MAX_PHOTOS:
                raise ValueError("Для одной машины можно загрузить не более 20 фотографий")
            reference, paths = self._encode(content, f"assets/{asset.id}")
            try:
                gallery.append(reference)
                asset.photos = {**asset.photos, "main": asset.photos.get("main") or reference, "gallery": gallery}
                asset.updated_at = utc_now()
                self._commit_asset(asset, "asset_photo_uploaded", reference=reference)
            except Exception:
                for path in paths:
                    path.unlink(missing_ok=True)
                raise
            return asset

    def upload_logo(self, content: bytes):
        if self._owner_auth is not None:
            raise PermissionError('Logo management requires platform admin')
        reference, paths = self._encode(content, "logo")
        try:
            tenant = self.provisioner.set_logo(self.admin, self.context.tenant_id, reference)
        except Exception:
            for path in paths:
                path.unlink(missing_ok=True)
            raise
        return tenant
