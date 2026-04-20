from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import characters, chat, configs, files, health, import_export, sessions, story, stt, tts, user
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.services.story_service import seed_default_story


settings = get_settings()
app = FastAPI(title=settings.app_name, version=settings.app_version)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(characters.router)
app.include_router(user.router)
app.include_router(sessions.router)
app.include_router(configs.router)
app.include_router(files.router)
app.include_router(story.router)
app.include_router(import_export.router)
app.include_router(chat.router)
app.include_router(tts.router)
app.include_router(stt.router)

app.mount(settings.media_url, StaticFiles(directory=settings.storage_root), name="media")


@app.on_event("startup")
def startup() -> None:
    init_db()
    from sqlalchemy import text
    with SessionLocal() as db:
        try:
            db.execute(text("ALTER TABLE api_configs ADD COLUMN config_type VARCHAR(32) NOT NULL DEFAULT 'text'"))
            db.commit()
        except Exception:
            pass  # column already exists
    with SessionLocal() as db:
        try:
            seed_default_story(db)
        except Exception:
            db.rollback()
