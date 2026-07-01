from __future__ import annotations

from typing import Any


SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  title TEXT NOT NULL DEFAULT 'New conversation',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  all_messages_json BYTEA,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_workspace_user_updated_at
ON sessions (workspace_id, user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL,
  content TEXT,
  parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  model TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_created_at
ON chat_messages (session_id, created_at);

CREATE TABLE IF NOT EXISTS chat_events (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_events_session_created_at
ON chat_events (session_id, created_at);

CREATE TABLE IF NOT EXISTS approval_decisions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  approval_id TEXT NOT NULL,
  user_id TEXT,
  decision TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, approval_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS memories (
  id BIGSERIAL PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER NOT NULL DEFAULT 5,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memories_workspace_user_session
ON memories (workspace_id, user_id, session_id, importance DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS tool_audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL,
  user_id TEXT,
  session_id TEXT,
  request_id TEXT,
  tool_call_id TEXT,
  tool_name TEXT NOT NULL,
  is_write_tool BOOLEAN NOT NULL DEFAULT false,
  is_destructive_tool BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL,
  input JSONB NOT NULL DEFAULT '{}'::jsonb,
  output JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_audit_logs_workspace_session_created_at
ON tool_audit_logs (workspace_id, session_id, created_at);
"""


class PostgresStore:
    def __init__(self, dsn: str) -> None:
        self.dsn = dsn
        self._pool: Any = None
        self._initialized = False

    async def initialize(self) -> None:
        if self._pool is None:
            try:
                import asyncpg
            except ImportError as exc:
                raise RuntimeError("asyncpg is required when NEXUS_AI_DATABASE_URL is configured.") from exc
            self._pool = await asyncpg.create_pool(self.dsn, min_size=1, max_size=10)
        if self._initialized:
            return
        async with self._pool.acquire() as conn:
            await conn.execute(SCHEMA)
        self._initialized = True

    async def close(self) -> None:
        if self._pool is not None:
            await self._pool.close()
            self._pool = None
            self._initialized = False

    async def fetch_all(self, query: str, *args: Any) -> list[dict[str, Any]]:
        await self.initialize()
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
        return [dict(row) for row in rows]

    async def fetch_one(self, query: str, *args: Any) -> dict[str, Any] | None:
        await self.initialize()
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
        return dict(row) if row else None

    async def execute(self, query: str, *args: Any) -> int:
        await self.initialize()
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            status = await conn.execute(query, *args)
        return _row_count(status)

    async def execute_insert_id(self, query: str, *args: Any) -> int:
        row = await self.fetch_one(query, *args)
        if not row or "id" not in row:
            raise RuntimeError("Postgres insert did not return id")
        return int(row["id"])


def _row_count(status: str) -> int:
    parts = status.split()
    if not parts:
        return 0
    try:
        return int(parts[-1])
    except ValueError:
        return 0
