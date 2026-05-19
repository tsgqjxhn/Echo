from __future__ import annotations

import httpx
import io
import json
import re
import zipfile
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.models.entities import AssetRecord, CharacterRecord, ExportTaskRecord, MessageRecord, SessionRecord
from app.schemas.entities import (
    CharacterResponse,
    ChatContextRequest,
    ChatMessage,
    ExportTaskResponse,
    ImportSummary,
    OverviewResponse,
    StoryResponse,
)
from app.services.export_service import (
    build_backup_export,
    build_jsonl_export,
    build_sillytavern_png,
    build_standard_export,
    create_character_from_document,
    get_overview,
    import_snapshot,
    infer_character_mode,
    render_markdown_export,
    save_export_file,
)
from app.services.llm_service import LLMService
from app.services.story_service import upsert_story_from_markdown
from app.services.utils import new_id, now_ms


router = APIRouter(prefix="/api", tags=["import-export"])
settings = get_settings()
llm_service = LLMService(settings)
DEFAULT_CATEGORY = "剧情模式"
DEFAULT_SUB_CATEGORY = "现实悬疑"


def _fallback_parse_character_text(text: str, filename: str) -> dict[str, Any]:
    """当 LLM 不可用时，使用简单规则解析文本中的角色信息。"""
    lines = text.splitlines()
    fields: dict[str, str] = {}
    current_key: str | None = None
    current_value: list[str] = []

    # 支持的多语言标签映射
    label_map: dict[str, str] = {
        "name": "name",
        "名称": "name",
        "character": "name",
        "description": "description",
        "描述": "description",
        "personality": "personality",
        "性格": "personality",
        "个性": "personality",
        "scenario": "scenario",
        "场景": "scenario",
        "背景": "scenario",
        "greeting": "greeting",
        "问候": "greeting",
        "开场白": "greeting",
        "example dialogue": "exampleDialogue",
        "示例对话": "exampleDialogue",
        "对话示例": "exampleDialogue",
        "settings": "settings",
        "设定": "settings",
        "first message": "greeting",
    }

    def flush() -> None:
        nonlocal current_key, current_value
        if current_key and current_value:
            fields[current_key] = "\n".join(current_value).strip()
        current_key = None
        current_value = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
        # 匹配 "Label: value" 或 "标签：值"
        match = re.match(r"^([\w\s\u4e00-\u9fff]+)[\s]*[:：][\s]*(.*)$", line)
        if match:
            flush()
            label = match.group(1).strip().lower()
            mapped = label_map.get(label)
            if mapped:
                current_key = mapped
                current_value = [match.group(2).strip()] if match.group(2).strip() else []
            else:
                current_key = None
        elif current_key:
            current_value.append(line)

    flush()

    name = fields.get("name") or fields.get("description", "").split("\n")[0][:40] or "导入角色"
    description = fields.get("description") or fields.get("personality", "") or ""
    if not description:
        description = (text[:280] or "由导入文档生成的角色设定。").strip()

    return {
        "name": name,
        "description": description,
        "personality": fields.get("personality", ""),
        "scenario": fields.get("scenario", ""),
        "greeting": fields.get("greeting", ""),
        "exampleDialogue": fields.get("exampleDialogue", ""),
        "settings": fields.get("settings", ""),
    }


async def _llm_parse_character_text(text: str, filename: str) -> dict[str, Any] | None:
    """尝试使用 LLM 从文本中解析角色信息。"""
    try:
        truncated = text[:4000] if len(text) > 4000 else text
        system_prompt = (
            "你是一个角色信息提取助手。请从以下文本中提取角色设定信息，"
            "并以纯 JSON 格式返回（不要包含 markdown 代码块标记）。"
            "必须包含以下字段：name, description, personality, scenario, greeting, exampleDialogue, settings。"
            "如果某字段在文本中找不到，使用空字符串。只返回 JSON，不要其他说明。"
        )
        request = ChatContextRequest(
            systemPrompt=system_prompt,
            messages=[ChatMessage(role="user", content=truncated)],
        )
        response = await llm_service.chat(None, request)
        content = response.content.strip()
        # 移除可能的 markdown 代码块
        if content.startswith("```"):
            content = re.sub(r"^```(?:json)?\s*", "", content)
            content = re.sub(r"\s*```$", "", content)
        parsed = json.loads(content)
        if isinstance(parsed, dict) and parsed.get("name"):
            return {
                "name": str(parsed.get("name", "")),
                "description": str(parsed.get("description", "")),
                "personality": str(parsed.get("personality", "")),
                "scenario": str(parsed.get("scenario", "")),
                "greeting": str(parsed.get("greeting", "")),
                "exampleDialogue": str(parsed.get("exampleDialogue", "")),
                "settings": str(parsed.get("settings", "")),
            }
    except Exception:
        pass
    return None


async def _parse_character_text(text: str, filename: str) -> dict[str, Any]:
    """优先使用 LLM 解析，失败后回退到简单规则。"""
    llm_result = await _llm_parse_character_text(text, filename)
    if llm_result:
        return llm_result
    return _fallback_parse_character_text(text, filename)


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
def export_standard(db: Session = Depends(get_db)) -> ExportTaskResponse:
    content = json.dumps(build_standard_export(db), ensure_ascii=False, indent=2).encode("utf-8")
    filename = f"xiang-export-{now_ms()}.json"
    return save_export_file(db, export_type="standard", filename=filename, content=content, mime_type="application/json")


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


@router.post("/export/character/png")
async def export_character_png(character_id: str = Query(...), db: Session = Depends(get_db)) -> StreamingResponse:
    record = db.get(CharacterRecord, character_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Character not found.")

    character_data = {
        "name": record.name,
        "description": record.description or "",
        "personality": record.personality or "",
        "scenario": record.background or "",
        "first_mes": record.greeting or "",
        "mes_example": "",
        "creatorcomment": "",
        "tags": record.tags or [],
        "talkativeness": "0.5",
        "fav": False,
        "spec": "chara_card_v2",
        "spec_version": "2.0",
        "data": {
            "name": record.name,
            "description": record.description or "",
            "personality": record.personality or "",
            "scenario": record.background or "",
            "first_mes": record.greeting or "",
            "mes_example": "",
            "creatorcomment": "",
            "tags": record.tags or [],
            "talkativeness": "0.5",
            "fav": False,
        },
    }

    avatar_bytes: bytes | None = None
    if record.avatar:
        try:
            avatar_url = record.avatar
            if avatar_url.startswith("/"):
                avatar_url = f"{settings.public_base_url.rstrip('/')}{avatar_url}"
            async with httpx.AsyncClient() as client:
                resp = await client.get(avatar_url, timeout=10)
            if resp.status_code == 200:
                avatar_bytes = resp.content
        except Exception:
            avatar_bytes = None

    png_bytes = build_sillytavern_png(character_data, avatar_bytes)
    safe_name = re.sub(r"[^\w\-. ]", "_", record.name) or "character"
    filename = f"{safe_name}.png"
    return StreamingResponse(
        io.BytesIO(png_bytes),
        media_type="image/png",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/characters/png")
async def export_characters_png(db: Session = Depends(get_db)) -> StreamingResponse:
    characters = list(db.scalars(select(CharacterRecord)))
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for record in characters:
            character_data = {
                "name": record.name,
                "description": record.description or "",
                "personality": record.personality or "",
                "scenario": record.background or "",
                "first_mes": record.greeting or "",
                "mes_example": "",
                "creatorcomment": "",
                "tags": record.tags or [],
                "talkativeness": "0.5",
                "fav": False,
                "spec": "chara_card_v2",
                "spec_version": "2.0",
                "data": {
                    "name": record.name,
                    "description": record.description or "",
                    "personality": record.personality or "",
                    "scenario": record.background or "",
                    "first_mes": record.greeting or "",
                    "mes_example": "",
                    "creatorcomment": "",
                    "tags": record.tags or [],
                    "talkativeness": "0.5",
                    "fav": False,
                },
            }
            avatar_bytes: bytes | None = None
            if record.avatar:
                try:
                    avatar_url = record.avatar
                    if avatar_url.startswith("/"):
                        avatar_url = f"{settings.public_base_url.rstrip('/')}{avatar_url}"
                    async with httpx.AsyncClient() as client:
                        resp = await client.get(avatar_url, timeout=10)
                    if resp.status_code == 200:
                        avatar_bytes = resp.content
                except Exception:
                    avatar_bytes = None
            png_bytes = build_sillytavern_png(character_data, avatar_bytes)
            safe_name = re.sub(r"[^\w\-. ]", "_", record.name) or "character"
            zf.writestr(f"{safe_name}.png", png_bytes)
    zip_buffer.seek(0)
    filename = f"xiang-characters-{now_ms()}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/characters/json")
def export_characters_json(db: Session = Depends(get_db)) -> StreamingResponse:
    characters = list(db.scalars(select(CharacterRecord)))
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for record in characters:
            character_data = {
                "name": record.name,
                "description": record.description or "",
                "personality": record.personality or "",
                "scenario": record.background or "",
                "first_mes": record.greeting or "",
                "mes_example": "",
                "creatorcomment": "",
                "tags": record.tags or [],
                "talkativeness": "0.5",
                "fav": False,
                "spec": "chara_card_v2",
                "spec_version": "2.0",
                "data": {
                    "name": record.name,
                    "description": record.description or "",
                    "personality": record.personality or "",
                    "scenario": record.background or "",
                    "first_mes": record.greeting or "",
                    "mes_example": "",
                    "creatorcomment": "",
                    "tags": record.tags or [],
                    "talkativeness": "0.5",
                    "fav": False,
                },
            }
            safe_name = re.sub(r"[^\w\-. ]", "_", record.name) or "character"
            json_bytes = json.dumps(character_data, ensure_ascii=False, indent=2).encode("utf-8")
            zf.writestr(f"{safe_name}.json", json_bytes)
    zip_buffer.seek(0)
    filename = f"xiang-characters-json-{now_ms()}.zip"
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/export/session/jsonl")
def export_session_jsonl(session_id: str = Query(...), db: Session = Depends(get_db)) -> StreamingResponse:
    session = db.get(SessionRecord, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    character = db.get(CharacterRecord, session.character_id)
    messages = list(db.scalars(select(MessageRecord).where(MessageRecord.session_id == session_id).order_by(MessageRecord.timestamp)))

    session_data = {
        "character_name": character.name if character else "",
        "character_version": "1.0",
        "creator": "",
        "create_date": str(session.created_at),
        "messages": [
            {
                "name": character.name if character and msg.role != "user" else "User",
                "content": msg.content,
                "role": msg.role,
            }
            for msg in messages
        ],
    }
    jsonl_content = build_jsonl_export(session_data)
    safe_name = re.sub(r"[^\w\-. ]", "_", character.name if character else "session")
    filename = f"{safe_name}-{session_id}.jsonl"
    return StreamingResponse(
        io.BytesIO(jsonl_content.encode("utf-8")),
        media_type="text/plain; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
    if mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="mode must be merge or replace")
    raw = await file.read()
    settings = get_settings()
    if len(raw) > settings.max_import_json_bytes:
        raise HTTPException(status_code=413, detail="Import file too large")
    payload = json.loads(raw.decode("utf-8"))
    return import_snapshot(db, payload, mode)


@router.post("/import/character", response_model=CharacterResponse)
async def import_character(
    request: UploadFile = File(...),
    category: str = Form(default=DEFAULT_CATEGORY),
    subCategory: str = Form(default=DEFAULT_SUB_CATEGORY),
    db: Session = Depends(get_db),
) -> CharacterResponse:
    """接收 multipart 文件上传导入角色。txt/md/json 均通过此路由处理。"""
    text_content = (await request.read()).decode("utf-8", errors="ignore")
    source_name = request.filename or "导入文档.txt"
    return await _create_character_from_text(db, text_content, source_name, category, subCategory)


@router.post("/import/character-text", response_model=CharacterResponse)
async def import_character_text(
    payload: dict[str, Any],
    db: Session = Depends(get_db),
) -> CharacterResponse:
    """接收 JSON body { content, fileName?, category?, subCategory? } 导入角色。"""
    text_content = payload.get("content", "")
    source_name = payload.get("fileName") or "导入文档.txt"
    category = payload.get("category") or DEFAULT_CATEGORY
    subCategory = payload.get("subCategory") or DEFAULT_SUB_CATEGORY
    return await _create_character_from_text(db, text_content, source_name, category, subCategory)


async def _create_character_from_text(
    db: Session,
    text_content: str,
    source_name: str,
    category: str,
    subCategory: str,
) -> CharacterResponse:
    # 如果是 .json 文件/内容，尝试直接解析为 Character Card
    if source_name.lower().endswith(".json"):
        try:
            raw = json.loads(text_content)
            if isinstance(raw, dict) and (raw.get("name") or (raw.get("data") and isinstance(raw["data"], dict) and raw["data"].get("name"))):
                data = raw.get("data", raw) if isinstance(raw.get("data"), dict) else raw
                timestamp = now_ms()
                record = CharacterRecord(
                    id=new_id("character"),
                    name=str(data.get("name", "导入角色")),
                    avatar=None,
                    background=f"{category} / {subCategory}",
                    description=str(data.get("description", "")),
                    greeting=str(data.get("first_mes", data.get("greeting", ""))),
                    settings="",
                    is_favorite=False,
                    created_at=timestamp,
                    updated_at=timestamp,
                    mode=infer_character_mode(category),
                    category=category,
                    sub_category=subCategory,
                    avatar_tone="silver",
                    background_image=None,
                    personality=str(data.get("personality", "")),
                    behavior="优先围绕导入内容继续展开",
                    values="保留原文档中的关键信息",
                    members=[],
                    tags=[category, subCategory, "文档导入"],
                    source_type="document-import",
                    source_name=source_name,
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
                    isLiked=False,
                    isFriend=False,
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
        except Exception:
            pass

    # 普通文本（txt/md）使用智能解析
    parsed = await _parse_character_text(text_content, source_name)
    timestamp = now_ms()
    record = CharacterRecord(
        id=new_id("character"),
        name=parsed["name"] or "导入角色",
        avatar=None,
        background=f"{category} / {subCategory}",
        description=parsed["description"] or (text_content[:280] or "由导入文档生成的角色设定。").strip(),
        greeting=parsed["greeting"] or f"我已经读完《{source_name}》里的内容，你想从哪里开始聊？",
        settings=parsed["settings"] or "",
        is_favorite=False,
        created_at=timestamp,
        updated_at=timestamp,
        mode=infer_character_mode(category),
        category=category,
        sub_category=subCategory,
        avatar_tone="silver",
        background_image=None,
        personality=parsed["personality"] or "善于根据资料展开交流",
        behavior="优先围绕导入内容继续展开",
        values="保留原文档中的关键信息",
        members=[],
        tags=[category, subCategory, "文档导入"],
        source_type="document-import",
        source_name=source_name,
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
        isLiked=False,
        isFriend=False,
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
