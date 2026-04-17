from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path


def now_ms() -> int:
    import time

    return int(time.time() * 1000)


def new_id(prefix: str | None = None) -> str:
    value = uuid.uuid4().hex
    return f"{prefix}-{value}" if prefix else value


def guess_mime(path: Path, fallback: str = "application/octet-stream") -> str:
    return mimetypes.guess_type(path.name)[0] or fallback
