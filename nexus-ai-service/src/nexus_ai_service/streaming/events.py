from typing import Any, Literal

from pydantic import BaseModel, Field

from nexus_ai_service.core.ids import new_id
from nexus_ai_service.core.time import utc_now_iso


EventType = Literal[
    "session.created",
    "message.delta",
    "message.completed",
    "message.partial",
    "tool.started",
    "tool.completed",
    "tool.failed",
    "retrieval.completed",
    "approval.required",
    "error",
]


class StreamEvent(BaseModel):
    id: str = Field(default_factory=new_id)
    run_id: str
    session_id: str
    workspace_id: str
    event_type: EventType
    created_at: str = Field(default_factory=utc_now_iso)
    payload: dict[str, Any] = Field(default_factory=dict)

    def client_payload(self) -> dict[str, Any]:
        data = self.model_dump()
        data.update(self._compat_payload())
        return data

    def _compat_payload(self) -> dict[str, Any]:
        if self.event_type == "session.created":
            return {"type": "data-session", "data": {"sessionId": self.session_id, "runId": self.run_id}}
        if self.event_type == "message.delta":
            return {"type": "text-delta", "delta": self.payload.get("delta", "")}
        if self.event_type == "message.completed":
            return {
                "type": "data-final_answer",
                "data": {
                    "content": self.payload.get("content", ""),
                    "sessionId": self.session_id,
                    "runId": self.run_id,
                    "metadata": self.payload.get("metadata", {}),
                },
            }
        if self.event_type == "retrieval.completed":
            return {"type": "data-rag_sources", "data": {"sources": self.payload.get("sources", [])}}
        if self.event_type == "tool.started":
            return {
                "type": "tool-input-start",
                "tool_call_id": self.payload.get("tool_call_id") or self.id,
                "tool_name": self.payload.get("tool_name"),
            }
        if self.event_type in {"tool.completed", "tool.failed"}:
            return {
                "type": "tool-output-available",
                "tool_call_id": self.payload.get("tool_call_id") or self.id,
                "tool_name": self.payload.get("tool_name"),
                "output": self.payload.get("output"),
                "error_text": self.payload.get("error"),
            }
        if self.event_type == "approval.required":
            return {"type": "data-action_result", "data": {"approval": self.payload}}
        if self.event_type == "error":
            return {"type": "error", "error_text": self.payload.get("message", "Nexus AI request failed")}
        return {"type": self.event_type, "data": self.payload}

