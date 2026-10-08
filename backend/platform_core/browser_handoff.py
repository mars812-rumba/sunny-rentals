"""Short-lived, single-use handoffs from Telegram Mini App to a browser."""

import hashlib
import json
import os
import secrets
import time
import uuid
from pathlib import Path
from typing import Callable


class BrowserHandoffError(PermissionError):
    pass


class BrowserHandoffStore:
    def __init__(
        self,
        storage_root: Path,
        ttl_seconds: int = 60,
        clock: Callable[[], float] = time.time,
    ) -> None:
        if not 30 <= int(ttl_seconds) <= 300:
            raise ValueError("browser handoff TTL must be between 30 and 300 seconds")
        self.storage_root = Path(storage_root)
        self.ttl_seconds = int(ttl_seconds)
        self.clock = clock

    @staticmethod
    def _digest(code: str) -> str:
        return hashlib.sha256(code.encode("utf-8")).hexdigest()

    def issue(self, actor_id: str) -> str:
        actor_id = str(actor_id).strip()
        if not actor_id:
            raise ValueError("actor id is required")
        self.storage_root.mkdir(parents=True, exist_ok=True)
        code = secrets.token_urlsafe(32)
        path = self.storage_root / f"{self._digest(code)}.json"
        temporary_path = self.storage_root / f".{path.name}.{uuid.uuid4().hex}.tmp"
        payload = {
            "actor_id": actor_id,
            "expires_at": int(self.clock()) + self.ttl_seconds,
        }
        temporary_path.write_text(
            json.dumps(payload, separators=(",", ":")),
            encoding="utf-8",
        )
        os.chmod(temporary_path, 0o600)
        os.replace(temporary_path, path)
        return code

    def consume(self, code: str) -> str:
        value = str(code).strip()
        if not 32 <= len(value) <= 128:
            raise BrowserHandoffError("invalid browser handoff")
        path = self.storage_root / f"{self._digest(value)}.json"
        claimed_path = self.storage_root / f".{path.name}.{uuid.uuid4().hex}.claimed"
        try:
            os.replace(path, claimed_path)
        except (FileNotFoundError, OSError) as error:
            raise BrowserHandoffError("invalid or already used browser handoff") from error
        try:
            payload = json.loads(claimed_path.read_text(encoding="utf-8"))
            actor_id = str(payload.get("actor_id") or "").strip()
            expires_at = int(payload.get("expires_at", 0))
            if not actor_id or int(self.clock()) >= expires_at:
                raise BrowserHandoffError("browser handoff expired")
            return actor_id
        except BrowserHandoffError:
            raise
        except Exception as error:
            raise BrowserHandoffError("malformed browser handoff") from error
        finally:
            claimed_path.unlink(missing_ok=True)
