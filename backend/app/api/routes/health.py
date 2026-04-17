from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.schemas.entities import HealthResponse


router = APIRouter(prefix="/api/health", tags=["health"])
settings = get_settings()


@router.get("", response_model=HealthResponse)
def health_check(db: Session = Depends(get_db)) -> HealthResponse:
    db.execute(text("SELECT 1"))
    return HealthResponse(
        status="ok",
        database="ok",
        storage="ok",
        llmProvider=settings.llm_provider,
    )
