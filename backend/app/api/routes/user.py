from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import (
    APIConfigRecord,
    CharacterRecord,
    GameSettingsRecord,
    GameStateRecord,
    MessageRecord,
    SessionRecord,
    UserProfileRecord,
    UserSettingRecord,
)
from app.schemas.entities import UserInfo, UserSetting


router = APIRouter(prefix="/api/user", tags=["user"])


@router.get("", response_model=UserInfo)
def get_user(db: Session = Depends(get_db)) -> UserInfo:
    profile = db.get(UserProfileRecord, 1)
    if profile is None:
        return UserInfo()
    return UserInfo(
        name=profile.name,
        avatar=profile.avatar,
        globalPrompt=profile.global_prompt,
    )


@router.put("", response_model=UserInfo)
def save_user(payload: UserInfo, db: Session = Depends(get_db)) -> UserInfo:
    profile = db.get(UserProfileRecord, 1) or UserProfileRecord(id=1)
    profile.name = payload.name
    profile.avatar = payload.avatar
    profile.global_prompt = payload.globalPrompt
    db.add(profile)
    db.commit()
    return payload


@router.get("/settings/{key}", response_model=UserSetting | None)
def get_user_setting(key: str, db: Session = Depends(get_db)) -> UserSetting | None:
    record = db.get(UserSettingRecord, key)
    if record is None:
        return None
    return UserSetting(key=record.key, value=record.value)


@router.put("/settings/{key}", response_model=UserSetting)
def save_user_setting(key: str, payload: UserSetting, db: Session = Depends(get_db)) -> UserSetting:
    record = db.get(UserSettingRecord, key) or UserSettingRecord(key=key, value=payload.value)
    record.value = payload.value
    db.add(record)
    db.commit()
    return UserSetting(key=key, value=record.value)


@router.post("/clear")
def clear_storage(db: Session = Depends(get_db)) -> dict[str, bool]:
    for model in (MessageRecord, SessionRecord, CharacterRecord, APIConfigRecord, GameStateRecord, UserSettingRecord):
        db.execute(delete(model))
    db.execute(delete(UserProfileRecord))
    db.execute(delete(GameSettingsRecord))
    db.commit()
    return {"ok": True}
