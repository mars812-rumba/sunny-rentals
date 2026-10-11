"""Versioned Pydantic contracts for the rental SaaS domain."""

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Literal
from uuid import uuid4

from pydantic import BaseModel, Field, validator

from .context import validate_tenant_id


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return uuid4().hex


class TenantStatus(str, Enum):
    DRAFT = "draft"
    TRIAL = "trial"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class SubscriptionStatus(str, Enum):
    DRAFT = "draft"
    TRIALING = "trialing"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    SUSPENDED = "suspended"
    CANCELLED = "cancelled"


class MembershipRole(str, Enum):
    PLATFORM_ADMIN = "platform_admin"
    OWNER = "owner"
    MANAGER = "manager"
    OPERATOR = "operator"
    VIEWER = "viewer"


class AssetType(str, Enum):
    CAR = "car"
    SCOOTER = "scooter"
    MOTORCYCLE = "motorcycle"
    BICYCLE = "bicycle"
    SNOWMOBILE = "snowmobile"
    OTHER = "other"


class AssetStatus(str, Enum):
    DRAFT = "draft"
    AVAILABLE = "available"
    RESERVED = "reserved"
    RENTED = "rented"
    SERVICE = "service"
    HIDDEN = "hidden"
    ARCHIVED = "archived"


class BookingStatus(str, Enum):
    DRAFT = "draft"
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLATION_REQUESTED = "cancellation_requested"
    CANCELLED = "cancelled"
    REJECTED = "rejected"


class VersionedModel(BaseModel):
    schema_version: int = Field(default=1, ge=1)

    class Config:
        validate_assignment = True
        extra = "forbid"


class TenantRecord(VersionedModel):
    id: str = Field(default_factory=new_id, min_length=1)
    tenant_id: str
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    archived_at: Optional[datetime] = None

    _validate_tenant_id = validator("tenant_id", allow_reuse=True)(validate_tenant_id)


class Tenant(TenantRecord):
    slug: str
    name: str = Field(min_length=1)
    primary_asset_type: AssetType = AssetType.CAR
    vertical: str = "rental"
    status: TenantStatus = TenantStatus.DRAFT
    created_by: Optional[str] = None
    published_at: Optional[datetime] = None
    currency: str = "THB"
    locale: str = "ru"
    timezone: str = "Asia/Bangkok"
    domains: List[str] = Field(default_factory=list)
    branding: Dict[str, Any] = Field(default_factory=dict)
    booking_settings: Dict[str, Any] = Field(default_factory=dict)
    integrations: Dict[str, Any] = Field(default_factory=dict)

    @validator("slug")
    def slug_is_safe(cls, value: str) -> str:
        return validate_tenant_id(value)


class Membership(TenantRecord):
    user_id: str = Field(min_length=1)
    role: MembershipRole
    active: bool = True


class Subscription(TenantRecord):
    plan: str = "trial"
    status: SubscriptionStatus = SubscriptionStatus.DRAFT
    trial_started_at: Optional[datetime] = None
    trial_ends_at: Optional[datetime] = None
    trial_days: int = Field(default=7, ge=1, le=365)
    trial_starts_on: str = "publish"
    limits: Dict[str, int] = Field(default_factory=dict)

    def is_trial_active(self, at: Optional[datetime] = None) -> bool:
        if self.status != SubscriptionStatus.TRIALING:
            return False
        moment = at or utc_now()
        return bool(
            self.trial_started_at
            and self.trial_ends_at
            and self.trial_started_at <= moment < self.trial_ends_at
        )


class RentalAsset(TenantRecord):
    description: str = Field(default='', max_length=5000)
    asset_type: AssetType = AssetType.CAR
    name: str = Field(min_length=1)
    internal_number: Optional[str] = None
    status: AssetStatus = AssetStatus.DRAFT
    public: bool = False
    photos: Dict[str, Any] = Field(default_factory=dict)
    specs: Dict[str, Any] = Field(default_factory=dict)
    pricing: Dict[str, Any] = Field(default_factory=dict)
    availability: Dict[str, Any] = Field(default_factory=dict)
    deposit_policy: Dict[str, Any] = Field(default_factory=dict)
    condition: Dict[str, Any] = Field(default_factory=dict)
    legacy: Dict[str, Any] = Field(default_factory=dict)


class Customer(TenantRecord):
    external_id: Optional[str] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    username: Optional[str] = None
    source: Optional[str] = None
    crm_status: str = "new"
    notes: List[Dict[str, Any]] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Booking(TenantRecord):
    booking_number: Optional[str] = None
    asset_id: str = Field(min_length=1)
    # Manual entries/maintenance have no linked CRM customer yet; do not invent one.
    customer_id: Optional[str] = Field(default=None, min_length=1)
    status: BookingStatus = BookingStatus.REQUESTED
    start_at: datetime
    end_at: datetime
    currency: str = "THB"
    pricing: Dict[str, Any] = Field(default_factory=dict)
    delivery: Dict[str, Any] = Field(default_factory=dict)
    deposit: Dict[str, Any] = Field(default_factory=dict)
    handover: Dict[str, Any] = Field(default_factory=dict)
    return_inspection: Dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = None
    cancellation: Dict[str, Any] = Field(default_factory=dict)
    legacy: Dict[str, Any] = Field(default_factory=dict)
    entry_type: Literal['rental', 'block'] = 'rental'
    operator_details: Dict[str, str] = Field(default_factory=dict)

    @validator("booking_number")
    def six_digit_number(cls, value):
        if value is not None and (len(value) != 6 or not value.isascii() or not value.isdigit()):
            raise ValueError("booking_number must contain six digits")
        return value

    @validator("end_at")
    def end_must_follow_start(cls, value: datetime, values: Dict[str, Any]) -> datetime:
        start = values.get("start_at")
        if start is not None and value <= start:
            raise ValueError("end_at must be later than start_at")
        return value
