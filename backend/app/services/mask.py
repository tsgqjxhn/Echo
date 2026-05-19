from __future__ import annotations

MASKED_API_KEY_PLACEHOLDER = "••••••••"


def mask_api_key(api_key: str | None) -> str:
    key = (api_key or "").strip()
    if not key:
        return ""
    if len(key) <= 8:
        return MASKED_API_KEY_PLACEHOLDER
    head = key[:4]
    tail = key[-4:]
    return f"{head}{'•' * min(12, len(key) - 8)}{tail}"


def is_masked_api_key(value: str | None) -> bool:
    if not value:
        return False
    v = value.strip()
    return v == MASKED_API_KEY_PLACEHOLDER or ("•" in v and len(v) >= 8)
