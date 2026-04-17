from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import APIConfigRecord
from app.schemas.entities import APIConfigPayload, APIConfigResponse, APIConfigTestRequest, TestResult
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
