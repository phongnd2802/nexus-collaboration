from typing import Any, Literal

from pydantic import BaseModel, Field


ChatRole = Literal["system", "user", "assistant", "developer"]


class ChatMessage(BaseModel):
    role: ChatRole
    content: Any


class ChatCompletionRequest(BaseModel):
    model: str | None = None
    messages: list[ChatMessage]
    temperature: float | None = None
    max_tokens: int | None = Field(default=None, alias="max_tokens")
    stream: bool = False
    metadata: dict[str, Any] | None = None
    tools: list[Any] | None = None
    tool_choice: Any | None = None


class ResumeRequest(BaseModel):
    tool_call_id: str
    decision: Literal["approve", "deny"]
    comment: str | None = None


class ErrorDetail(BaseModel):
    message: str
    type: str = "invalid_request_error"
    param: str | None = None
    code: str | None = None
