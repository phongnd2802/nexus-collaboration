from datetime import datetime
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from nexus_ai_service.core.ids import new_id
from nexus_ai_service.core.time import utc_now, utc_now_iso
from nexus_ai_service.persistence.models import AiApprovalRow, AiMessageRow, AiRunEventRow, AiSessionRow, Base
from nexus_ai_service.persistence.sessions import ChatMessage, ChatSession
from nexus_ai_service.streaming.events import StreamEvent


class SqlAlchemySessionStore:
    def __init__(self, database_url: str) -> None:
        self.engine = create_async_engine(database_url, pool_pre_ping=True)
        self.sessions = async_sessionmaker(self.engine, expire_on_commit=False)

    async def init(self) -> None:
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def close(self) -> None:
        await self.engine.dispose()

    async def get_or_create_session(
        self, workspace_id: str, user_id: str | None, session_id: str | None = None
    ) -> ChatSession:
        async with self.sessions() as db:
            if session_id:
                existing = await self._find_session(db, workspace_id, session_id)
                if existing:
                    return self._session_from_row(existing)
            row = AiSessionRow(
                id=session_id or new_id(),
                workspace_id=workspace_id,
                user_id=user_id,
                status="active",
                meta={},
            )
            db.add(row)
            await db.commit()
            await db.refresh(row)
            return self._session_from_row(row)

    async def list_sessions(self, workspace_id: str) -> list[ChatSession]:
        async with self.sessions() as db:
            rows = (
                await db.execute(
                    select(AiSessionRow)
                    .where(AiSessionRow.workspace_id == workspace_id, AiSessionRow.status != "deleted")
                    .order_by(AiSessionRow.updated_at.desc())
                )
            ).scalars()
            return [self._session_from_row(row) for row in rows]

    async def get_session(self, workspace_id: str, session_id: str) -> ChatSession:
        async with self.sessions() as db:
            row = await self._find_session(db, workspace_id, session_id)
            if not row:
                raise KeyError(session_id)
            return self._session_from_row(row)

    async def delete_session(self, workspace_id: str, session_id: str) -> None:
        async with self.sessions() as db:
            row = await self._find_session(db, workspace_id, session_id)
            if not row:
                raise KeyError(session_id)
            now = utc_now()
            await db.execute(
                update(AiSessionRow)
                .where(AiSessionRow.id == session_id)
                .values(status="deleted", deleted_at=now, updated_at=now)
            )
            await db.commit()

    async def add_message(
        self,
        session: ChatSession,
        role: str,
        content: str | None,
        user_id: str | None = None,
        parts: list[dict[str, Any]] | None = None,
        model: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> ChatMessage:
        message = ChatMessage(
            id=new_id(),
            session_id=session.id,
            workspace_id=session.workspace_id,
            user_id=user_id,
            role=role,
            content=content,
            parts=parts or ([{"type": "text", "content": content}] if content else []),
            model=model,
            metadata=metadata or {},
        )
        async with self.sessions() as db:
            db.add(
                AiMessageRow(
                    id=message.id,
                    session_id=message.session_id,
                    workspace_id=message.workspace_id,
                    user_id=message.user_id,
                    role=message.role,
                    content=message.content,
                    parts=message.parts,
                    model=message.model,
                    usage=message.usage,
                    meta=message.metadata,
                )
            )
            values: dict[str, Any] = {"updated_at": utc_now()}
            if role == "user" and content:
                current = await self._find_session(db, session.workspace_id, session.id)
                if current and not current.title:
                    values["title"] = content.strip()[:80]
            await db.execute(update(AiSessionRow).where(AiSessionRow.id == session.id).values(**values))
            await db.commit()
        return message

    async def messages_for_session(self, session_id: str) -> list[ChatMessage]:
        async with self.sessions() as db:
            rows = (
                await db.execute(
                    select(AiMessageRow).where(AiMessageRow.session_id == session_id).order_by(AiMessageRow.created_at)
                )
            ).scalars()
            return [self._message_from_row(row) for row in rows]

    async def add_event(self, session_id: str, event: StreamEvent) -> StreamEvent:
        async with self.sessions() as db:
            db.add(
                AiRunEventRow(
                    id=event.id,
                    session_id=session_id,
                    workspace_id=event.workspace_id,
                    run_id=event.run_id,
                    event_type=event.event_type,
                    payload=event.model_dump(),
                )
            )
            await db.commit()
        return event

    async def events_for_session(self, session_id: str, since_event_id: str | None = None) -> list[StreamEvent]:
        async with self.sessions() as db:
            rows = (
                await db.execute(
                    select(AiRunEventRow).where(AiRunEventRow.session_id == session_id).order_by(AiRunEventRow.created_at)
                )
            ).scalars()
            events = [StreamEvent.model_validate(row.payload) for row in rows]
        if not since_event_id:
            return events
        for index, event in enumerate(events):
            if event.id == since_event_id:
                return events[index + 1 :]
        return events

    async def snapshot(self, workspace_id: str, session_id: str) -> dict[str, Any]:
        session = await self.get_session(workspace_id, session_id)
        messages = await self.messages_for_session(session_id)
        return {
            "sessionId": session.id,
            "title": session.title or "New chat",
            "items": [
                {"id": message.id, "role": message.role, "content": message.content, "createdAt": message.created_at}
                for message in messages
            ],
            "transcript": [
                {"id": message.id, "type": message.role, "text": message.content, "createdAt": message.created_at}
                for message in messages
            ],
            "uiMessages": [
                {"id": message.id, "role": message.role, "parts": message.parts, "createdAt": message.created_at}
                for message in messages
            ],
            "updatedAt": session.updated_at,
        }

    async def upsert_approval_decision(
        self,
        session_id: str,
        workspace_id: str,
        approval_id: str,
        user_id: str | None,
        decision: str,
        idempotency_key: str,
        message: str | None = None,
    ) -> dict[str, Any]:
        async with self.sessions() as db:
            session = await self._find_session(db, workspace_id, session_id)
            if not session:
                raise KeyError(session_id)
            existing = (
                await db.execute(
                    select(AiApprovalRow).where(
                        AiApprovalRow.idempotency_key == idempotency_key,
                    )
                )
            ).scalar_one_or_none()
            if existing:
                return {
                    "approval_id": existing.id,
                    "session_id": existing.session_id,
                    "workspace_id": existing.workspace_id,
                    "status": existing.status,
                    "idempotency_key": existing.idempotency_key,
                }

            row = AiApprovalRow(
                id=approval_id,
                session_id=session_id,
                workspace_id=workspace_id,
                user_id=user_id,
                status="approved" if decision == "approved" else "rejected",
                tool_name="pending_tool",
                tool_arguments={},
                risk_level="medium",
                summary=message or f"Approval decision recorded: {decision}",
                idempotency_key=idempotency_key,
                decision_by=user_id,
                decision_at=utc_now(),
                result={"decision": decision, "message": message},
                meta={},
            )
            db.add(row)
            await db.commit()
            return {
                "approval_id": row.id,
                "session_id": row.session_id,
                "workspace_id": row.workspace_id,
                "status": row.status,
                "idempotency_key": row.idempotency_key,
            }

    async def _find_session(self, db: AsyncSession, workspace_id: str, session_id: str) -> AiSessionRow | None:
        return (
            await db.execute(
                select(AiSessionRow).where(
                    AiSessionRow.id == session_id,
                    AiSessionRow.workspace_id == workspace_id,
                    AiSessionRow.status != "deleted",
                )
            )
        ).scalar_one_or_none()

    def _session_from_row(self, row: AiSessionRow) -> ChatSession:
        return ChatSession(
            id=row.id,
            workspace_id=row.workspace_id,
            user_id=row.user_id,
            title=row.title,
            status=row.status,
            metadata=row.meta or {},
            created_at=self._iso(row.created_at),
            updated_at=self._iso(row.updated_at),
            deleted_at=self._iso(row.deleted_at) if row.deleted_at else None,
        )

    def _message_from_row(self, row: AiMessageRow) -> ChatMessage:
        return ChatMessage(
            id=row.id,
            session_id=row.session_id,
            workspace_id=row.workspace_id,
            user_id=row.user_id,
            role=row.role,
            content=row.content,
            parts=row.parts or [],
            model=row.model,
            usage=row.usage,
            metadata=row.meta or {},
            created_at=self._iso(row.created_at),
        )

    def _iso(self, value: datetime | None) -> str:
        if not value:
            return utc_now_iso()
        return value.isoformat().replace("+00:00", "Z")
