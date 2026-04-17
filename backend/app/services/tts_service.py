from __future__ import annotations

import httpx
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.entities import AssetRecord
from app.schemas.entities import TTSSynthesizeRequest, TTSSynthesizeResponse
from app.services.file_service import FileService
from app.services.provider_config import resolve_runtime_api_config
from app.services.utils import new_id, now_ms


class TTSService:
    def __init__(self, settings: Settings, file_service: FileService) -> None:
        self.settings = settings
        self.file_service = file_service

    async def synthesize(self, db: Session, request: TTSSynthesizeRequest) -> TTSSynthesizeResponse:
        if self.settings.tts_provider == "disabled":
            raise HTTPException(status_code=503, detail="TTS provider is disabled.")

        runtime = resolve_runtime_api_config(db, self.settings)
        if runtime is None or not runtime.get("api_key"):
            raise HTTPException(status_code=503, detail="No backend API config is available for TTS.")

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{runtime['base_url']}/audio/speech",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {runtime['api_key']}",
                },
                json={
                    "model": self.settings.openai_tts_model,
                    "voice": request.voice or self.settings.openai_tts_voice,
                    "input": request.text,
                    "format": request.format,
                },
            )
        if not response.is_success:
            raise HTTPException(status_code=response.status_code, detail=response.text or "TTS request failed")

        filename = f"{new_id('tts')}.{request.format}"
        target = self.settings.audio_root / filename
        target.write_bytes(response.content)

        asset = AssetRecord(
            id=new_id("asset"),
            asset_type="audio",
            storage_path=target.relative_to(self.settings.storage_root).as_posix(),
            original_name=filename,
            mime_type="audio/mpeg",
            size=target.stat().st_size,
            owner_type="tts",
            owner_id=None,
            created_at=now_ms(),
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return TTSSynthesizeResponse(asset=self.file_service.to_response(asset))
