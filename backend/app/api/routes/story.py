from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.entities import StoryCompileResponse, StoryResponse, StorySegment
from app.services.story_service import compile_markdown, get_default_story, get_story, upsert_story_from_markdown


router = APIRouter(prefix="/api/story", tags=["story"])


@router.get("/default", response_model=StoryResponse)
def read_default_story(db: Session = Depends(get_db)) -> StoryResponse:
    story = get_default_story(db)
    if story is None:
        raise HTTPException(status_code=404, detail="Default story not found.")
    return story


@router.get("/{story_id}", response_model=StoryResponse)
def read_story(story_id: str, db: Session = Depends(get_db)) -> StoryResponse:
    story = get_story(db, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found.")
    return story


@router.get("/{story_id}/segments", response_model=list[StorySegment])
def read_story_segments(story_id: str, db: Session = Depends(get_db)) -> list[StorySegment]:
    story = get_story(db, story_id)
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found.")
    return story.segments


@router.post("/compile", response_model=StoryCompileResponse)
async def compile_story(file: UploadFile = File(...)) -> StoryCompileResponse:
    content = (await file.read()).decode("utf-8")
    return compile_markdown(content)


@router.post("/import", response_model=StoryResponse)
async def import_story(file: UploadFile = File(...), db: Session = Depends(get_db)) -> StoryResponse:
    content = (await file.read()).decode("utf-8")
    return upsert_story_from_markdown(db, content, source_name=file.filename or "story.md")
