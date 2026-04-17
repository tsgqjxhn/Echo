from __future__ import annotations

from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.entities import StoryChoiceOptionRecord, StoryMessageRecord, StoryRecord, StorySegmentRecord
from app.schemas.entities import StoryChoiceOption, StoryCompileResponse, StoryMessage, StoryResponse, StorySegment
from app.services.story_parser import ParsedStorySegment, StoryParser
from app.services.utils import now_ms


DEFAULT_STORY_ID = "default-story"
REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_STORY_SOURCE = REPO_ROOT / "docs" / "新剧情.md"


def _schema_message_from_parsed(message) -> StoryMessage:
    return StoryMessage(
        id=message.id,
        role=message.role,
        text=message.text,
        variant=message.variant,
        delay=message.delay,
        typing=message.typing,
        hidden=message.hidden,
    )


def _schema_segment_from_parsed(segment: ParsedStorySegment) -> StorySegment:
    return StorySegment(
        id=segment.id,
        kind=segment.kind,
        scene=segment.scene,
        prompt=segment.prompt,
        messages=[_schema_message_from_parsed(item) for item in segment.messages],
        options=[
            StoryChoiceOption(
                id=option.id,
                key=option.key,
                text=option.text,
                retry=option.retry,
                branchMessages=[_schema_message_from_parsed(item) for item in option.branchMessages],
            )
            for option in segment.options
        ],
    )


def compile_markdown(text: str) -> StoryCompileResponse:
    parser = StoryParser()
    title, character_name, segments = parser.parse(text)
    return StoryCompileResponse(
        title=title,
        characterName=character_name,
        segments=[_schema_segment_from_parsed(segment) for segment in segments],
    )


def _serialize_story(story: StoryRecord) -> StoryResponse:
    return StoryResponse(
        id=story.id,
        title=story.title,
        sourceName=story.source_name,
        sourceFormat=story.source_format,
        version=story.version,
        characterName=story.character_name,
        entryDay=story.entry_day,
        isDefault=story.is_default,
        createdAt=story.created_at,
        updatedAt=story.updated_at,
        segments=[
            StorySegment(
                id=segment.id,
                kind=segment.segment_type,  # type: ignore[arg-type]
                scene=segment.scene,
                prompt=segment.prompt,
                messages=[
                    StoryMessage(
                        id=message.id,
                        role=message.role,  # type: ignore[arg-type]
                        text=message.text,
                        variant=message.variant,  # type: ignore[arg-type]
                        delay=message.delay_ms,
                        typing=message.typing_ms,
                        hidden=message.hidden,
                    )
                    for message in segment.messages
                ],
                options=[
                    StoryChoiceOption(
                        id=option.id,
                        key=option.key,  # type: ignore[arg-type]
                        text=option.text,
                        retry=option.retry,
                        branchMessages=[StoryMessage.model_validate(item) for item in option.branch_messages],
                    )
                    for option in segment.options
                ],
            )
            for segment in story.segments
        ],
    )


def get_story(db: Session, story_id: str) -> StoryResponse | None:
    story = db.get(StoryRecord, story_id)
    return None if story is None else _serialize_story(story)


def upsert_story_from_markdown(
    db: Session,
    text: str,
    *,
    story_id: str = DEFAULT_STORY_ID,
    source_name: str = "新剧情.md",
    is_default: bool = True,
) -> StoryResponse:
    compiled = compile_markdown(text)
    timestamp = now_ms()
    story = db.get(StoryRecord, story_id)
    existing_segment_ids = [segment.id for segment in story.segments] if story is not None else []

    if existing_segment_ids:
        db.execute(delete(StoryMessageRecord).where(StoryMessageRecord.segment_id.in_(existing_segment_ids)))
        db.execute(delete(StoryChoiceOptionRecord).where(StoryChoiceOptionRecord.segment_id.in_(existing_segment_ids)))
        db.execute(delete(StorySegmentRecord).where(StorySegmentRecord.story_id == story_id))
        db.flush()

    if story is None:
        story = StoryRecord(
            id=story_id,
            title=compiled.title,
            source_name=source_name,
            source_format="markdown",
            version="1.0",
            character_name=compiled.characterName,
            entry_day=compiled.segments[0].scene if compiled.segments else None,
            is_default=is_default,
            created_at=timestamp,
            updated_at=timestamp,
        )
        db.add(story)
        db.flush()
    else:
        story.title = compiled.title
        story.source_name = source_name
        story.source_format = "markdown"
        story.version = "1.0"
        story.character_name = compiled.characterName
        story.entry_day = compiled.segments[0].scene if compiled.segments else None
        story.is_default = is_default
        story.updated_at = timestamp
        db.flush()

    for segment_index, segment in enumerate(compiled.segments):
        segment_record = StorySegmentRecord(
            id=segment.id,
            story_id=story_id,
            segment_type=segment.kind,
            scene=segment.scene,
            prompt=segment.prompt,
            sort_order=segment_index,
        )
        db.add(segment_record)
        db.flush()

        for message_index, message in enumerate(segment.messages):
            db.add(
                StoryMessageRecord(
                    id=message.id,
                    segment_id=segment_record.id,
                    role=message.role,
                    text=message.text,
                    variant=message.variant,
                    delay_ms=message.delay,
                    typing_ms=message.typing,
                    hidden=message.hidden,
                    sort_order=message_index,
                )
            )

        for option_index, option in enumerate(segment.options):
            db.add(
                StoryChoiceOptionRecord(
                    id=option.id,
                    segment_id=segment_record.id,
                    key=option.key,
                    text=option.text,
                    retry=option.retry,
                    branch_messages=[item.model_dump() for item in option.branchMessages],
                    sort_order=option_index,
                )
            )

    db.commit()
    db.refresh(story)
    db.expire(story, ["segments"])
    return _serialize_story(story)


def seed_default_story(db: Session) -> StoryResponse | None:
    if not DEFAULT_STORY_SOURCE.exists():
        return None
    text = DEFAULT_STORY_SOURCE.read_text(encoding="utf-8")
    return upsert_story_from_markdown(
        db,
        text,
        story_id=DEFAULT_STORY_ID,
        source_name=DEFAULT_STORY_SOURCE.name,
        is_default=True,
    )


def get_default_story(db: Session) -> StoryResponse | None:
    story = db.scalar(select(StoryRecord).where(StoryRecord.is_default.is_(True)))
    if story is not None:
        return _serialize_story(story)
    return seed_default_story(db)
