from __future__ import annotations

import httpx
from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.schemas.entities import STTTranscribeResponse
from app.services.provider_config import resolve_runtime_api_config


class STTService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    async def transcribe(self, db: Session, file: UploadFile, language: str | None = None) -> STTTranscribeResponse:
        if self.settings.stt_provider == "disabled":
            raise HTTPException(status_code=503, detail="STT provider is disabled.")

        runtime = resolve_runtime_api_config(db, self.settings)
        if runtime is None or not runtime.get("api_key"):
            raise HTTPException(status_code=503, detail="No backend API config is available for STT.")

        file.file.seek(0)
        files = {
            "file": (
                file.filename or "audio.webm",
                file.file,
                file.content_type or "application/octet-stream",
            )
        }
        data = {"model": self.settings.openai_stt_model}
        if language:
            data["language"] = language

        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                f"{runtime['base_url']}/audio/transcriptions",
                headers={"Authorization": f"Bearer {runtime['api_key']}"},
                data=data,
                files=files,
            )
        if not response.is_success:
            raise HTTPException(status_code=response.status_code, detail=response.text or "STT request failed")

        payload = response.json()
        return STTTranscribeResponse(text=payload.get("text", "").strip(), language=language, confidence=None)
