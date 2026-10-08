"""Tenant-aware foundation for the Sunny rental SaaS.

This package is intentionally isolated from the current production endpoints.
It can be adopted incrementally while the legacy Sunny JSON files remain the
source of truth.
"""

from .context import TenantAccessError, TenantContext, validate_tenant_id
from .models import (
    AssetStatus,
    AssetType,
    Booking,
    BookingStatus,
    Customer,
    Membership,
    MembershipRole,
    RentalAsset,
    Subscription,
    SubscriptionStatus,
    Tenant,
    TenantStatus,
)
from .repositories import JsonCollectionRepository, JsonlEventRepository
from .legacy_audit import LegacyAuditReport, audit_sunny_legacy_data
from .legacy_migration import (
    DryRunSnapshot,
    MigrationManifest,
    build_sunny_dry_run_snapshot,
    write_snapshot,
)
from .shadow_read import ShadowReadReport, compare_legacy_to_snapshot
from .provisioning import (
    PlatformContext,
    TenantAlreadyExistsError,
    TenantNotFoundError,
    TenantProvisionRequest,
    TenantProvisioner,
)
from .admin_auth import (
    PlatformAdminAuth,
    PlatformAuthConfigurationError,
    PlatformAuthenticationError,
)
from .browser_handoff import BrowserHandoffError, BrowserHandoffStore
from .telegram_identity import TelegramIdentityError, TelegramInitDataVerifier

__all__ = [
    "AssetStatus",
    "AssetType",
    "Booking",
    "BookingStatus",
    "Customer",
    "JsonCollectionRepository",
    "JsonlEventRepository",
    "LegacyAuditReport",
    "DryRunSnapshot",
    "MigrationManifest",
    "ShadowReadReport",
    "PlatformContext",
    "PlatformAdminAuth",
    "PlatformAuthConfigurationError",
    "PlatformAuthenticationError",
    "BrowserHandoffError",
    "BrowserHandoffStore",
    "TelegramIdentityError",
    "TelegramInitDataVerifier",
    "Membership",
    "MembershipRole",
    "RentalAsset",
    "Subscription",
    "SubscriptionStatus",
    "Tenant",
    "TenantAccessError",
    "TenantContext",
    "TenantStatus",
    "TenantAlreadyExistsError",
    "TenantNotFoundError",
    "TenantProvisionRequest",
    "TenantProvisioner",
    "validate_tenant_id",
    "audit_sunny_legacy_data",
    "build_sunny_dry_run_snapshot",
    "write_snapshot",
    "compare_legacy_to_snapshot",
]
