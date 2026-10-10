"""Transactional tenant provisioning for the Sunny SaaS control plane."""

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
import fcntl
import json
import os
from pathlib import Path
import shutil
import tempfile
import threading
from typing import Any, Callable, Dict, Iterator, List, Optional

from pydantic import BaseModel, Field, validator

from .context import TenantAccessError, validate_tenant_id
from .context import TenantContext
from .repositories import JsonlEventRepository
from .partner_contracts import PartnerBotState
from .models import (
    AssetType,
    Membership,
    MembershipRole,
    Subscription,
    SubscriptionStatus,
    Tenant,
    TenantStatus,
)


_THREAD_LOCK = threading.RLock()


def trial_summary(state, tenant_id: str, at: Optional[datetime] = None):
    """Read-only projection: never extend or restart a persisted trial."""
    subscription = next((item for item in state.subscriptions if item.tenant_id == tenant_id), None)
    if subscription is None:
        return None
    moment = at or _utc_now()
    return {"status": subscription.status.value, "days": subscription.trial_days,
            "started_at": subscription.trial_started_at, "ends_at": subscription.trial_ends_at,
            "expired": bool(subscription.status == SubscriptionStatus.TRIALING
                            and subscription.trial_ends_at and moment >= subscription.trial_ends_at)}


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _jsonable(model: BaseModel) -> Dict[str, Any]:
    return json.loads(model.json())


def _atomic_json_write(path: Path, document: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    handle, temporary_name = tempfile.mkstemp(
        prefix=f".{path.name}.", suffix=".tmp", dir=str(path.parent)
    )
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as temporary_file:
            json.dump(document, temporary_file, ensure_ascii=False, indent=2)
            temporary_file.write("\n")
            temporary_file.flush()
            os.fsync(temporary_file.fileno())
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def _collection(tenant_id: str, items: List[BaseModel]) -> Dict[str, Any]:
    return {
        "schema_version": 1,
        "tenant_id": tenant_id,
        "items": [_jsonable(item) for item in items],
    }


@dataclass(frozen=True)
class PlatformContext:
    actor_id: str
    roles: frozenset[str]

    @classmethod
    def for_admin(cls, actor_id: str) -> "PlatformContext":
        return cls(actor_id=str(actor_id), roles=frozenset({"platform_admin"}))

    def require_platform_admin(self) -> None:
        if "platform_admin" not in self.roles:
            raise TenantAccessError("platform_admin role is required")


class TenantProvisionRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    slug: str
    owner_user_id: Optional[str] = Field(default=None, min_length=1, max_length=200)
    primary_asset_type: AssetType = AssetType.CAR
    vertical: str = Field(default="rental", min_length=1, max_length=50)
    currency: str = Field(default="THB", min_length=3, max_length=3)
    locale: str = Field(default="ru", min_length=2, max_length=10)
    timezone: str = Field(default="Asia/Bangkok", min_length=1, max_length=80)
    trial_days: int = Field(default=7, ge=1, le=365)
    branding: Dict[str, Any] = Field(default_factory=dict)
    booking_settings: Dict[str, Any] = Field(default_factory=dict)
    integrations: Dict[str, Any] = Field(default_factory=dict)

    @validator("slug")
    def validate_slug(cls, value: str) -> str:
        return validate_tenant_id(value)

    @validator("currency")
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class ControlPlaneState(BaseModel):
    schema_version: int = 1
    tenants: List[Tenant] = Field(default_factory=list)
    memberships: List[Membership] = Field(default_factory=list)
    subscriptions: List[Subscription] = Field(default_factory=list)
    partner_bot: PartnerBotState = Field(default_factory=PartnerBotState)


class TenantAlreadyExistsError(ValueError):
    pass


class TenantNotFoundError(LookupError):
    pass


class TenantProvisioner:
    """Create and publish tenants while keeping existing tenants untouched."""

    def __init__(
        self,
        storage_root: Path,
        fault_hook: Optional[Callable[[str], None]] = None,
    ) -> None:
        self.root = Path(storage_root).resolve()
        self.platform_dir = self.root / "platform"
        self.tenants_dir = self.root / "tenants"
        self.state_path = self.platform_dir / "control-plane.json"
        self.lock_path = self.platform_dir / ".provision.lock"
        self.fault_hook = fault_hook or (lambda _stage: None)

    @contextmanager
    def _locked(self) -> Iterator[None]:
        self.platform_dir.mkdir(parents=True, exist_ok=True)
        with _THREAD_LOCK:
            with self.lock_path.open("a+", encoding="utf-8") as lock_file:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)

    def _load_state(self) -> ControlPlaneState:
        if self.state_path.exists():
            return ControlPlaneState.parse_obj(
                json.loads(self.state_path.read_text(encoding="utf-8"))
            )
        legacy_tenants_path = self.platform_dir / "tenants.json"
        if legacy_tenants_path.exists():
            document = json.loads(legacy_tenants_path.read_text(encoding="utf-8"))
            tenants = [Tenant.parse_obj(item) for item in document.get("items", [])]
            return ControlPlaneState(tenants=tenants)
        return ControlPlaneState()

    def _save_state(self, state: ControlPlaneState) -> None:
        _atomic_json_write(self.state_path, json.loads(state.json()))

    def _restore_state(self, previous_document: Optional[Dict[str, Any]]) -> None:
        if previous_document is None:
            if self.state_path.exists():
                self.state_path.unlink()
            return
        _atomic_json_write(self.state_path, previous_document)

    def _write_tenant_staging(
        self,
        staging: Path,
        tenant: Tenant,
        membership: Optional[Membership],
        subscription: Subscription,
        actor_id: str,
        timestamp: datetime,
    ) -> None:
        staging.mkdir(parents=True)
        empty_files = ("assets.json", "customers.json", "bookings.json")
        _atomic_json_write(staging / "tenant.json", _jsonable(tenant))
        for filename in empty_files:
            _atomic_json_write(staging / filename, _collection(tenant.tenant_id, []))
        for filename in ("events.jsonl", "conversations.jsonl"):
            (staging / filename).write_text("", encoding="utf-8")
        audit_event = {
            "schema_version": 1,
            "tenant_id": tenant.tenant_id,
            "type": "tenant_created",
            "actor_id": actor_id,
            "timestamp": timestamp.isoformat(),
            "owner_user_id": membership.user_id if membership else None,
            "trial_days": subscription.trial_days,
            "trial_starts_on": subscription.trial_starts_on,
        }
        (staging / "audit.jsonl").write_text(
            json.dumps(audit_event, ensure_ascii=False) + "\n", encoding="utf-8"
        )

    def list_tenants(self, context: PlatformContext) -> List[Tenant]:
        context.require_platform_admin()
        with self._locked():
            return list(self._load_state().tenants)

    def tenant_overviews(self, context: PlatformContext):
        context.require_platform_admin()
        with self._locked():
            state = self._load_state()
            return [{**_jsonable(tenant), "trial": trial_summary(state, tenant.tenant_id)} for tenant in state.tenants]

    def get_tenant(self, context: PlatformContext, tenant_id: str) -> Tenant:
        context.require_platform_admin()
        tenant_id = validate_tenant_id(tenant_id)
        with self._locked():
            tenant = next(
                (item for item in self._load_state().tenants if item.tenant_id == tenant_id),
                None,
            )
        if tenant is None:
            raise TenantNotFoundError(f"tenant not found: {tenant_id}")
        return tenant

    def create_tenant(
        self,
        context: PlatformContext,
        request: TenantProvisionRequest,
        now: Optional[datetime] = None,
    ) -> Tenant:
        context.require_platform_admin()
        timestamp = now or _utc_now()
        tenant_id = validate_tenant_id(request.slug)
        tenant_dir = self.tenants_dir / tenant_id
        with self._locked():
            state = self._load_state()
            previous_state_document = (
                json.loads(self.state_path.read_text(encoding="utf-8"))
                if self.state_path.exists()
                else None
            )
            if tenant_dir.exists() or any(item.tenant_id == tenant_id for item in state.tenants):
                raise TenantAlreadyExistsError(f"tenant already exists: {tenant_id}")
            tenant = Tenant(
                id=tenant_id,
                tenant_id=tenant_id,
                slug=tenant_id,
                name=request.name,
                primary_asset_type=request.primary_asset_type,
                vertical=request.vertical,
                status=TenantStatus.DRAFT,
                created_by=context.actor_id,
                currency=request.currency,
                locale=request.locale,
                timezone=request.timezone,
                branding=request.branding,
                booking_settings=request.booking_settings,
                integrations=request.integrations,
                created_at=timestamp,
                updated_at=timestamp,
            )
            membership = Membership(
                tenant_id=tenant_id,
                user_id=request.owner_user_id,
                role=MembershipRole.OWNER,
                created_at=timestamp,
                updated_at=timestamp,
            ) if request.owner_user_id else None
            subscription = Subscription(
                tenant_id=tenant_id,
                plan="trial",
                status=SubscriptionStatus.DRAFT,
                trial_days=request.trial_days,
                trial_starts_on="publish",
                created_at=timestamp,
                updated_at=timestamp,
            )
            self.tenants_dir.mkdir(parents=True, exist_ok=True)
            staging = Path(
                tempfile.mkdtemp(prefix=f".{tenant_id}.", dir=str(self.tenants_dir))
            )
            shutil.rmtree(staging)
            installed = False
            try:
                self._write_tenant_staging(
                    staging, tenant, membership, subscription, context.actor_id, timestamp
                )
                self.fault_hook("staging_ready")
                os.replace(staging, tenant_dir)
                installed = True
                self.fault_hook("tenant_installed")
                state.tenants.append(tenant)
                if membership is not None:
                    state.memberships.append(membership)
                state.subscriptions.append(subscription)
                self._save_state(state)
                self.fault_hook("control_plane_saved")
            except Exception:
                self._restore_state(previous_state_document)
                if installed and tenant_dir.exists():
                    shutil.rmtree(tenant_dir)
                elif staging.exists():
                    shutil.rmtree(staging)
                raise
            return tenant

    def set_logo(self, context: PlatformContext, tenant_id: str, reference: str) -> Tenant:
        """Keep the control-plane and tenant branding in sync, with rollback."""
        context.require_platform_admin()
        tenant_id = validate_tenant_id(tenant_id)
        with self._locked():
            state = self._load_state()
            tenant = next((item for item in state.tenants if item.tenant_id == tenant_id), None)
            if tenant is None:
                raise TenantNotFoundError("Tenant not found")
            path = self.tenants_dir / tenant_id / "tenant.json"
            previous_tenant = json.loads(path.read_text(encoding="utf-8"))
            previous_state = json.loads(self.state_path.read_text(encoding="utf-8")) if self.state_path.exists() else None
            tenant.branding = {**tenant.branding, "logo": reference}
            tenant.updated_at = _utc_now()
            try:
                _atomic_json_write(path, _jsonable(tenant))
                self._save_state(state)
                JsonlEventRepository(self.root, TenantContext.for_actor(tenant_id, context.actor_id, {"platform_admin"}), "audit.jsonl").append({
                    "schema_version": 1, "type": "tenant_logo_uploaded", "reference": reference,
                    "actor_id": context.actor_id, "timestamp": tenant.updated_at.isoformat(),
                })
            except Exception:
                _atomic_json_write(path, previous_tenant)
                self._restore_state(previous_state)
                raise
            return tenant

    def publish_tenant(
        self,
        context: PlatformContext,
        tenant_id: str,
        now: Optional[datetime] = None,
    ) -> Tenant:
        context.require_platform_admin()
        tenant_id = validate_tenant_id(tenant_id)
        timestamp = now or _utc_now()
        tenant_path = self.tenants_dir / tenant_id / "tenant.json"
        with self._locked():
            state = self._load_state()
            previous_state_document = (
                json.loads(self.state_path.read_text(encoding="utf-8"))
                if self.state_path.exists()
                else None
            )
            tenant = next((item for item in state.tenants if item.tenant_id == tenant_id), None)
            subscription = next(
                (item for item in state.subscriptions if item.tenant_id == tenant_id), None
            )
            if tenant is None or subscription is None or not tenant_path.exists():
                raise TenantNotFoundError(f"tenant is incomplete or missing: {tenant_id}")
            if tenant.status == TenantStatus.TRIAL:
                return tenant
            if tenant.status != TenantStatus.DRAFT:
                raise ValueError(f"cannot publish tenant in status {tenant.status}")
            tenant.status = TenantStatus.TRIAL
            tenant.published_at = timestamp
            tenant.updated_at = timestamp
            subscription.status = SubscriptionStatus.TRIALING
            subscription.trial_started_at = timestamp
            subscription.trial_ends_at = timestamp + timedelta(days=subscription.trial_days)
            subscription.updated_at = timestamp
            previous_tenant_document = json.loads(tenant_path.read_text(encoding="utf-8"))
            try:
                _atomic_json_write(tenant_path, _jsonable(tenant))
                self.fault_hook("tenant_published")
                self._save_state(state)
                self.fault_hook("publication_saved")
                with (tenant_path.parent / "audit.jsonl").open("a", encoding="utf-8") as audit:
                    audit.write(
                        json.dumps(
                            {
                                "schema_version": 1,
                                "tenant_id": tenant_id,
                                "type": "tenant_published",
                                "actor_id": context.actor_id,
                                "timestamp": timestamp.isoformat(),
                                "trial_ends_at": subscription.trial_ends_at.isoformat(),
                            },
                            ensure_ascii=False,
                        )
                        + "\n"
                    )
            except Exception:
                _atomic_json_write(tenant_path, previous_tenant_document)
                self._restore_state(previous_state_document)
                raise
            return tenant
