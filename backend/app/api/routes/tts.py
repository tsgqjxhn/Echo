from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import AssetRecord
from app.schemas.entities import AssetResponse, TTSSynthesizeRequest, TTSSynthesizeResponse
from app.services.file_service import FileService
from app.services.tts_service import TTSService


router = APIRouter(prefix="/api/tts", tags=["tts"])
tts_service = TTSService(get_settings(), FileService(get_settings()))


@router.post("/synthesize", response_model=TTSSynthesizeResponse)
async def synthesize(payload: TTSSynthesizeRequest, db: Session = Depends(get_db)) -> TTSSynthesizeResponse:
    return await tts_service.synthesize(db, payload)


@router.get("/{asset_id}", response_model=AssetResponse)
def get_tts_asset(asset_id: str, db: Session = Depends(get_db)) -> AssetResponse:
    asset = db.get(AssetRecord, asset_id)
    if asset is None or asset.asset_type != "audio":
        raise HTTPException(status_code=404, detail="TTS asset not found.")
    return tts_service.file_service.to_response(asset)
