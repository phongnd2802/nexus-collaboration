from sqlalchemy import DateTime, ForeignKey, Index, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import JSON


class Base(DeclarativeBase):
    pass


def json_type():
    return JSON().with_variant(JSONB, "postgresql")


class AiSessionRow(Base):
    __tablename__ = "ai_sessions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="active")
    meta: Mapped[dict] = mapped_column("metadata", json_type(), nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_ai_sessions_workspace_id", "workspace_id"),
        Index("ix_ai_sessions_user_id", "user_id"),
    )


class AiMessageRow(Base):
    __tablename__ = "ai_messages"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_sessions.id"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    parts: Mapped[list] = mapped_column(json_type(), nullable=False, default=list)
    model: Mapped[str | None] = mapped_column(String(128), nullable=True)
    usage: Mapped[dict | None] = mapped_column(json_type(), nullable=True)
    meta: Mapped[dict] = mapped_column("metadata", json_type(), nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_ai_messages_session_id", "session_id"),
        Index("ix_ai_messages_workspace_id", "workspace_id"),
    )


class AiRunEventRow(Base):
    __tablename__ = "ai_run_events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_sessions.id"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    run_id: Mapped[str] = mapped_column(String(64), nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[dict] = mapped_column(json_type(), nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_ai_run_events_session_id", "session_id"),
        Index("ix_ai_run_events_workspace_id", "workspace_id"),
        Index("ix_ai_run_events_run_id", "run_id"),
    )


class AiApprovalRow(Base):
    __tablename__ = "ai_approvals"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    session_id: Mapped[str] = mapped_column(String(64), ForeignKey("ai_sessions.id"), nullable=False)
    workspace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    tool_name: Mapped[str] = mapped_column(String(256), nullable=False)
    tool_arguments: Mapped[dict] = mapped_column(json_type(), nullable=False, default=dict)
    risk_level: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(512), nullable=False)
    decision_by: Mapped[str | None] = mapped_column(String(128), nullable=True)
    decision_at = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at = mapped_column(DateTime(timezone=True), nullable=True)
    result: Mapped[dict | None] = mapped_column(json_type(), nullable=True)
    meta: Mapped[dict] = mapped_column("metadata", json_type(), nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_ai_approvals_session_id", "session_id"),
        Index("ix_ai_approvals_workspace_id", "workspace_id"),
        Index("ix_ai_approvals_user_id", "user_id"),
        UniqueConstraint("idempotency_key", name="uq_ai_approvals_idempotency_key"),
    )


class AiMemoryAuditRow(Base):
    __tablename__ = "ai_memories_audit"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    workspace_id: Mapped[str] = mapped_column(String(128), nullable=False)
    user_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    memory_scope: Mapped[str] = mapped_column(String(32), nullable=False)
    operation: Mapped[str] = mapped_column(String(32), nullable=False)
    source_session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_message_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    meta: Mapped[dict] = mapped_column("metadata", json_type(), nullable=False, default=dict)
    created_at = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index("ix_ai_memories_audit_workspace_id", "workspace_id"),
        Index("ix_ai_memories_audit_user_id", "user_id"),
    )
