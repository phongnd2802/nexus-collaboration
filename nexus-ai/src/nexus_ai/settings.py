from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from nexus_ai.request_context import extract_bearer_token, get_request_context

load_dotenv()


def _bool(value: str | None, default: bool) -> bool:
    if value is None or value == "":
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _int(value: str | None, default: int) -> int:
    if not value:
        return default
    return int(value)


def _float(value: str | None, default: float) -> float:
    if not value:
        return default
    return float(value)


@dataclass(frozen=True)
class StaticSettings:
    model: str
    environment: str
    mcp_url: str
    api_token: str
    workspace_id: str
    request_id: str | None
    runtime_dir: Path
    sqlite_path: Path
    enable_langfuse: bool
    max_tool_calls: int
    max_run_seconds: int
    max_cost_usd: float
    enable_ecosystem_capabilities: bool
    context_max_tokens: int


class Settings:
    def __init__(self, base: StaticSettings) -> None:
        self._base = base

    @property
    def model(self) -> str:
        return self._base.model

    @property
    def environment(self) -> str:
        return self._base.environment

    @property
    def mcp_url(self) -> str:
        return self._base.mcp_url

    @property
    def api_token(self) -> str:
        context = get_request_context()
        if context and context.api_token:
            return context.api_token
        if context and context.authorization:
            token = extract_bearer_token(context.authorization)
            if token:
                return token
        return self._base.api_token

    @property
    def has_api_token(self) -> bool:
        return bool(self.api_token)

    @property
    def workspace_id(self) -> str:
        context = get_request_context()
        if context and context.workspace_id:
            return context.workspace_id
        return self._base.workspace_id

    @property
    def request_id(self) -> str | None:
        context = get_request_context()
        if context and context.request_id:
            return context.request_id
        return self._base.request_id

    @property
    def user_id(self) -> str | None:
        context = get_request_context()
        return context.user_id if context else None

    @property
    def runtime_dir(self) -> Path:
        return self._base.runtime_dir

    @property
    def sqlite_path(self) -> Path:
        return self._base.sqlite_path

    @property
    def enable_langfuse(self) -> bool:
        return self._base.enable_langfuse

    @property
    def max_tool_calls(self) -> int:
        return self._base.max_tool_calls

    @property
    def max_run_seconds(self) -> int:
        return self._base.max_run_seconds

    @property
    def max_cost_usd(self) -> float:
        return self._base.max_cost_usd

    @property
    def enable_ecosystem_capabilities(self) -> bool:
        return self._base.enable_ecosystem_capabilities

    @property
    def context_max_tokens(self) -> int:
        return self._base.context_max_tokens

    @property
    def session_id(self) -> str:
        context = get_request_context()
        if context and context.session_id:
            return context.session_id
        return self.request_id or "local"

    @property
    def workspace_runtime_dir(self) -> Path:
        return self.runtime_dir / "workspaces" / self.workspace_id / "sessions" / self.session_id

    def validate_for_runtime(self) -> None:
        if not self.mcp_url:
            raise RuntimeError("Missing required Nexus AI env var: NEXUS_MCP_URL")


def load_settings(env: dict[str, str] | None = None) -> Settings:
    source = env if env is not None else os.environ
    runtime_dir = Path(source.get("NEXUS_AI_RUNTIME_DIR", ".runtime"))
    sqlite_path = Path(source.get("NEXUS_AI_SQLITE_PATH", str(runtime_dir / "nexus_ai.sqlite3")))

    return Settings(
        StaticSettings(
            model=source.get("NEXUS_AI_MODEL", "openrouter:openai/gpt-4o-mini"),
            environment=source.get("NEXUS_AI_ENV", "development"),
            mcp_url=source.get("NEXUS_MCP_URL", "http://127.0.0.1:3333/mcp"),
            api_token=source.get("NEXUS_API_TOKEN", ""),
            workspace_id=source.get("NEXUS_WORKSPACE_ID", ""),
            request_id=source.get("NEXUS_REQUEST_ID") or None,
            runtime_dir=runtime_dir,
            sqlite_path=sqlite_path,
            enable_langfuse=_bool(source.get("NEXUS_AI_ENABLE_LANGFUSE"), True),
            max_tool_calls=_int(source.get("NEXUS_AI_MAX_TOOL_CALLS"), 40),
            max_run_seconds=_int(source.get("NEXUS_AI_MAX_RUN_SECONDS"), 180),
            max_cost_usd=_float(source.get("NEXUS_AI_MAX_COST_USD"), 2.0),
            enable_ecosystem_capabilities=_bool(source.get("NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES"), True),
            context_max_tokens=_int(source.get("NEXUS_AI_CONTEXT_MAX_TOKENS"), 180000),
        )
    )
