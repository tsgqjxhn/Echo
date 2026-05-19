"""game_settings extended columns

Revision ID: 20260519_0001
Revises:
Create Date: 2026-05-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260519_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_sqlite(table: str, column: str, ddl: str) -> None:
    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        op.execute(ddl)
        return
    try:
        op.execute(ddl)
    except Exception:
        pass


def upgrade() -> None:
    _add_column_if_sqlite(
        "game_settings",
        "global_sound_enabled",
        "ALTER TABLE game_settings ADD COLUMN global_sound_enabled BOOLEAN NOT NULL DEFAULT 1",
    )
    _add_column_if_sqlite(
        "game_settings",
        "global_bgm_enabled",
        "ALTER TABLE game_settings ADD COLUMN global_bgm_enabled BOOLEAN NOT NULL DEFAULT 1",
    )
    _add_column_if_sqlite(
        "game_settings",
        "damage_display_enabled",
        "ALTER TABLE game_settings ADD COLUMN damage_display_enabled BOOLEAN NOT NULL DEFAULT 1",
    )
    _add_column_if_sqlite(
        "game_settings",
        "game_notifications_enabled",
        "ALTER TABLE game_settings ADD COLUMN game_notifications_enabled BOOLEAN NOT NULL DEFAULT 1",
    )
    _add_column_if_sqlite(
        "game_settings",
        "game_notifications",
        "ALTER TABLE game_settings ADD COLUMN game_notifications JSON",
    )


def downgrade() -> None:
    pass
