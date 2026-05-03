from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import CharacterRecord
from app.schemas.entities import CharacterPayload, CharacterResponse


router = APIRouter(prefix="/api/characters", tags=["characters"])


def _to_response(record: CharacterRecord) -> CharacterResponse:
    return CharacterResponse(
        id=record.id,
        name=record.name,
        avatar=record.avatar,
        background=record.background,
        description=record.description,
        greeting=record.greeting,
        settings=record.settings,
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
        sceneTime=record.scene_time,
        isLiked=record.is_liked,
        isFriend=record.is_friend,
        exampleDialogue=record.example_dialogue,
        persona=record.persona,
        scenario=record.scenario,
        depthPrompt=record.depth_prompt,
        lorebook=record.lorebook,
        alternateGreetings=record.alternate_greetings,
        chatBackground=record.chat_background,
        globalBackground=record.global_background,
        switchAnimation=record.switch_animation,
        emotionAnimations=record.emotion_animations,
        gameData=record.game_data,
        worldBooks=record.world_books,
    )


def _get_character_or_404(character_id: str, db: Session) -> CharacterRecord:
    record = db.get(CharacterRecord, character_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    return record


def _toggle_character_flag(
    character_id: str,
    db: Session,
    *,
    field_name: str,
) -> CharacterResponse:
    record = _get_character_or_404(character_id, db)
    current_value = bool(getattr(record, field_name))
    setattr(record, field_name, not current_value)
    record.updated_at = int(time.time() * 1000)
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.get("", response_model=list[CharacterResponse])
def list_characters(
    keyword: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[CharacterResponse]:
    items = list(db.scalars(select(CharacterRecord)))
    if keyword:
        term = keyword.lower().strip()
        items = [item for item in items if term in item.name.lower() or term in item.description.lower()]
    items.sort(key=lambda item: item.updated_at, reverse=True)
    return [_to_response(item) for item in items]


@router.get("/{character_id}", response_model=CharacterResponse)
def get_character(character_id: str, db: Session = Depends(get_db)) -> CharacterResponse:
    record = db.get(CharacterRecord, character_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    return _to_response(record)


@router.post("", response_model=CharacterResponse)
def save_character(payload: CharacterPayload, db: Session = Depends(get_db)) -> CharacterResponse:
    record = db.get(CharacterRecord, payload.id)
    if record is None:
        record = CharacterRecord(
            id=payload.id,
            name=payload.name,
            avatar=payload.avatar,
            background=payload.background,
            description=payload.description,
            greeting=payload.greeting,
            settings=payload.settings,
            created_at=payload.createdAt,
            updated_at=payload.updatedAt,
            mode=payload.mode,
            category=payload.category,
            sub_category=payload.subCategory,
            avatar_tone=payload.avatarTone,
            background_image=payload.backgroundImage,
            personality=payload.personality,
            behavior=payload.behavior,
            values=payload.values,
            members=payload.members,
            tags=payload.tags,
            source_type=payload.sourceType,
            source_name=payload.sourceName,
            scene_time=payload.sceneTime,
            is_liked=payload.isLiked,
            is_friend=payload.isFriend,
            example_dialogue=payload.exampleDialogue,
            persona=payload.persona,
            scenario=payload.scenario,
            depth_prompt=payload.depthPrompt,
            lorebook=payload.lorebook,
            alternate_greetings=payload.alternateGreetings,
            chat_background=payload.chatBackground,
            global_background=payload.globalBackground,
            switch_animation=payload.switchAnimation,
            emotion_animations=payload.emotionAnimations,
            game_data=payload.gameData,
            world_books=payload.worldBooks,
        )
        db.add(record)
    else:
        record.name = payload.name
        record.avatar = payload.avatar
        record.background = payload.background
        record.description = payload.description
        record.greeting = payload.greeting
        record.settings = payload.settings
        record.created_at = payload.createdAt
        record.updated_at = payload.updatedAt
        record.mode = payload.mode
        record.category = payload.category
        record.sub_category = payload.subCategory
        record.avatar_tone = payload.avatarTone
        record.background_image = payload.backgroundImage
        record.personality = payload.personality
        record.behavior = payload.behavior
        record.values = payload.values
        record.members = payload.members
        record.tags = payload.tags
        record.source_type = payload.sourceType
        record.source_name = payload.sourceName
        record.scene_time = payload.sceneTime
        record.is_liked = payload.isLiked
        record.is_friend = payload.isFriend
        record.example_dialogue = payload.exampleDialogue
        record.persona = payload.persona
        record.scenario = payload.scenario
        record.depth_prompt = payload.depthPrompt
        record.lorebook = payload.lorebook
        record.alternate_greetings = payload.alternateGreetings
        record.chat_background = payload.chatBackground
        record.global_background = payload.globalBackground
        record.switch_animation = payload.switchAnimation
        record.emotion_animations = payload.emotionAnimations
        record.game_data = payload.gameData
        record.world_books = payload.worldBooks
    db.commit()
    db.refresh(record)
    return _to_response(record)


@router.put("/{character_id}", response_model=CharacterResponse)
def update_character(character_id: str, payload: CharacterPayload, db: Session = Depends(get_db)) -> CharacterResponse:
    if character_id != payload.id:
        raise HTTPException(status_code=400, detail="Character id mismatch.")
    return save_character(payload, db)


@router.delete("/{character_id}")
def delete_character(character_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    record = db.get(CharacterRecord, character_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Character not found.")
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.post("/{character_id}/like", response_model=CharacterResponse)
def toggle_character_like(character_id: str, db: Session = Depends(get_db)) -> CharacterResponse:
    return _toggle_character_flag(character_id, db, field_name="is_liked")


@router.post("/{character_id}/friend", response_model=CharacterResponse)
def toggle_character_friend(character_id: str, db: Session = Depends(get_db)) -> CharacterResponse:
    return _toggle_character_flag(character_id, db, field_name="is_friend")
