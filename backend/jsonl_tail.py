"""Fault-tolerant tail reader for append-only JSONL logs."""

import subprocess
from collections import deque
from pathlib import Path
from typing import List


def read_jsonl_tail(path: Path, line_count: int) -> List[str]:
    """Return the last lines without failing on a partially written UTF-8 record."""
    target = Path(path)
    count = int(line_count)
    if count <= 0 or not target.exists():
        return []

    try:
        raw = subprocess.check_output(
            ["tail", "-n", str(count), str(target)],
            stderr=subprocess.DEVNULL,
        )
        raw_lines = raw.splitlines()
    except (OSError, subprocess.SubprocessError):
        with target.open("rb") as handle:
            raw_lines = list(deque(handle, maxlen=count))

    # A process or a full disk can interrupt a multibyte UTF-8 write. Replacing
    # the incomplete bytes makes that one JSON record invalid (and skippable)
    # without hiding every valid record before it.
    return [line.decode("utf-8", errors="replace") for line in raw_lines]
