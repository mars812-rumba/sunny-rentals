"""Atomic, tenant-scoped JSON repositories.

The interface is deliberately storage-agnostic so PostgreSQL repositories can
replace these implementations later without changing service contracts.
"""

from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import re
import tempfile
import threading
from typing import Any, Dict, Generic, Iterator, List, Mapping, Optional, Type, TypeVar

from pydantic import BaseModel

from .context import TenantAccessError, TenantContext


ModelT = TypeVar("ModelT", bound=BaseModel)
FILE_PATTERN = re.compile(r"^[a-z][a-z0-9_-]*\.jsonl?$")
_LOCKS: Dict[str, threading.RLock] = {}
_LOCKS_GUARD = threading.Lock()


def _model_dict(model: BaseModel) -> Dict[str, Any]:
    """Serialize via Pydantic so datetimes and enums become valid JSON."""
    return json.loads(model.json())


def _thread_lock(path: Path) -> threading.RLock:
    key = str(path.resolve())
    with _LOCKS_GUARD:
        return _LOCKS.setdefault(key, threading.RLock())


def _safe_filename(filename: str, suffix: str) -> str:
    if not FILE_PATTERN.fullmatch(filename) or not filename.endswith(suffix):
        raise ValueError(f"invalid repository filename: {filename!r}")
    return filename


class TenantStorage:
    def __init__(self, root: Path, context: TenantContext) -> None:
        self.root = Path(root).resolve()
        self.context = context
        self.tenant_dir = self.root / "tenants" / context.tenant_id
        expected_parent = (self.root / "tenants").resolve()
        if self.tenant_dir.resolve() != expected_parent / context.tenant_id:
            raise TenantAccessError("tenant path escaped storage root")

    def path_for(self, filename: str, suffix: str) -> Path:
        return self.tenant_dir / _safe_filename(filename, suffix)

    @contextmanager
    def exclusive(self, data_path: Path) -> Iterator[None]:
        self.tenant_dir.mkdir(parents=True, exist_ok=True)
        lock_path = data_path.with_suffix(data_path.suffix + ".lock")
        with _thread_lock(lock_path):
            with lock_path.open("a+", encoding="utf-8") as lock_file:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
                try:
                    yield
                finally:
                    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


class JsonCollectionRepository(Generic[ModelT]):
    """A versioned JSON collection that cannot cross its TenantContext."""

    def __init__(
        self,
        root: Path,
        context: TenantContext,
        filename: str,
        model_type: Type[ModelT],
    ) -> None:
        self.storage = TenantStorage(root, context)
        self.context = context
        self.path = self.storage.path_for(filename, ".json")
        self.model_type = model_type

    def _empty_document(self) -> Dict[str, Any]:
        return {"schema_version": 1, "tenant_id": self.context.tenant_id, "items": []}

    def _read_document(self) -> Dict[str, Any]:
        if not self.path.exists():
            return self._empty_document()
        document = json.loads(self.path.read_text(encoding="utf-8"))
        if not isinstance(document, dict) or not isinstance(document.get("items"), list):
            raise ValueError(f"invalid collection document: {self.path}")
        self.context.require_record_tenant(document.get("tenant_id", ""))
        return document

    def _write_document(self, document: Mapping[str, Any]) -> None:
        self.storage.tenant_dir.mkdir(parents=True, exist_ok=True)
        handle, temporary_name = tempfile.mkstemp(
            prefix=f".{self.path.name}.", suffix=".tmp", dir=str(self.storage.tenant_dir)
        )
        try:
            with os.fdopen(handle, "w", encoding="utf-8") as temporary_file:
                json.dump(document, temporary_file, ensure_ascii=False, indent=2)
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())
            os.replace(temporary_name, self.path)
        finally:
            if os.path.exists(temporary_name):
                os.unlink(temporary_name)

    def list(self, include_archived: bool = False) -> List[ModelT]:
        with self.storage.exclusive(self.path):
            items = [self.model_type.parse_obj(item) for item in self._read_document()["items"]]
        for item in items:
            self.context.require_record_tenant(getattr(item, "tenant_id", ""))
        if include_archived:
            return items
        return [item for item in items if getattr(item, "archived_at", None) is None]

    def get(self, record_id: str, include_archived: bool = False) -> Optional[ModelT]:
        return next(
            (item for item in self.list(include_archived) if item.id == str(record_id)),
            None,
        )

    def upsert(self, record: ModelT) -> ModelT:
        if not isinstance(record, self.model_type):
            raise TypeError(f"record must be {self.model_type.__name__}")
        self.context.require_record_tenant(getattr(record, "tenant_id", ""))
        with self.storage.exclusive(self.path):
            document = self._read_document()
            serialized = _model_dict(record)
            for index, item in enumerate(document["items"]):
                if str(item.get("id")) == str(record.id):
                    document["items"][index] = serialized
                    break
            else:
                document["items"].append(serialized)
            self._write_document(document)
        return record


class JsonlEventRepository:
    """Append-only analytics/audit events scoped to one tenant."""

    def __init__(self, root: Path, context: TenantContext, filename: str = "events.jsonl") -> None:
        self.storage = TenantStorage(root, context)
        self.context = context
        self.path = self.storage.path_for(filename, ".jsonl")

    def append(self, event: Mapping[str, Any]) -> Dict[str, Any]:
        payload = dict(event)
        payload.setdefault("tenant_id", self.context.tenant_id)
        self.context.require_record_tenant(payload["tenant_id"])
        line = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        with self.storage.exclusive(self.path):
            with self.path.open("a", encoding="utf-8") as event_file:
                event_file.write(line + "\n")
                event_file.flush()
                os.fsync(event_file.fileno())
        return payload

    def list(self) -> List[Dict[str, Any]]:
        if not self.path.exists():
            return []
        with self.storage.exclusive(self.path):
            events = [
                json.loads(line)
                for line in self.path.read_text(encoding="utf-8").splitlines()
                if line.strip()
            ]
        for event in events:
            self.context.require_record_tenant(event.get("tenant_id", ""))
        return events
