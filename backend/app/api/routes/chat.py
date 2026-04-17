from __future__ import annotations

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.entities import ChatCompletionResponse, ChatContextRequest
from app.services.llm_service import LLMService


router = APIRouter(prefix="/api/chat", tags=["chat"])
llm_service = LLMService(get_settings())


@router.post("/completions", response_model=ChatCompletionResponse)
async def chat_completion(payload: ChatContextRequest, db: Session = Depends(get_db)) -> ChatCompletionResponse:
    return await llm_service.chat(db, payload)


@router.post("/completions/stream")
async def chat_completion_stream(payload: ChatContextRequest, db: Session = Depends(get_db)) -> StreamingResponse:
    return StreamingResponse(llm_service.stream_lines(db, payload), media_type="text/event-stream")
