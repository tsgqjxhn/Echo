from __future__ import annotations

from typing import Any

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.entities import APIConfigRecord
from app.schemas.entities import APIConfigResponse, TestResult
from app.services.mask import is_masked_api_key, mask_api_key
from app.services.utils import now_ms


def sanitize_api_config(record: APIConfigRecord) -> APIConfigResponse:
    return APIConfigResponse(
        id=record.id,
        name=record.name,
        provider=record.provider,  # type: ignore[arg-type]
        apiKey=mask_api_key(record.api_key),
        baseURL=record.base_url,
        model=record.model,
        isDefault=record.is_default,
        source=record.source,  # type: ignore[arg-type]
        configType=record.config_type,
    )


def resolve_runtime_api_config(db: Session | None, settings: Settings, config_type: str | None = None) -> dict[str, str] | None:
    if settings.openai_api_key:
        model = settings.openai_model
        if config_type == "stt":
            model = settings.openai_stt_model
        elif config_type == "tts":
            model = settings.openai_tts_model
        return {
            "provider": "openai-compatible",
            "api_key": settings.openai_api_key,
            "base_url": settings.openai_base_url.rstrip("/"),
            "model": model,
            "source": "env",
        }

    if db is None:
        return None

    if config_type:
        record = db.scalar(
            select(APIConfigRecord).where(
                APIConfigRecord.config_type == config_type,
                APIConfigRecord.is_default.is_(True),
            )
        )
        if record is None:
            record = db.scalar(
                select(APIConfigRecord)
                .where(APIConfigRecord.config_type == config_type)
                .order_by(APIConfigRecord.updated_at.desc())
            )
        if record is None and config_type in {"stt", "tts"}:
            record = db.scalar(
                select(APIConfigRecord).where(
                    APIConfigRecord.config_type == "voice",
                    APIConfigRecord.is_default.is_(True),
                )
            )
            if record is None:
                record = db.scalar(
                    select(APIConfigRecord)
                    .where(APIConfigRecord.config_type == "voice")
                    .order_by(APIConfigRecord.updated_at.desc())
                )
    else:
        record = db.scalar(select(APIConfigRecord).where(APIConfigRecord.is_default.is_(True)))
        if record is None:
            record = db.scalar(select(APIConfigRecord).order_by(APIConfigRecord.updated_at.desc()))
    if record is None:
        return None

    return {
        "provider": record.provider,
        "api_key": record.api_key,
        "base_url": (record.base_url or settings.openai_base_url).rstrip("/"),
        "model": record.model,
        "source": record.source,
    }


def upsert_api_config(db: Session, payload: dict[str, Any]) -> APIConfigRecord:
    existing = db.get(APIConfigRecord, payload["id"])
    timestamp = now_ms()

    if existing is None:
        existing = APIConfigRecord(
            id=payload["id"],
            name=payload["name"],
            provider=payload["provider"],
            api_key=payload.get("apiKey") or "",
            base_url=payload.get("baseURL"),
            model=payload["model"],
            is_default=payload.get("isDefault", False),
            source=payload.get("source", "storage"),
            config_type=payload.get("configType", "text"),
            created_at=timestamp,
            updated_at=timestamp,
        )
        db.add(existing)
    else:
        existing.name = payload["name"]
        existing.provider = payload["provider"]
        existing.base_url = payload.get("baseURL")
        existing.model = payload["model"]
        existing.is_default = payload.get("isDefault", False)
        existing.source = payload.get("source", "storage")
        existing.config_type = payload.get("configType", "text")
        existing.updated_at = timestamp
        incoming_key = payload.get("apiKey")
        if incoming_key and not is_masked_api_key(incoming_key):
            existing.api_key = incoming_key

    if existing.is_default:
        for other in db.scalars(select(APIConfigRecord).where(APIConfigRecord.id != existing.id)):
            other.is_default = False

    db.commit()
    db.refresh(existing)
    return existing


async def test_api_config(config: dict[str, Any]) -> TestResult:
    base_url = (config.get("baseURL") or "https://api.openai.com/v1").rstrip("/")
    api_key = config.get("apiKey") or ""
    model = config.get("model") or "gpt-4o-mini"

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {api_key}",
                },
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "hello"}],
                    "max_tokens": 1,
                },
            )
        if response.is_success:
            payload = response.json()
            return TestResult(success=True, message="Connection successful.", model=payload.get("model", model))

        try:
            error_payload = response.json()
            message = error_payload.get("error", {}).get("message")
        except Exception:
            message = response.text
        return TestResult(success=False, message=message or f"HTTP {response.status_code}", model=model)
    except Exception as exc:
        return TestResult(success=False, message=str(exc), model=model)
