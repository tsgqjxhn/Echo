from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.entities import AssetRecord
from app.schemas.entities import AssetResponse
from app.services.utils import guess_mime, new_id, now_ms


class FileService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def save_upload(
        self,
        db: Session,
        file: UploadFile,
        *,
        asset_type: str,
        owner_type: str | None = None,
        owner_id: str | None = None,
        subdir: str | None = None,
    ) -> AssetResponse:
        folder = self.settings.storage_root / subdir if subdir else self.settings.uploads_root
        folder.mkdir(parents=True, exist_ok=True)

        asset_id = new_id("asset")
        suffix = Path(file.filename or "").suffix.lower()
        allowed_suffixes = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".wav", ".ogg", ".json", ".txt", ".md"}
        if suffix and suffix not in allowed_suffixes:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}")

        target = folder / f"{asset_id}{suffix}"
        written = 0
        max_bytes = self.settings.max_upload_bytes
        with target.open("wb") as output:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                written += len(chunk)
                if written > max_bytes:
                    target.unlink(missing_ok=True)
                    raise HTTPException(status_code=413, detail="File too large")
                output.write(chunk)

        relative_path = target.relative_to(self.settings.storage_root).as_posix()
        asset = AssetRecord(
            id=asset_id,
            asset_type=asset_type,
            storage_path=relative_path,
            original_name=file.filename,
            mime_type=file.content_type or guess_mime(target),
            size=target.stat().st_size,
            owner_type=owner_type,
            owner_id=owner_id,
            created_at=now_ms(),
        )
        db.add(asset)
        db.commit()
        db.refresh(asset)
        return self.to_response(asset)

    def to_response(self, asset: AssetRecord) -> AssetResponse:
        return AssetResponse(
            id=asset.id,
            assetType=asset.asset_type,
            storagePath=asset.storage_path,
            originalName=asset.original_name,
            mimeType=asset.mime_type,
            size=asset.size,
            ownerType=asset.owner_type,
            ownerId=asset.owner_id,
            createdAt=asset.created_at,
            url=f"{self.settings.public_base_url.rstrip('/')}{self.settings.media_url}/{asset.storage_path}",
        )
