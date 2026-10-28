import json
import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from .models import FormatProfile


@contextmanager
def connection():
    folder = Path(os.environ.get("APP_DATA_DIR", "data"))
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    db = sqlite3.connect(folder / "klausurwerk.sqlite3", timeout=15)
    db.row_factory = sqlite3.Row
    try:
        db.executescript("""
          CREATE TABLE IF NOT EXISTS exams (
            id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS knowledge (
            id TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at TEXT NOT NULL
          );
          CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY, payload TEXT NOT NULL
          );
        """)
        yield db
        db.commit()
    finally:
        db.close()


def all_items(table):
    assert table in ("exams", "knowledge")
    with connection() as db:
        return [dict(id=r["id"], updated_at=r["updated_at"], **json.loads(r["payload"]))
                for r in db.execute(f"SELECT * FROM {table} ORDER BY updated_at DESC")]


def get_item(table, item_id):
    assert table in ("exams", "knowledge")
    with connection() as db:
        row = db.execute(f"SELECT * FROM {table} WHERE id = ?", (item_id,)).fetchone()
        return dict(id=row["id"], updated_at=row["updated_at"], **json.loads(row["payload"])) if row else None


def save_item(table, payload, item_id=None):
    assert table in ("exams", "knowledge")
    item_id = item_id or str(uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with connection() as db:
        db.execute(f"INSERT INTO {table} VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at",
                   (item_id, json.dumps(payload, ensure_ascii=False), now))
    return dict(id=item_id, updated_at=now, **payload)


def delete_item(table, item_id):
    assert table in ("exams", "knowledge")
    with connection() as db:
        return db.execute(f"DELETE FROM {table} WHERE id = ?", (item_id,)).rowcount > 0


def profile():
    with connection() as db:
        row = db.execute("SELECT payload FROM settings WHERE key = 'profile'").fetchone()
        return FormatProfile.model_validate_json(row[0]) if row else FormatProfile()


def save_profile(value):
    value = value.model_copy(update={"version": profile().version + 1})
    with connection() as db:
        db.execute("INSERT INTO settings VALUES ('profile', ?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload", (value.model_dump_json(),))
    return value
