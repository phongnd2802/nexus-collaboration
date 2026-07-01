from __future__ import annotations

import json
import re
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL DEFAULT 'New conversation',
  metadata TEXT NOT NULL DEFAULT '{}',
  all_messages_json BLOB,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT,
  parts TEXT NOT NULL DEFAULT '[]',
  model TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at
ON chat_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_events_session_created_at
ON chat_events (session_id, created_at);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  user_id TEXT,
  decision TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_decisions_session_approval_idempotency
ON approval_decisions (session_id, approval_id, idempotency_key);

CREATE TABLE IF NOT EXISTS memories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workspace_id TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5,
  tags TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tool_audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  request_id TEXT,
  tool_call_id TEXT,
  tool_name TEXT NOT NULL,
  is_write_tool INTEGER NOT NULL DEFAULT 0,
  is_destructive_tool INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  input TEXT NOT NULL DEFAULT '{}',
  output TEXT NOT NULL DEFAULT '{}',
  error TEXT,
  latency_ms INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
"""


class SQLiteStore:
    def __init__(self, path: Path) -> None:
        self.path = path

    def initialize(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connect() as conn:
            conn.executescript(SCHEMA)
            self._migrate(conn)

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def _migrate(self, conn: sqlite3.Connection) -> None:
        self._ensure_column(conn, "sessions", "all_messages_json", "BLOB")
        self._ensure_table(
            conn,
            """
            CREATE TABLE IF NOT EXISTS chat_messages (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              user_id TEXT,
              role TEXT NOT NULL,
              content TEXT,
              parts TEXT NOT NULL DEFAULT '[]',
              model TEXT,
              metadata TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        self._ensure_table(
            conn,
            """
            CREATE TABLE IF NOT EXISTS chat_events (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              event_name TEXT NOT NULL,
              payload TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        self._ensure_table(
            conn,
            """
            CREATE TABLE IF NOT EXISTS approval_decisions (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              workspace_id TEXT NOT NULL,
              approval_id TEXT NOT NULL,
              user_id TEXT,
              decision TEXT NOT NULL,
              idempotency_key TEXT NOT NULL,
              message TEXT,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        self._ensure_table(
            conn,
            """
            CREATE TABLE IF NOT EXISTS tool_audit_logs (
              id TEXT PRIMARY KEY,
              workspace_id TEXT NOT NULL,
              user_id TEXT,
              session_id TEXT,
              request_id TEXT,
              tool_call_id TEXT,
              tool_name TEXT NOT NULL,
              is_write_tool INTEGER NOT NULL DEFAULT 0,
              is_destructive_tool INTEGER NOT NULL DEFAULT 0,
              status TEXT NOT NULL,
              input TEXT NOT NULL DEFAULT '{}',
              output TEXT NOT NULL DEFAULT '{}',
              error TEXT,
              latency_ms INTEGER,
              created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
            """,
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at ON chat_messages (session_id, created_at)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_chat_events_session_created_at ON chat_events (session_id, created_at)"
        )
        conn.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_approval_decisions_session_approval_idempotency "
            "ON approval_decisions (session_id, approval_id, idempotency_key)"
        )

    def _ensure_table(self, conn: sqlite3.Connection, ddl: str) -> None:
        conn.execute(ddl)

    def _ensure_column(self, conn: sqlite3.Connection, table: str, column: str, definition: str) -> None:
        rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
        existing = {row["name"] for row in rows}
        if column not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")

    async def fetch_all(self, query: str, *args: Any) -> list[dict[str, Any]]:
        return self._fetch_all_sync(query, args)

    async def fetch_one(self, query: str, *args: Any) -> dict[str, Any] | None:
        return self._fetch_one_sync(query, args)

    async def execute(self, query: str, *args: Any) -> int:
        return self._execute_sync(query, args)

    async def execute_insert_id(self, query: str, *args: Any) -> int:
        return self._execute_insert_id_sync(query, args)

    def _fetch_all_sync(self, query: str, args: tuple[Any, ...]) -> list[dict[str, Any]]:
        sql, params = _sqlite_query(query, args)
        with self.connect() as conn:
            rows = conn.execute(sql, params).fetchall()
        return [dict(row) for row in rows]

    def _fetch_one_sync(self, query: str, args: tuple[Any, ...]) -> dict[str, Any] | None:
        sql, params = _sqlite_query(query, args)
        with self.connect() as conn:
            row = conn.execute(sql, params).fetchone()
        return dict(row) if row else None

    def _execute_sync(self, query: str, args: tuple[Any, ...]) -> int:
        sql, params = _sqlite_query(query, args)
        with self.connect() as conn:
            cursor = conn.execute(sql, params)
            return cursor.rowcount

    def _execute_insert_id_sync(self, query: str, args: tuple[Any, ...]) -> int:
        sql, params = _sqlite_query(query, args)
        with self.connect() as conn:
            cursor = conn.execute(sql, params)
            if "returning id" in sql.lower():
                row = cursor.fetchone()
                return int(row["id"] if isinstance(row, sqlite3.Row) else row[0])
            return int(cursor.lastrowid)


def encode_json(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def decode_json(value: Any, default: Any) -> Any:
    if not value:
        return default
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return default


def _sqlite_query(query: str, args: tuple[Any, ...]) -> tuple[str, tuple[Any, ...]]:
    params: list[Any] = []

    def replace(match: re.Match[str]) -> str:
        index = int(match.group(1)) - 1
        params.append(_sqlite_value(args[index]))
        return "?"

    return re.sub(r"\$(\d+)", replace, query), tuple(params)


def _sqlite_value(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat()
    return value
