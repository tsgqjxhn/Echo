from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import APIConfigRecord
from app.schemas.entities import APIConfigPayload, APIConfigResponse, APIConfigTestRequest, ModelListRequest, TestResult
from app.services.provider_config import sanitize_api_config, test_api_config, upsert_api_config


router = APIRouter(prefix="/api/api-configs", tags=["api-configs"])


@router.get("", response_model=list[APIConfigResponse])
def list_api_configs(db: Session = Depends(get_db)) -> list[APIConfigResponse]:
    items = list(db.scalars(select(APIConfigRecord).order_by(APIConfigRecord.updated_at.desc())))
    return [sanitize_api_config(item) for item in items]


@router.get("/{config_id}", response_model=APIConfigResponse)
def get_api_config(config_id: str, db: Session = Depends(get_db)) -> APIConfigResponse:
    record = db.get(APIConfigRecord, config_id)
    if record is None:
        raise HTTPException(status_code=404, detail="API config not found.")
    return sanitize_api_config(record)


@router.post("", response_model=APIConfigResponse)
def save_api_config(payload: APIConfigPayload, db: Session = Depends(get_db)) -> APIConfigResponse:
    record = upsert_api_config(db, payload.model_dump())
    return sanitize_api_config(record)


@router.delete("/{config_id}")
def delete_api_config(config_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    record = db.get(APIConfigRecord, config_id)
    if record is None:
        return {"ok": True}
    db.delete(record)
    db.commit()
    return {"ok": True}


def _filter_models_by_type(model_ids: list[str], config_type: str) -> list[str]:
    text_exclude = {"dall-e", "whisper", "tts", "video", "image", "embed", "moderation", "audio"}
    voice_include = {"tts", "whisper", "audio", "speech"}
    image_include = {"dall-e", "image", "stable", "sdxl", "flux"}
    video_include = {"video", "sora", "animate", "motion", "wan", "wan2"}

    result = []
    for mid in model_ids:
        low = mid.lower()
        if config_type == "text":
            if not any(kw in low for kw in text_exclude):
                result.append(mid)
        elif config_type == "voice":
            if any(kw in low for kw in voice_include):
                result.append(mid)
        elif config_type == "image":
            if any(kw in low for kw in image_include):
                result.append(mid)
        elif config_type == "video":
            if any(kw in low for kw in video_include):
                result.append(mid)
        else:
            result.append(mid)
    return result


@router.post("/models", response_model=list[str])
async def list_models(payload: ModelListRequest) -> list[str]:
    import urllib.request
    base = (payload.baseURL or "https://api.openai.com/v1").rstrip("/")
    headers = {"Authorization": f"Bearer {payload.apiKey}"}
    sys_proxies = urllib.request.getproxies()
    proxy_url = sys_proxies.get("https") or sys_proxies.get("http")
    try:
        async with httpx.AsyncClient(timeout=15, proxy=proxy_url) as client:
            resp = await client.get(f"{base}/models", headers=headers)
            resp.raise_for_status()
            data = resp.json()
            ids = [m["id"] for m in data.get("data", [])]
            return _filter_models_by_type(ids, payload.configType)
    except Exception as e:
        status = getattr(getattr(e, "response", None), "status_code", None)
        if status == 404:
            return []
        if status is not None:
            raise HTTPException(status_code=status, detail=str(e))
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/test", response_model=TestResult)
async def test_connection(payload: APIConfigTestRequest, db: Session = Depends(get_db)) -> TestResult:
    if payload.id:
        record = db.get(APIConfigRecord, payload.id)
        if record is None:
            raise HTTPException(status_code=404, detail="API config not found.")
        config = {
            "provider": record.provider,
            "apiKey": record.api_key,
            "baseURL": record.base_url,
            "model": record.model,
        }
    else:
        config = payload.model_dump(exclude_none=True)
    return await test_api_config(config)
