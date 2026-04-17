from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_ROOT = Path(__file__).resolve().parents[2]
STORAGE_ROOT = BACKEND_ROOT / "storage"
ENV_FILE = BACKEND_ROOT / ".env"


class Settings(BaseSettings):
    app_name: str = "xiang-backend"
    app_env: str = "development"
    app_version: str = "1.0.0"
    public_base_url: str = "http://127.0.0.1:8000"
    database_url: str = Field(default_factory=lambda: f"sqlite:///{(STORAGE_ROOT / 'app.db').as_posix()}")
    storage_root: Path = Field(default_factory=lambda: STORAGE_ROOT)
    media_url: str = "/media"
    export_dir_name: str = "exports"
    upload_dir_name: str = "uploads"
    audio_dir_name: str = "audio"
    llm_provider: Literal["openai", "mock"] = "openai"
    tts_provider: Literal["openai", "disabled"] = "disabled"
    stt_provider: Literal["openai", "disabled"] = "disabled"
    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"
    openai_tts_model: str = "gpt-4o-mini-tts"
    openai_tts_voice: str = "alloy"
    openai_stt_model: str = "gpt-4o-mini-transcribe"
    cors_origins: list[str] = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def exports_root(self) -> Path:
        return self.storage_root / self.export_dir_name

    @property
    def uploads_root(self) -> Path:
        return self.storage_root / self.upload_dir_name

    @property
    def audio_root(self) -> Path:
        return self.storage_root / self.audio_dir_name

    def ensure_directories(self) -> None:
        for path in (self.storage_root, self.exports_root, self.uploads_root, self.audio_root):
            path.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
