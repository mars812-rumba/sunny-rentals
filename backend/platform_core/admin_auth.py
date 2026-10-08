"""Short-lived signed sessions for the SaaS platform administration API."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Callable, Dict, Iterable, Mapping, Optional

from .context import TenantAccessError
from .provisioning import PlatformContext


class PlatformAuthConfigurationError(RuntimeError):
    pass


class PlatformAuthenticationError(PermissionError):
    pass


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


class PlatformAdminAuth:
    def __init__(
        self,
        secret: str,
        allowed_actor_ids: Iterable[str],
        ttl_seconds: int = 900,
        clock: Callable[[], float] = time.time,
    ) -> None:
        if len(secret.encode("utf-8")) < 32:
            raise PlatformAuthConfigurationError(
                "PLATFORM_ADMIN_SESSION_SECRET must be at least 32 bytes"
            )
        self.secret = secret.encode("utf-8")
        self.allowed_actor_ids = frozenset(
            str(actor_id).strip() for actor_id in allowed_actor_ids if str(actor_id).strip()
        )
        if not self.allowed_actor_ids:
            raise PlatformAuthConfigurationError("at least one platform admin is required")
        if not 60 <= int(ttl_seconds) <= 86400:
            raise PlatformAuthConfigurationError("session TTL must be between 60 and 86400 seconds")
        self.ttl_seconds = int(ttl_seconds)
        self.clock = clock

    @classmethod
    def from_env(
        cls,
        environ: Optional[Mapping[str, str]] = None,
    ) -> "PlatformAdminAuth":
        values = environ if environ is not None else os.environ
        secret = values.get("PLATFORM_ADMIN_SESSION_SECRET", "")
        actor_ids = values.get("PLATFORM_ADMIN_IDS", "").split(",")
        ttl_raw = values.get("PLATFORM_ADMIN_SESSION_TTL", "900")
        try:
            ttl_seconds = int(ttl_raw)
        except ValueError as error:
            raise PlatformAuthConfigurationError(
                "PLATFORM_ADMIN_SESSION_TTL must be an integer"
            ) from error
        return cls(secret, actor_ids, ttl_seconds)

    def issue_for_verified_actor(
        self,
        actor_id: str,
        ttl_seconds: Optional[int] = None,
    ) -> str:
        """Issue only after Telegram/OIDC identity was verified by trusted code."""
        actor_id = str(actor_id)
        if actor_id not in self.allowed_actor_ids:
            raise PlatformAuthenticationError("actor is not a platform admin")
        token_ttl = self.ttl_seconds if ttl_seconds is None else int(ttl_seconds)
        if not 60 <= token_ttl <= 86400:
            raise PlatformAuthConfigurationError(
                "session TTL must be between 60 and 86400 seconds"
            )
        issued_at = int(self.clock())
        payload = {
            "v": 1,
            "sub": actor_id,
            "roles": ["platform_admin"],
            "iat": issued_at,
            "exp": issued_at + token_ttl,
            "nonce": secrets.token_urlsafe(12),
        }
        encoded_payload = _encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signature = _encode(
            hmac.new(self.secret, encoded_payload.encode("ascii"), hashlib.sha256).digest()
        )
        return f"{encoded_payload}.{signature}"

    def verify(self, token: str) -> PlatformContext:
        try:
            encoded_payload, received_signature = str(token).split(".", 1)
            expected_signature = _encode(
                hmac.new(
                    self.secret, encoded_payload.encode("ascii"), hashlib.sha256
                ).digest()
            )
            if not hmac.compare_digest(received_signature, expected_signature):
                raise PlatformAuthenticationError("invalid platform session signature")
            payload: Dict[str, Any] = json.loads(_decode(encoded_payload))
        except PlatformAuthenticationError:
            raise
        except Exception as error:
            raise PlatformAuthenticationError("malformed platform session") from error
        now = int(self.clock())
        actor_id = str(payload.get("sub") or "")
        roles = frozenset(str(role) for role in payload.get("roles", []))
        if payload.get("v") != 1 or actor_id not in self.allowed_actor_ids:
            raise PlatformAuthenticationError("platform session actor is not allowed")
        if int(payload.get("iat", 0)) > now + 60 or now >= int(payload.get("exp", 0)):
            raise PlatformAuthenticationError("platform session expired")
        if "platform_admin" not in roles:
            raise TenantAccessError("platform_admin role is required")
        return PlatformContext(actor_id=actor_id, roles=roles)
