from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import AssetRecord
from app.schemas.entities import AssetResponse
from app.services.file_service import FileService


router = APIRouter(prefix="/api/files", tags=["files"])
settings = get_settings()
file_service = FileService(settings)


@router.post("/upload", response_model=AssetResponse)
def upload_file(
    file: UploadFile = File(...),
    asset_type: str = Form("file"),
    owner_type: str | None = Form(default=None),
    owner_id: str | None = Form(default=None),
    db: Session = Depends(get_db),
) -> AssetResponse:
    subdir = settings.audio_dir_name if asset_type == "audio" else None
    return file_service.save_upload(
        db,
        file,
        asset_type=asset_type,
        owner_type=owner_type,
        owner_id=owner_id,
        subdir=subdir,
    )


@router.get("/{asset_id}", response_model=AssetResponse)
def get_file(asset_id: str, db: Session = Depends(get_db)) -> AssetResponse:
    record = db.get(AssetRecord, asset_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Asset not found.")
    return file_service.to_response(record)
