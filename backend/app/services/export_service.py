from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.entities import (
    APIConfigRecord,
    AssetRecord,
    CharacterRecord,
    ExportTaskRecord,
    GameSettingsRecord,
    GameStateRecord,
    MessageRecord,
    SessionRecord,
    UserProfileRecord,
    UserSettingRecord,
)
from app.schemas.entities import ExportTaskResponse, ImportSummary, OverviewResponse
from app.services.utils import new_id, now_ms


settings = get_settings()

DEFAULT_IMPORT_MODE = "free-dialogue"


def infer_character_mode(category: str) -> str:
    category_mode_map = {
        "剧情模式": "free-dialogue",
        "自由对话": "free-dialogue",
        "游戏剧情": "challenge-dialogue",
        "群聊互动": "group-chat",
        "群聊闯关": "group-challenge",
        "实用助手": "free-dialogue",
    }
    return category_mode_map.get(category, DEFAULT_IMPORT_MODE)


def _profile_to_dict(profile: UserProfileRecord | None) -> dict[str, Any] | None:
    if profile is None:
        return None
    return {
        "name": profile.name,
        "avatar": profile.avatar,
        "globalPrompt": profile.global_prompt,
        "corePrompt": profile.core_prompt,
    }


def _character_to_dict(item: CharacterRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "avatar": item.avatar,
        "background": item.background,
        "description": item.description,
        "greeting": item.greeting,
        "settings": item.settings,
        "isFavorite": item.is_favorite,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "mode": item.mode,
        "category": item.category,
        "subCategory": item.sub_category,
        "avatarTone": item.avatar_tone,
        "backgroundImage": item.background_image,
        "personality": item.personality,
        "behavior": item.behavior,
        "values": item.values,
        "members": item.members,
        "tags": item.tags,
        "sourceType": item.source_type,
        "sourceName": item.source_name,
    }


def _session_to_dict(item: SessionRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "characterId": item.character_id,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
        "messageCount": item.message_count,
        "title": item.title,
        "mode": item.mode,
    }


def _message_to_dict(item: MessageRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "sessionId": item.session_id,
        "role": item.role,
        "contentType": item.content_type,
        "content": item.content,
        "isLiked": item.is_liked,
        "timestamp": item.timestamp,
        "tokenUsage": item.token_usage,
        "assetId": item.asset_id,
    }


def _api_config_to_dict(item: APIConfigRecord, include_key: bool = False) -> dict[str, Any]:
    return {
        "id": item.id,
        "name": item.name,
        "provider": item.provider,
        "apiKey": item.api_key if include_key else "",
        "baseURL": item.base_url,
        "model": item.model,
        "isDefault": item.is_default,
        "source": item.source,
    }


def _game_state_to_dict(item: GameStateRecord) -> dict[str, Any]:
    return {
        "id": item.id,
        "gameType": item.game_type,
        "characterId": item.character_id,
        "sessionId": item.session_id,
        "stateData": item.state_data,
        "createdAt": item.created_at,
        "updatedAt": item.updated_at,
    }


def build_message_groups(messages: list[MessageRecord]) -> dict[str, list[dict[str, Any]]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for message in messages:
        groups.setdefault(message.session_id, []).append(_message_to_dict(message))
    return groups


def get_overview(db: Session) -> OverviewResponse:
    characters = list(db.scalars(select(CharacterRecord)))
    sessions = list(db.scalars(select(SessionRecord)))
    messages = list(db.scalars(select(MessageRecord)))
    configs = list(db.scalars(select(APIConfigRecord)))
    game_states = list(db.scalars(select(GameStateRecord)))
    return OverviewResponse(
        characterCount=len(characters),
        sessionCount=len(sessions),
        messageCount=len(messages),
        apiConfigCount=len(configs),
        gameStateCount=len(game_states),
    )


def build_standard_export(db: Session) -> dict[str, Any]:
    profile = db.get(UserProfileRecord, 1)
    characters = list(db.scalars(select(CharacterRecord)))
    sessions = list(db.scalars(select(SessionRecord)))
    messages = list(db.scalars(select(MessageRecord)))
    api_configs = list(db.scalars(select(APIConfigRecord)))
    game_settings = db.get(GameSettingsRecord, 1)
    game_states = list(db.scalars(select(GameStateRecord)))
    return {
        "version": "1.0",
        "exportedAt": now_ms(),
        "appVersion": settings.app_version,
        "user": _profile_to_dict(profile),
        "characters": [_character_to_dict(item) for item in characters],
        "sessions": [_session_to_dict(item) for item in sessions],
        "messages": build_message_groups(messages),
        "apiConfigs": [_api_config_to_dict(item, include_key=False) for item in api_configs],
        "gameSettings": {
            "globalEnabled": game_settings.global_enabled if game_settings else True,
            "sessionEnabled": game_settings.session_enabled or {} if game_settings else {},
            "globalSoundEnabled": getattr(game_settings, "global_sound_enabled", True) if game_settings else True,
            "globalBgmEnabled": getattr(game_settings, "global_bgm_enabled", True) if game_settings else True,
            "damageDisplayEnabled": getattr(game_settings, "damage_display_enabled", True) if game_settings else True,
            "gameNotificationsEnabled": getattr(game_settings, "game_notifications_enabled", True) if game_settings else True,
            "gameNotifications": getattr(game_settings, "game_notifications", []) if game_settings else [],
        },
        "gameStates": [_game_state_to_dict(item) for item in game_states],
    }


def build_backup_export(db: Session) -> dict[str, Any]:
    payload = build_standard_export(db)
    payload.update(
        {
            "version": "1.1",
            "exportType": "backup",
            "apiConfigs": [_api_config_to_dict(item, include_key=True) for item in db.scalars(select(APIConfigRecord))],
        }
    )
    return payload


def render_markdown_export(db: Session) -> str:
    payload = build_standard_export(db)
    output: list[str] = ["# 相 - 数据导出", ""]
    output.append(f"**导出时间**: {payload['exportedAt']}")
    output.append("")
    if payload["user"] and payload["user"].get("name"):
        output.append(f"**用户名**: {payload['user']['name']}")
        output.append("")
    output.append("---")
    output.append("")

    sessions_by_character: dict[str, list[dict[str, Any]]] = {}
    for session in payload["sessions"]:
        sessions_by_character.setdefault(session["characterId"], []).append(session)

    for character in payload["characters"]:
        output.append(f"## 角色：{character['name']}")
        output.append("")
        output.append(f"**描述**: {character['description']}")
        output.append("")
        if character.get("background"):
            output.append(f"**背景**: {character['background']}")
            output.append("")
        if character.get("settings"):
            output.append(f"**设定**: {character['settings']}")
            output.append("")
        for session in sessions_by_character.get(character["id"], []):
            for message in payload["messages"].get(session["id"], []):
                role = "用户" if message["role"] == "user" else "AI"
                output.append(f"**{role}**: {message['content']}")
                output.append("")
            output.append("---")
            output.append("")

    return "\n".join(output)


def save_export_file(
    db: Session,
    *,
    export_type: str,
    filename: str,
    content: bytes,
    mime_type: str,
) -> ExportTaskResponse:
    timestamp = now_ms()
    relative_path = Path(settings.export_dir_name) / filename
    absolute_path = settings.storage_root / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(content)

    asset = AssetRecord(
        id=new_id("asset"),
        asset_type="export",
        storage_path=relative_path.as_posix(),
        original_name=filename,
        mime_type=mime_type,
        size=len(content),
        owner_type="export",
        owner_id=None,
        created_at=timestamp,
    )
    db.add(asset)
    db.flush()

    task = ExportTaskRecord(
        id=new_id("task"),
        export_type=export_type,
        status="completed",
        filename=filename,
        asset_id=asset.id,
        detail={"size": len(content)},
        created_at=timestamp,
        updated_at=timestamp,
    )
    db.add(task)
    db.commit()

    return ExportTaskResponse(
        id=task.id,
        exportType=task.export_type,
        status=task.status,
        filename=task.filename,
        assetId=task.asset_id,
        downloadUrl=f"{settings.public_base_url.rstrip('/')}{settings.media_url}/{asset.storage_path}",
        detail=task.detail,
        createdAt=task.created_at,
        updatedAt=task.updated_at,
    )


def import_snapshot(db: Session, data: dict[str, Any], mode: str) -> ImportSummary:
    if mode == "replace":
        for model in (MessageRecord, SessionRecord, CharacterRecord, APIConfigRecord, GameStateRecord, UserSettingRecord):
            db.execute(delete(model))
        db.execute(delete(UserProfileRecord))
        db.execute(delete(GameSettingsRecord))
        db.commit()

    user = data.get("user") or {}
    if user:
        profile = db.get(UserProfileRecord, 1) or UserProfileRecord(id=1)
        profile.name = user.get("name")
        profile.avatar = user.get("avatar")
        profile.global_prompt = user.get("globalPrompt")
        profile.core_prompt = user.get("corePrompt")
        db.add(profile)

    for character in data.get("characters", []):
        db.merge(CharacterRecord(
            id=character["id"],
            name=character["name"],
            avatar=character.get("avatar"),
            background=character.get("background"),
            description=character.get("description", ""),
            greeting=character.get("greeting"),
            settings=character.get("settings", ""),
            is_favorite=character.get("isFavorite", False),
            created_at=character.get("createdAt", now_ms()),
            updated_at=character.get("updatedAt", now_ms()),
            mode=character.get("mode"),
            category=character.get("category"),
            sub_category=character.get("subCategory"),
            avatar_tone=character.get("avatarTone"),
            background_image=character.get("backgroundImage"),
            personality=character.get("personality"),
            behavior=character.get("behavior"),
            values=character.get("values"),
            members=character.get("members"),
            tags=character.get("tags"),
            source_type=character.get("sourceType"),
            source_name=character.get("sourceName"),
        ))

    for session in data.get("sessions", []):
        db.merge(SessionRecord(
            id=session["id"],
            character_id=session["characterId"],
            created_at=session.get("createdAt", now_ms()),
            updated_at=session.get("updatedAt", now_ms()),
            message_count=session.get("messageCount", 0),
            title=session.get("title"),
            mode=session.get("mode"),
        ))

    messages = data.get("messages", {})
    if isinstance(messages, list):
        grouped: dict[str, list[dict[str, Any]]] = {}
        for message in messages:
            grouped.setdefault(message["sessionId"], []).append(message)
        messages = grouped

    for session_id, items in messages.items():
        if mode == "replace":
            db.execute(delete(MessageRecord).where(MessageRecord.session_id == session_id))
        existing_ids = {item.id for item in db.scalars(select(MessageRecord).where(MessageRecord.session_id == session_id))}
        for message in items:
            if mode == "merge" and message["id"] in existing_ids:
                continue
            db.merge(MessageRecord(
                id=message["id"],
                session_id=message["sessionId"],
                role=message["role"],
                content_type=message.get("contentType", "text"),
                content=message.get("content", ""),
                is_liked=message.get("isLiked", False),
                timestamp=message.get("timestamp", now_ms()),
                token_usage=message.get("tokenUsage"),
                asset_id=message.get("assetId"),
            ))

    for config in data.get("apiConfigs", []):
        db.merge(APIConfigRecord(
            id=config["id"],
            name=config["name"],
            provider=config.get("provider", "openai-compatible"),
            api_key=config.get("apiKey", ""),
            base_url=config.get("baseURL"),
            model=config.get("model", settings.openai_model),
            is_default=config.get("isDefault", False),
            source=config.get("source", "storage"),
            created_at=now_ms(),
            updated_at=now_ms(),
        ))

    if data.get("gameSettings") is not None:
        payload = data["gameSettings"]
        game_settings = db.get(GameSettingsRecord, 1) or GameSettingsRecord(id=1)
        game_settings.global_enabled = payload.get("globalEnabled", True)
        game_settings.session_enabled = payload.get("sessionEnabled") or {}
        if hasattr(game_settings, "global_sound_enabled"):
            game_settings.global_sound_enabled = payload.get("globalSoundEnabled", True)
        if hasattr(game_settings, "global_bgm_enabled"):
            game_settings.global_bgm_enabled = payload.get("globalBgmEnabled", True)
        if hasattr(game_settings, "damage_display_enabled"):
            game_settings.damage_display_enabled = payload.get("damageDisplayEnabled", True)
        if hasattr(game_settings, "game_notifications_enabled"):
            game_settings.game_notifications_enabled = payload.get("gameNotificationsEnabled", True)
        if hasattr(game_settings, "game_notifications"):
            game_settings.game_notifications = payload.get("gameNotifications", [])
        db.add(game_settings)

    for state in data.get("gameStates", []):
        db.merge(GameStateRecord(
            id=state["id"],
            game_type=state.get("gameType", "escape"),
            character_id=state["characterId"],
            session_id=state["sessionId"],
            state_data=state.get("stateData", {}),
            created_at=state.get("createdAt", now_ms()),
            updated_at=state.get("updatedAt", now_ms()),
        ))

    db.commit()
    return ImportSummary(
        mode=mode,  # type: ignore[arg-type]
        characterCount=len(data.get("characters", [])),
        sessionCount=len(data.get("sessions", [])),
        messageCount=sum(len(items) for items in messages.values()),
        apiConfigCount=len([item for item in data.get("apiConfigs", []) if item.get("apiKey")]),
        gameStateCount=len(data.get("gameStates", [])),
    )


def create_character_from_document(
    filename: str,
    content: str,
    category: str,
    sub_category: str | None = None,
) -> dict[str, Any]:
    normalized = " ".join(content.split()).strip()
    description = (normalized[:180] or "由导入文档生成的角色设定。").strip()
    excerpt = (normalized[:520] or "原文档内容为空。").strip()
    safe_sub_category = (sub_category or "现实悬疑").strip() or "现实悬疑"
    return {
        "name": Path(filename).stem or "导入角色",
        "description": description,
        "settings": f"文档导入设定\n\n内容摘要：{excerpt}",
        "mode": infer_character_mode(category),
        "category": category,
        "subCategory": safe_sub_category,
    }
