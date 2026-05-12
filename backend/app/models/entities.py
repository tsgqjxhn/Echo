from __future__ import annotations

from typing import Any

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base


class TimestampMixin:
    created_at: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False)


class CharacterRecord(Base, TimestampMixin):
    __tablename__ = "characters"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    background: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    greeting: Mapped[str | None] = mapped_column(Text, nullable=True)
    settings: Mapped[str] = mapped_column(Text, nullable=False)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    sub_category: Mapped[str | None] = mapped_column(String(128), nullable=True)
    avatar_tone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    background_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    personality: Mapped[str | None] = mapped_column(Text, nullable=True)
    behavior: Mapped[str | None] = mapped_column(Text, nullable=True)
    values: Mapped[str | None] = mapped_column(Text, nullable=True)
    members: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    structured_members: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    source_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    scene_time: Mapped[str | None] = mapped_column(String(128), nullable=True)
    is_liked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="0")
    is_friend: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, server_default="0")

    # Advanced character fields aligned with frontend ICharacter
    example_dialogue: Mapped[str | None] = mapped_column(Text, nullable=True)
    persona: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    scenario: Mapped[str | None] = mapped_column(Text, nullable=True)
    depth_prompt: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    lorebook: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    alternate_greetings: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    chat_background: Mapped[str | None] = mapped_column(Text, nullable=True)
    global_background: Mapped[str | None] = mapped_column(Text, nullable=True)
    switch_animation: Mapped[str | None] = mapped_column(Text, nullable=True)
    emotion_animations: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    game_data: Mapped[str | None] = mapped_column(Text, nullable=True)
    world_books: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)

    sessions: Mapped[list["SessionRecord"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    game_states: Mapped[list["GameStateRecord"]] = relationship(
        back_populates="character",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class SessionRecord(Base, TimestampMixin):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    character_id: Mapped[str] = mapped_column(
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mode: Mapped[str | None] = mapped_column(String(64), nullable=True)
    message_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    character: Mapped["CharacterRecord"] = relationship(back_populates="sessions")
    messages: Mapped[list["MessageRecord"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="MessageRecord.timestamp",
    )
    game_states: Mapped[list["GameStateRecord"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class MessageRecord(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content_type: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_liked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    timestamp: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    token_usage: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    asset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    session: Mapped["SessionRecord"] = relationship(back_populates="messages")


class UserProfileRecord(Base):
    __tablename__ = "user_profile"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar: Mapped[str | None] = mapped_column(Text, nullable=True)
    global_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    core_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    fortune_coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chat_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    game_level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)


class UserSettingRecord(Base):
    __tablename__ = "user_settings"

    key: Mapped[str] = mapped_column(String(255), primary_key=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)


class APIConfigRecord(Base):
    __tablename__ = "api_configs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str] = mapped_column(String(64), nullable=False)
    api_key: Mapped[str] = mapped_column(Text, nullable=False)
    base_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    model: Mapped[str] = mapped_column(String(255), nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    source: Mapped[str] = mapped_column(String(32), default="storage", nullable=False)
    config_type: Mapped[str] = mapped_column(String(32), default="text", nullable=False, server_default="text")
    created_at: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False)


class GameSettingsRecord(Base):
    __tablename__ = "game_settings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    global_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    session_enabled: Mapped[dict[str, bool] | None] = mapped_column(JSON, nullable=True)


class GameStateRecord(Base, TimestampMixin):
    __tablename__ = "game_states"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    game_type: Mapped[str] = mapped_column(String(64), nullable=False)
    character_id: Mapped[str] = mapped_column(
        ForeignKey("characters.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[str] = mapped_column(
        ForeignKey("sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    state_data: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False)

    character: Mapped["CharacterRecord"] = relationship(back_populates="game_states")
    session: Mapped["SessionRecord"] = relationship(back_populates="game_states")


class AssetRecord(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    asset_type: Mapped[str] = mapped_column(String(64), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    original_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    mime_type: Mapped[str | None] = mapped_column(String(255), nullable=True)
    size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    owner_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False)


class StoryRecord(Base, TimestampMixin):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    source_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_format: Mapped[str | None] = mapped_column(String(64), nullable=True)
    version: Mapped[str | None] = mapped_column(String(64), nullable=True)
    character_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    entry_day: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    segments: Mapped[list["StorySegmentRecord"]] = relationship(
        back_populates="story",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StorySegmentRecord.sort_order",
    )


class StorySegmentRecord(Base):
    __tablename__ = "story_segments"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    story_id: Mapped[str] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    segment_type: Mapped[str] = mapped_column(String(32), nullable=False)
    scene: Mapped[str | None] = mapped_column(Text, nullable=True)
    prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    story: Mapped["StoryRecord"] = relationship(back_populates="segments")
    messages: Mapped[list["StoryMessageRecord"]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StoryMessageRecord.sort_order",
    )
    options: Mapped[list["StoryChoiceOptionRecord"]] = relationship(
        back_populates="segment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="StoryChoiceOptionRecord.sort_order",
    )


class StoryMessageRecord(Base):
    __tablename__ = "story_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    segment_id: Mapped[str] = mapped_column(
        ForeignKey("story_segments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    variant: Mapped[str] = mapped_column(String(32), nullable=False)
    delay_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    typing_ms: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    segment: Mapped["StorySegmentRecord"] = relationship(back_populates="messages")


class StoryChoiceOptionRecord(Base):
    __tablename__ = "story_choice_options"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    segment_id: Mapped[str] = mapped_column(
        ForeignKey("story_segments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    key: Mapped[str] = mapped_column(String(8), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    retry: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    branch_messages: Mapped[list[dict[str, Any]]] = mapped_column(JSON, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False)

    segment: Mapped["StorySegmentRecord"] = relationship(back_populates="options")


class ExportTaskRecord(Base):
    __tablename__ = "export_tasks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    export_type: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    asset_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detail: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[int] = mapped_column(Integer, nullable=False)
