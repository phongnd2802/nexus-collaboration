from typing import Literal

from pydantic import BaseModel, Field


class MemoryWriteRequest(BaseModel):
    workspace_id: str
    user_id: str | None = None
    scope: Literal["user", "workspace"] = "user"
    text: str
    metadata: dict = Field(default_factory=dict)


class MemoryRecord(BaseModel):
    id: str
    workspace_id: str
    user_id: str | None = None
    scope: Literal["user", "workspace"]
    text: str
    metadata: dict = Field(default_factory=dict)

