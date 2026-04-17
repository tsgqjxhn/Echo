from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import AssetRecord, CharacterRecord, ExportTaskRecord
from app.schemas.entities import CharacterResponse, ExportTaskResponse, ImportSummary, OverviewResponse, StoryResponse
from app.services.export_service import (
    build_backup_export,
    build_standard_export,
    create_character_from_document,
    get_overview,
    import_snapshot,
    render_markdown_export,
    save_export_file,
)
from app.services.story_service import upsert_story_from_markdown
from app.services.utils import new_id, now_ms


router = APIRouter(prefix="/api", tags=["import-export"])
settings = get_settings()


def _task_response(task: ExportTaskRecord, asset: AssetRecord | None) -> ExportTaskResponse:
    download_url = None
    if asset is not None:
        download_url = f"{settings.public_base_url.rstrip('/')}{settings.media_url}/{asset.storage_path}"

    return ExportTaskResponse(
        id=task.id,
        exportType=task.export_type,
        status=task.status,
        filename=task.filename,
        assetId=task.asset_id,
        downloadUrl=download_url,
        detail=task.detail,
        createdAt=task.created_at,
        updatedAt=task.updated_at,
    )


@router.get("/overview", response_model=OverviewResponse)
def overview(db: Session = Depends(get_db)) -> OverviewResponse:
    return get_overview(db)


@router.post("/export/standard", response_model=ExportTaskResponse)
def export_standard(format: str = Query(default="json"), db: Session = Depends(get_db)) -> ExportTaskResponse:
    if format == "md":
        content = render_markdown_export(db).encode("utf-8")
        filename = f"xiang-export-{now_ms()}.md"
        mime_type = "text/markdown"
    else:
        content = json.dumps(build_standard_export(db), ensure_ascii=False, indent=2).encode("utf-8")
        filename = f"xiang-export-{now_ms()}.json"
        mime_type = "application/json"
    return save_export_file(db, export_type="standard", filename=filename, content=content, mime_type=mime_type)


@router.post("/export/full", response_model=ExportTaskResponse)
def export_full(db: Session = Depends(get_db)) -> ExportTaskResponse:
    content = json.dumps(build_backup_export(db), ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"xiang-backup-{now_ms()}.json"
    return save_export_file(db, export_type="backup", filename=filename, content=content, mime_type="application/json")


def _build_session_export(session_id: str, db: Session) -> ExportTaskResponse:
    payload = build_standard_export(db)
    payload["sessions"] = [item for item in payload["sessions"] if item["id"] == session_id]
    payload["messages"] = {session_id: payload["messages"].get(session_id, [])}
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"xiang-session-{session_id}-{now_ms()}.json"
    return save_export_file(db, export_type="session", filename=filename, content=content, mime_type="application/json")


@router.post("/export/session", response_model=ExportTaskResponse)
def export_session(session_id: str = Query(...), db: Session = Depends(get_db)) -> ExportTaskResponse:
    return _build_session_export(session_id, db)


@router.post("/export/session/{session_id}", response_model=ExportTaskResponse)
def export_session_by_path(session_id: str, db: Session = Depends(get_db)) -> ExportTaskResponse:
    return _build_session_export(session_id, db)


def _build_character_export(character_id: str, db: Session) -> ExportTaskResponse:
    payload = build_standard_export(db)
    payload["characters"] = [item for item in payload["characters"] if item["id"] == character_id]
    allowed_session_ids = {item["id"] for item in payload["sessions"] if item["characterId"] == character_id}
    payload["sessions"] = [item for item in payload["sessions"] if item["id"] in allowed_session_ids]
    payload["messages"] = {key: value for key, value in payload["messages"].items() if key in allowed_session_ids}
    content = json.dumps(payload, ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"xiang-character-{character_id}-{now_ms()}.json"
    return save_export_file(db, export_type="character", filename=filename, content=content, mime_type="application/json")


@router.post("/export/character", response_model=ExportTaskResponse)
def export_character(character_id: str = Query(...), db: Session = Depends(get_db)) -> ExportTaskResponse:
    return _build_character_export(character_id, db)


@router.post("/export/character/{character_id}", response_model=ExportTaskResponse)
def export_character_by_path(character_id: str, db: Session = Depends(get_db)) -> ExportTaskResponse:
    return _build_character_export(character_id, db)


@router.get("/export/tasks/{task_id}", response_model=ExportTaskResponse)
def get_export_task(task_id: str, db: Session = Depends(get_db)) -> ExportTaskResponse:
    task = db.get(ExportTaskRecord, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Export task not found.")
    asset = db.get(AssetRecord, task.asset_id) if task.asset_id else None
    return _task_response(task, asset)


@router.post("/import/full", response_model=ImportSummary)
async def import_full(
    file: UploadFile = File(...),
    mode: str = Query(default="merge"),
    db: Session = Depends(get_db),
) -> ImportSummary:
    payload = json.loads((await file.read()).decode("utf-8"))
    return import_snapshot(db, payload, mode)


@router.post("/import/character", response_model=CharacterResponse)
async def import_character(
    file: UploadFile = File(...),
    category: str = Form(default="剧情"),
    db: Session = Depends(get_db),
) -> CharacterResponse:
    content = (await file.read()).decode("utf-8", errors="ignore")
    parsed = create_character_from_document(file.filename or "导入角色.txt", content, category)
    timestamp = now_ms()
    record = CharacterRecord(
        id=new_id("character"),
        name=parsed["name"],
        avatar=None,
        background=f"{category} / 导入文档",
        description=parsed["description"],
        greeting=f"我已经读完《{file.filename or '导入文档'}》里的内容，你想从哪里开始聊？",
        settings=parsed["settings"],
        is_favorite=False,
        created_at=timestamp,
        updated_at=timestamp,
        mode="free-dialogue",
        category=category,
        sub_category="导入文档",
        avatar_tone="silver",
        background_image=None,
        personality="善于根据资料展开交流",
        behavior="优先围绕导入内容继续展开",
        values="保留原文档中的关键信息",
        members=[],
        tags=[category, "导入文档"],
        source_type="document-import",
        source_name=file.filename,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return CharacterResponse(
        id=record.id,
        name=record.name,
        avatar=record.avatar,
        background=record.background,
        description=record.description,
        greeting=record.greeting,
        settings=record.settings,
        isFavorite=record.is_favorite,
        createdAt=record.created_at,
        updatedAt=record.updated_at,
        mode=record.mode,
        category=record.category,
        subCategory=record.sub_category,
        avatarTone=record.avatar_tone,
        backgroundImage=record.background_image,
        personality=record.personality,
        behavior=record.behavior,
        values=record.values,
        members=record.members,
        tags=record.tags,
        sourceType=record.source_type,
        sourceName=record.source_name,
    )


@router.post("/import/story", response_model=StoryResponse)
async def import_story(file: UploadFile = File(...), db: Session = Depends(get_db)) -> StoryResponse:
    content = (await file.read()).decode("utf-8")
    return upsert_story_from_markdown(db, content, source_name=file.filename or "story.md")
