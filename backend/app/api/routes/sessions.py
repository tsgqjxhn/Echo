from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import GameSettingsRecord, GameStateRecord, MessageRecord, SessionRecord
from app.schemas.entities import (
    GameSettings,
    GameStatePayload,
    GameStateResponse,
    MessagePayload,
    MessageResponse,
    ReplaceMessagesPayload,
    SessionPayload,
    SessionResponse,
)


router = APIRouter(tags=["sessions"])


def _session_response(record: SessionRecord) -> SessionResponse:
    return SessionResponse(
        id=record.id,
        characterId=record.character_id,
        createdAt=record.created_at,
        updatedAt=record.updated_at,
        messageCount=record.message_count,
        title=record.title,
        mode=record.mode,
    )


def _message_response(record: MessageRecord) -> MessageResponse:
    return MessageResponse(
        id=record.id,
        sessionId=record.session_id,
        role=record.role,  # type: ignore[arg-type]
        contentType=record.content_type,  # type: ignore[arg-type]
        content=record.content,
        isLiked=record.is_liked,
        timestamp=record.timestamp,
        tokenUsage=record.token_usage,
        assetId=record.asset_id,
    )


@router.get("/api/sessions", response_model=list[SessionResponse])
def list_sessions(character_id: str | None = Query(default=None), db: Session = Depends(get_db)) -> list[SessionResponse]:
    items = list(db.scalars(select(SessionRecord)))
    if character_id:
        items = [item for item in items if item.character_id == character_id]
    items.sort(key=lambda item: item.updated_at, reverse=True)
    return [_session_response(item) for item in items]


@router.get("/api/sessions/{session_id}", response_model=SessionResponse)
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionResponse:
    record = db.get(SessionRecord, session_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    return _session_response(record)


@router.post("/api/sessions", response_model=SessionResponse)
def save_session(payload: SessionPayload, db: Session = Depends(get_db)) -> SessionResponse:
    record = db.get(SessionRecord, payload.id)
    if record is None:
        record = SessionRecord(
            id=payload.id,
            character_id=payload.characterId,
            created_at=payload.createdAt,
            updated_at=payload.updatedAt,
            message_count=payload.messageCount,
            title=payload.title,
            mode=payload.mode,
        )
        db.add(record)
    else:
        record.character_id = payload.characterId
        record.created_at = payload.createdAt
        record.updated_at = payload.updatedAt
        record.message_count = payload.messageCount
        record.title = payload.title
        record.mode = payload.mode
    db.commit()
    db.refresh(record)
    return _session_response(record)


@router.delete("/api/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    record = db.get(SessionRecord, session_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Session not found.")
    db.delete(record)
    db.commit()
    return {"ok": True}


@router.get("/api/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: str,
    limit: int | None = Query(default=None),
    offset: int | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[MessageResponse]:
    query = select(MessageRecord).where(MessageRecord.session_id == session_id).order_by(MessageRecord.timestamp.asc())
    if offset:
        query = query.offset(offset)
    if limit:
        query = query.limit(limit)
    return [_message_response(item) for item in db.scalars(query)]


@router.delete("/api/sessions/{session_id}/messages")
def delete_messages(session_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    session = db.get(SessionRecord, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    db.execute(delete(MessageRecord).where(MessageRecord.session_id == session_id))
    session.message_count = 0
    db.commit()
    return {"ok": True}


@router.put("/api/sessions/{session_id}/messages")
def replace_messages(session_id: str, payload: ReplaceMessagesPayload, db: Session = Depends(get_db)) -> dict[str, bool]:
    db.execute(delete(MessageRecord).where(MessageRecord.session_id == session_id))
    for message in payload.messages:
        db.add(
            MessageRecord(
                id=message.id,
                session_id=session_id,
                role=message.role,
                content_type=message.contentType,
                content=message.content,
                is_liked=message.isLiked,
                timestamp=message.timestamp,
                token_usage=message.tokenUsage.model_dump() if message.tokenUsage else None,
                asset_id=message.assetId,
            )
        )
    session = db.get(SessionRecord, session_id)
    if session:
        session.message_count = len(payload.messages)
        session.updated_at = max([item.timestamp for item in payload.messages], default=session.updated_at)
    db.commit()
    return {"ok": True}


@router.post("/api/messages", response_model=MessageResponse)
def save_message(payload: MessagePayload, db: Session = Depends(get_db)) -> MessageResponse:
    record = db.get(MessageRecord, payload.id)
    if record is None:
        record = MessageRecord(
            id=payload.id,
            session_id=payload.sessionId,
            role=payload.role,
            content_type=payload.contentType,
            content=payload.content,
            is_liked=payload.isLiked,
            timestamp=payload.timestamp,
            token_usage=payload.tokenUsage.model_dump() if payload.tokenUsage else None,
            asset_id=payload.assetId,
        )
        db.add(record)
    else:
        record.session_id = payload.sessionId
        record.role = payload.role
        record.content_type = payload.contentType
        record.content = payload.content
        record.is_liked = payload.isLiked
        record.timestamp = payload.timestamp
        record.token_usage = payload.tokenUsage.model_dump() if payload.tokenUsage else None
        record.asset_id = payload.assetId

    session = db.get(SessionRecord, payload.sessionId)
    if session:
        db.flush()
        count = db.scalar(
            select(func.count()).select_from(MessageRecord).where(MessageRecord.session_id == payload.sessionId)
        ) or 0
        session.message_count = count
        session.updated_at = payload.timestamp

    db.commit()
    db.refresh(record)
    return _message_response(record)


@router.get("/api/messages/{message_id}", response_model=MessageResponse | None)
def get_message(message_id: str, db: Session = Depends(get_db)) -> MessageResponse | None:
    record = db.get(MessageRecord, message_id)
    return None if record is None else _message_response(record)


@router.put("/api/messages/{message_id}", response_model=MessageResponse)
def update_message(message_id: str, payload: MessagePayload, db: Session = Depends(get_db)) -> MessageResponse:
    if message_id != payload.id:
        raise HTTPException(status_code=400, detail="Message id mismatch.")
    return save_message(payload, db)


@router.get("/api/game/settings", response_model=GameSettings)
def get_game_settings(db: Session = Depends(get_db)) -> GameSettings:
    record = db.get(GameSettingsRecord, 1)
    if record is None:
        return GameSettings()
    return GameSettings(globalEnabled=record.global_enabled, sessionEnabled=record.session_enabled or {})


@router.put("/api/game/settings", response_model=GameSettings)
def save_game_settings(payload: GameSettings, db: Session = Depends(get_db)) -> GameSettings:
    record = db.get(GameSettingsRecord, 1) or GameSettingsRecord(id=1)
    record.global_enabled = payload.globalEnabled
    record.session_enabled = payload.sessionEnabled
    db.add(record)
    db.commit()
    return payload


@router.get("/api/game/states", response_model=list[GameStateResponse])
def list_game_states(session_id: str | None = Query(default=None), db: Session = Depends(get_db)) -> list[GameStateResponse]:
    items = list(db.scalars(select(GameStateRecord)))
    if session_id:
        items = [item for item in items if item.session_id == session_id]
    return [
        GameStateResponse(
            id=item.id,
            gameType=item.game_type,
            characterId=item.character_id,
            sessionId=item.session_id,
            stateData=item.state_data,
            createdAt=item.created_at,
            updatedAt=item.updated_at,
        )
        for item in items
    ]


@router.get("/api/game/states/{game_id}", response_model=GameStateResponse | None)
def get_game_state(game_id: str, db: Session = Depends(get_db)) -> GameStateResponse | None:
    item = db.get(GameStateRecord, game_id)
    if item is None:
        return None
    return GameStateResponse(
        id=item.id,
        gameType=item.game_type,
        characterId=item.character_id,
        sessionId=item.session_id,
        stateData=item.state_data,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
    )


@router.post("/api/game/states", response_model=GameStateResponse)
def save_game_state(payload: GameStatePayload, db: Session = Depends(get_db)) -> GameStateResponse:
    item = db.get(GameStateRecord, payload.id)
    if item is None:
        item = GameStateRecord(
            id=payload.id,
            game_type=payload.gameType,
            character_id=payload.characterId,
            session_id=payload.sessionId,
            state_data=payload.stateData,
            created_at=payload.createdAt,
            updated_at=payload.updatedAt,
        )
        db.add(item)
    else:
        item.game_type = payload.gameType
        item.character_id = payload.characterId
        item.session_id = payload.sessionId
        item.state_data = payload.stateData
        item.created_at = payload.createdAt
        item.updated_at = payload.updatedAt
    db.commit()
    db.refresh(item)
    return GameStateResponse(
        id=item.id,
        gameType=item.game_type,
        characterId=item.character_id,
        sessionId=item.session_id,
        stateData=item.state_data,
        createdAt=item.created_at,
        updatedAt=item.updated_at,
    )


@router.delete("/api/game/states/{game_id}")
def delete_game_state(game_id: str, db: Session = Depends(get_db)) -> dict[str, bool]:
    item = db.get(GameStateRecord, game_id)
    if item is None:
        return {"ok": True}
    db.delete(item)
    db.commit()
    return {"ok": True}
