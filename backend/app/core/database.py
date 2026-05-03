from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


settings = get_settings()


class Base(DeclarativeBase):
    pass


connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, future=True, connect_args=connect_args)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app.models import entities  # noqa: F401
    from sqlalchemy import text

    Base.metadata.create_all(bind=engine)

    # Add columns introduced after initial schema creation.
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE characters ADD COLUMN scene_time VARCHAR(128)",
            "ALTER TABLE characters ADD COLUMN is_liked INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE characters ADD COLUMN is_friend INTEGER NOT NULL DEFAULT 0",
            "ALTER TABLE characters ADD COLUMN example_dialogue TEXT",
            "ALTER TABLE characters ADD COLUMN persona TEXT",
            "ALTER TABLE characters ADD COLUMN scenario TEXT",
            "ALTER TABLE characters ADD COLUMN depth_prompt TEXT",
            "ALTER TABLE characters ADD COLUMN lorebook TEXT",
            "ALTER TABLE characters ADD COLUMN alternate_greetings TEXT",
            "ALTER TABLE characters ADD COLUMN chat_background TEXT",
            "ALTER TABLE characters ADD COLUMN global_background TEXT",
            "ALTER TABLE characters ADD COLUMN switch_animation TEXT",
            "ALTER TABLE characters ADD COLUMN emotion_animations TEXT",
            "ALTER TABLE characters ADD COLUMN game_data TEXT",
            "ALTER TABLE characters ADD COLUMN world_books TEXT",
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass  # Column already exists.
