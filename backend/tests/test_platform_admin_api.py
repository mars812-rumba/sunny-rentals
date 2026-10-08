import hashlib
import hmac
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch
from urllib.parse import urlencode

from fastapi import FastAPI, HTTPException

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from platform_admin_api import (
    BrowserHandoffRequest,
    TelegramSessionRequest,
    create_platform_admin_router,
    mount_platform_admin_api,
)
from platform_core import (
    BrowserHandoffStore,
    PlatformAdminAuth,
    PlatformAuthConfigurationError,
    PlatformAuthenticationError,
    TenantProvisionRequest,
    TelegramIdentityError,
    TelegramInitDataVerifier,
)


class MutableClock:
    def __init__(self, value=1_800_000_000):
        self.value = value

    def __call__(self):
        return self.value


def signed_telegram_init_data(bot_token, user, auth_date):
    values = {
        "auth_date": str(auth_date),
        "query_id": "AAExampleQuery",
        "user": json.dumps(user, separators=(",", ":"), ensure_ascii=False),
    }
    data_check_string = "\n".join(
        f"{key}={value}" for key, value in sorted(values.items())
    )
    secret_key = hmac.new(
        b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256
    ).digest()
    values["hash"] = hmac.new(
        secret_key, data_check_string.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return urlencode(values)


class TelegramIdentityTests(unittest.TestCase):
    def setUp(self):
        self.clock = MutableClock()
        self.bot_token = "123456:dedicated-platform-admin-token"
        self.verifier = TelegramInitDataVerifier(
            self.bot_token, max_age_seconds=300, clock=self.clock
        )

    def init_data(self, user_id=123456789, auth_date=None):
        return signed_telegram_init_data(
            self.bot_token,
            {"id": user_id, "first_name": "Admin", "username": "sunny_admin"},
            self.clock.value if auth_date is None else auth_date,
        )

    def test_valid_signed_identity_is_accepted(self):
        user = self.verifier.verify(self.init_data())
        self.assertEqual(user["id"], 123456789)

    def test_tampered_expired_and_future_identity_are_rejected(self):
        tampered = self.init_data().replace("sunny_admin", "intruder")
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify(tampered)
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify(self.init_data(auth_date=self.clock.value - 301))
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify(self.init_data(auth_date=self.clock.value + 61))

    def test_missing_user_duplicate_fields_and_oversized_input_are_rejected(self):
        without_user = signed_telegram_init_data(
            self.bot_token, {"id": 123456789}, self.clock.value
        ).replace("user=", "other=")
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify(without_user)
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify(self.init_data() + "&auth_date=1")
        with self.assertRaises(TelegramIdentityError):
            self.verifier.verify("x" * 8193)


class PlatformAdminAuthTests(unittest.TestCase):
    def setUp(self):
        self.clock = MutableClock()
        self.auth = PlatformAdminAuth(
            "a-secure-platform-session-secret-123456789",
            ["admin-1"],
            ttl_seconds=300,
            clock=self.clock,
        )

    def test_verified_allowed_actor_gets_short_lived_session(self):
        token = self.auth.issue_for_verified_actor("admin-1")
        context = self.auth.verify(token)
        self.assertEqual(context.actor_id, "admin-1")
        self.assertIn("platform_admin", context.roles)
        self.clock.value += 300
        with self.assertRaises(PlatformAuthenticationError):
            self.auth.verify(token)

    def test_tampering_and_unknown_actor_are_rejected(self):
        token = self.auth.issue_for_verified_actor("admin-1")
        with self.assertRaises(PlatformAuthenticationError):
            self.auth.verify(token[:-1] + ("A" if token[-1] != "A" else "B"))
        with self.assertRaises(PlatformAuthenticationError):
            self.auth.issue_for_verified_actor("not-an-admin")

    def test_environment_configuration_fails_closed(self):
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(PlatformAuthConfigurationError):
                PlatformAdminAuth.from_env()


class PlatformAdminApiTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary_directory.name) / "data-v2"
        self.clock = MutableClock()
        self.auth = PlatformAdminAuth(
            "another-secure-session-secret-1234567890",
            ["admin-1"],
            ttl_seconds=300,
            clock=self.clock,
        )
        self.router = create_platform_admin_router(self.root, self.auth)

    def tearDown(self):
        self.temporary_directory.cleanup()

    def route(self, method, path):
        return next(
            route
            for route in self.router.routes
            if route.path == path and method in route.methods
        )

    def test_every_route_requires_bearer_session(self):
        for route in self.router.routes:
            if route.path.endswith("/session/browser-handoff/consume"):
                self.assertFalse(route.dependant.dependencies, route.path)
            else:
                self.assertTrue(route.dependant.dependencies, route.path)
        dependency = self.route("GET", "/api/platform/tenants").dependant.dependencies[0].call
        with self.assertRaises(HTTPException) as error:
            dependency(None)
        self.assertEqual(error.exception.status_code, 401)

    def test_telegram_session_is_issued_only_for_allowlisted_verified_actor(self):
        bot_token = "123456:dedicated-platform-admin-token"
        auth = PlatformAdminAuth(
            "another-secure-session-secret-1234567890",
            ["123456789"],
            ttl_seconds=300,
            clock=self.clock,
        )
        verifier = TelegramInitDataVerifier(bot_token, 300, clock=self.clock)
        router = create_platform_admin_router(self.root, auth, verifier)
        session_route = next(
            route
            for route in router.routes
            if route.path == "/api/platform/session/telegram"
        )
        init_data = signed_telegram_init_data(
            bot_token,
            {"id": 123456789, "first_name": "Admin"},
            self.clock.value,
        )
        response = session_route.endpoint(TelegramSessionRequest(init_data=init_data))
        self.assertEqual(response["token_type"], "bearer")
        self.assertEqual(auth.verify(response["access_token"]).actor_id, "123456789")

        denied_data = signed_telegram_init_data(
            bot_token, {"id": 999}, self.clock.value
        )
        with self.assertRaises(HTTPException) as error:
            session_route.endpoint(TelegramSessionRequest(init_data=denied_data))
        self.assertEqual(error.exception.status_code, 401)

    def test_admin_creates_lists_reads_and_publishes_tenant(self):
        token = self.auth.issue_for_verified_actor("admin-1")
        context = self.auth.verify(token)
        request = TenantProvisionRequest(**{
            "name": "Second Rental",
            "slug": "second-rental",
            "owner_user_id": "telegram:777",
            "currency": "rub",
            "timezone": "Europe/Moscow",
        })
        created = self.route("POST", "/api/platform/tenants").endpoint(request, context)
        self.assertFalse(created["trial_started"])
        self.assertEqual(created["tenant"].currency, "RUB")

        listed = self.route("GET", "/api/platform/tenants").endpoint(context)
        self.assertEqual(len(listed["tenants"]), 1)

        detail = self.route("GET", "/api/platform/tenants/{tenant_id}").endpoint(
            "second-rental", context
        )
        self.assertEqual(detail["tenant"].tenant_id, "second-rental")

        published = self.route(
            "POST", "/api/platform/tenants/{tenant_id}/publish"
        ).endpoint("second-rental", context)
        self.assertTrue(published["trial_started"])
        self.assertEqual(published["tenant"].status.value, "trial")

    def test_duplicate_slug_returns_conflict(self):
        token = self.auth.issue_for_verified_actor("admin-1")
        context = self.auth.verify(token)
        request = TenantProvisionRequest(**{
            "name": "Second Rental",
            "slug": "second-rental",
            "owner_user_id": "owner",
        })
        endpoint = self.route("POST", "/api/platform/tenants").endpoint
        endpoint(request, context)
        with self.assertRaises(HTTPException) as error:
            endpoint(request, context)
        self.assertEqual(error.exception.status_code, 409)

    def test_expired_session_is_rejected(self):
        token = self.auth.issue_for_verified_actor("admin-1")
        self.clock.value += 300
        with self.assertRaises(PlatformAuthenticationError):
            self.auth.verify(token)

    def test_browser_handoff_is_single_use_and_issues_longer_session(self):
        handoffs = BrowserHandoffStore(
            self.root / "handoffs",
            ttl_seconds=60,
            clock=self.clock,
        )
        router = create_platform_admin_router(
            self.root,
            self.auth,
            browser_session_ttl_seconds=3600,
            browser_handoff_store=handoffs,
        )
        routes = {(method, route.path): route for route in router.routes for method in route.methods}
        context = self.auth.verify(self.auth.issue_for_verified_actor("admin-1"))
        issued = routes[("POST", "/api/platform/session/browser-handoff")].endpoint(context)
        response = routes[("POST", "/api/platform/session/browser-handoff/consume")].endpoint(
            BrowserHandoffRequest(code=issued["code"])
        )
        self.assertEqual(response["expires_in"], 3600)
        self.clock.value += 3599
        self.assertEqual(self.auth.verify(response["access_token"]).actor_id, "admin-1")
        with self.assertRaises(HTTPException) as replay_error:
            routes[("POST", "/api/platform/session/browser-handoff/consume")].endpoint(
                BrowserHandoffRequest(code=issued["code"])
            )
        self.assertEqual(replay_error.exception.status_code, 401)

    def test_expired_browser_handoff_is_rejected(self):
        handoffs = BrowserHandoffStore(
            self.root / "handoffs",
            ttl_seconds=60,
            clock=self.clock,
        )
        router = create_platform_admin_router(
            self.root,
            self.auth,
            browser_handoff_store=handoffs,
        )
        routes = {(method, route.path): route for route in router.routes for method in route.methods}
        context = self.auth.verify(self.auth.issue_for_verified_actor("admin-1"))
        issued = routes[("POST", "/api/platform/session/browser-handoff")].endpoint(context)
        self.clock.value += 60
        with self.assertRaises(HTTPException) as error:
            routes[("POST", "/api/platform/session/browser-handoff/consume")].endpoint(
                BrowserHandoffRequest(code=issued["code"])
            )
        self.assertEqual(error.exception.status_code, 401)


class PlatformAdminMountTests(unittest.TestCase):
    def test_disabled_flag_mounts_nothing(self):
        app = FastAPI()
        self.assertFalse(mount_platform_admin_api(app, Path("/tmp/unused"), {}))
        self.assertFalse(any(route.path.startswith("/api/platform") for route in app.routes))

    def test_enabled_flag_requires_complete_secure_configuration(self):
        with self.assertRaises(PlatformAuthConfigurationError):
            mount_platform_admin_api(
                FastAPI(),
                Path("/tmp/unused"),
                {"PLATFORM_ADMIN_API_ENABLED": "true"},
            )

    def test_enabled_and_configured_flag_mounts_control_plane(self):
        app = FastAPI()
        configured = {
            "PLATFORM_ADMIN_API_ENABLED": "true",
            "PLATFORM_ADMIN_SESSION_SECRET": "secure-session-secret-at-least-32-bytes",
            "PLATFORM_ADMIN_IDS": "123456789",
            "PLATFORM_ADMIN_SESSION_TTL": "300",
            "PLATFORM_ADMIN_TELEGRAM_BOT_TOKEN": "123456:dedicated-token",
            "PLATFORM_ADMIN_TELEGRAM_MAX_AGE": "300",
        }
        self.assertTrue(
            mount_platform_admin_api(app, Path("/tmp/unused"), configured)
        )
        paths = {route.path for route in app.routes}
        self.assertIn("/api/platform/session/telegram", paths)
        self.assertIn("/api/platform/session/browser-handoff", paths)
        self.assertIn("/api/platform/session/browser-handoff/consume", paths)
        self.assertIn("/api/platform/tenants", paths)


if __name__ == "__main__":
    unittest.main()
