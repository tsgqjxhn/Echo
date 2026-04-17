from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.entities import STTTranscribeResponse
from app.services.stt_service import STTService


router = APIRouter(prefix="/api/stt", tags=["stt"])
stt_service = STTService(get_settings())


@router.post("/transcribe", response_model=STTTranscribeResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> STTTranscribeResponse:
    return await stt_service.transcribe(db, file, language)
