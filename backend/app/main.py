from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import characters, chat, configs, files, health, import_export, sessions, story, stt, tts, user
from app.core.config import get_settings
from app.core.database import SessionLocal, init_db
from app.core.exceptions import http_exception_handler, unhandled_exception_handler
from app.middleware.auth import OptionalAPITokenMiddleware
from app.services.story_service import seed_default_story


settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    with SessionLocal() as db:
        try:
            seed_default_story(db)
        except Exception:
            db.rollback()
    yield


app = FastAPI(title=settings.app_name, version=settings.app_version, lifespan=lifespan)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

app.add_middleware(OptionalAPITokenMiddleware)
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
