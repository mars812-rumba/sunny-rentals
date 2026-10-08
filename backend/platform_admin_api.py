"""Opt-in, authenticated FastAPI router for the Sunny SaaS control plane."""

import os
from pathlib import Path
from typing import Mapping, Optional

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, constr

from platform_core import (
    BrowserHandoffError,
    BrowserHandoffStore,
    PlatformAdminAuth,
    PlatformAuthConfigurationError,
    PlatformAuthenticationError,
    PlatformContext,
    TenantAlreadyExistsError,
    TenantNotFoundError,
    TenantProvisionRequest,
    TenantProvisioner,
    TelegramIdentityError,
    TelegramInitDataVerifier,
)


class TelegramSessionRequest(BaseModel):
    init_data: constr(min_length=1, max_length=TelegramInitDataVerifier.MAX_INIT_DATA_LENGTH)


class BrowserHandoffRequest(BaseModel):
    code: constr(min_length=32, max_length=128)


def create_platform_admin_router(
    storage_root: Path,
    auth: PlatformAdminAuth,
    telegram_verifier: Optional[TelegramInitDataVerifier] = None,
    browser_session_ttl_seconds: int = 28800,
    browser_handoff_store: Optional[BrowserHandoffStore] = None,
) -> APIRouter:
    """Build the router explicitly; importing this module exposes nothing."""
    if not 60 <= int(browser_session_ttl_seconds) <= 86400:
        raise PlatformAuthConfigurationError(
            "PLATFORM_ADMIN_BROWSER_SESSION_TTL must be between 60 and 86400 seconds"
        )
    router = APIRouter(prefix="/api/platform", tags=["platform-admin"])
    bearer = HTTPBearer(auto_error=False)
    provisioner = TenantProvisioner(storage_root)
    handoffs = browser_handoff_store or BrowserHandoffStore(
        storage_root / "_platform_auth" / "browser_handoffs"
    )

    if telegram_verifier is not None:
        @router.post("/session/telegram")
        def create_telegram_session(request: TelegramSessionRequest):
            try:
                user = telegram_verifier.verify(request.init_data)
                actor_id = str(user["id"])
                access_token = auth.issue_for_verified_actor(actor_id)
            except (TelegramIdentityError, PlatformAuthenticationError, KeyError, ValueError):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Telegram identity is invalid or not authorized",
                )
            return {
                "access_token": access_token,
                "token_type": "bearer",
                "expires_in": auth.ttl_seconds,
                "actor": {
                    "id": actor_id,
                    "first_name": user.get("first_name"),
                    "username": user.get("username"),
                },
            }

    def require_admin(
        credentials: HTTPAuthorizationCredentials = Depends(bearer),
    ) -> PlatformContext:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Platform admin authorization required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        try:
            return auth.verify(credentials.credentials)
        except (PlatformAuthenticationError, PermissionError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired platform session",
                headers={"WWW-Authenticate": "Bearer"},
            )

    @router.post("/session/browser-handoff")
    def create_browser_handoff(context: PlatformContext = Depends(require_admin)):
        code = handoffs.issue(context.actor_id)
        return {"code": code, "expires_in": handoffs.ttl_seconds}

    @router.post("/session/browser-handoff/consume")
    def consume_browser_handoff(request: BrowserHandoffRequest):
        try:
            actor_id = handoffs.consume(request.code)
            access_token = auth.issue_for_verified_actor(
                actor_id,
                ttl_seconds=browser_session_ttl_seconds,
            )
        except (BrowserHandoffError, PlatformAuthenticationError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Browser sign-in link is invalid, expired, or already used",
            )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": browser_session_ttl_seconds,
            "actor": {"id": actor_id},
        }

    @router.get("/tenants")
    def list_tenants(context: PlatformContext = Depends(require_admin)):
        return {"tenants": provisioner.list_tenants(context)}

    @router.get("/tenants/{tenant_id}")
    def get_tenant(tenant_id: str, context: PlatformContext = Depends(require_admin)):
        try:
            return {"tenant": provisioner.get_tenant(context, tenant_id)}
        except (TenantNotFoundError, ValueError):
            raise HTTPException(status_code=404, detail="Tenant not found")

    @router.post("/tenants", status_code=status.HTTP_201_CREATED)
    def create_tenant(
        request: TenantProvisionRequest,
        context: PlatformContext = Depends(require_admin),
    ):
        try:
            tenant = provisioner.create_tenant(context, request)
        except TenantAlreadyExistsError as error:
            raise HTTPException(status_code=409, detail=str(error))
        return {"tenant": tenant, "trial_started": False}

    @router.post("/tenants/{tenant_id}/publish")
    def publish_tenant(
        tenant_id: str,
        context: PlatformContext = Depends(require_admin),
    ):
        try:
            tenant = provisioner.publish_tenant(context, tenant_id)
        except TenantNotFoundError as error:
            raise HTTPException(status_code=404, detail=str(error))
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error))
        return {"tenant": tenant, "trial_started": True}

    return router


def mount_platform_admin_api(
    app: FastAPI,
    storage_root: Path,
    environ: Optional[Mapping[str, str]] = None,
) -> bool:
    """Mount the control plane only when explicitly enabled and fully configured."""
    values = environ if environ is not None else os.environ
    if values.get("PLATFORM_ADMIN_API_ENABLED", "false").strip().lower() != "true":
        return False
    auth = PlatformAdminAuth.from_env(values)
    telegram_verifier = TelegramInitDataVerifier.from_env(values)
    browser_ttl_raw = values.get("PLATFORM_ADMIN_BROWSER_SESSION_TTL", "28800")
    try:
        browser_ttl_seconds = int(browser_ttl_raw)
    except ValueError as error:
        raise PlatformAuthConfigurationError(
            "PLATFORM_ADMIN_BROWSER_SESSION_TTL must be an integer"
        ) from error
    app.include_router(
        create_platform_admin_router(
            storage_root,
            auth,
            telegram_verifier,
            browser_session_ttl_seconds=browser_ttl_seconds,
        )
    )
    return True
