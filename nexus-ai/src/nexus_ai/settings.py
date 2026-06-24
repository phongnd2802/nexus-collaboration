from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()  # Load .env file if present


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
class Settings:
    model: str
    environment: str
    mcp_url: str
    api_token: str
    workspace_id: str
    request_id: str | None
    runtime_dir: Path
    sqlite_path: Path
    enable_langfuse: bool
    shell_enabled: bool
    filesystem_enabled: bool
    max_tool_calls: int
    max_run_seconds: int
    max_cost_usd: float
    enable_ecosystem_capabilities: bool
    context_max_tokens: int
    agent_name: str

    @property
    def session_id(self) -> str:
        return self.request_id or "local"

    @property
    def workspace_runtime_dir(self) -> Path:
        return self.runtime_dir / "workspaces" / self.workspace_id / "sessions" / self.session_id

    @property
    def filesystem_root(self) -> Path:
        return self.workspace_runtime_dir / "files"

    @property
    def mcp_headers(self) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {self.api_token}",
            "X-Nexus-Workspace-ID": self.workspace_id,
        }
        if self.request_id:
            headers["X-Nexus-Request-ID"] = self.request_id
        return headers

    def validate_for_runtime(self) -> None:
        missing: list[str] = []
        if not self.api_token:
            missing.append("NEXUS_API_TOKEN")
        if not self.workspace_id:
            missing.append("NEXUS_WORKSPACE_ID")
        if missing:
            raise RuntimeError(f"Missing required Nexus AI env vars: {', '.join(missing)}")


def load_settings(env: dict[str, str] | None = None) -> Settings:
    source = env if env is not None else os.environ
    runtime_dir = Path(source.get("NEXUS_AI_RUNTIME_DIR", ".runtime"))
    sqlite_path = Path(source.get("NEXUS_AI_SQLITE_PATH", str(runtime_dir / "nexus_ai.sqlite3")))

    return Settings(
        model=source.get("NEXUS_AI_MODEL", "openrouter:openai/gpt-4o-mini"),
        environment=source.get("NEXUS_AI_ENV", "development"),
        mcp_url=source.get("NEXUS_MCP_URL", "http://127.0.0.1:3333/mcp"),
        api_token=source.get("NEXUS_API_TOKEN", ""),
        workspace_id=source.get("NEXUS_WORKSPACE_ID", ""),
        request_id=source.get("NEXUS_REQUEST_ID") or None,
        runtime_dir=runtime_dir,
        sqlite_path=sqlite_path,
        enable_langfuse=_bool(source.get("NEXUS_AI_ENABLE_LANGFUSE"), True),
        shell_enabled=_bool(source.get("NEXUS_AI_SHELL_ENABLED"), True),
        filesystem_enabled=_bool(source.get("NEXUS_AI_FILESYSTEM_ENABLED"), True),
        max_tool_calls=_int(source.get("NEXUS_AI_MAX_TOOL_CALLS"), 40),
        max_run_seconds=_int(source.get("NEXUS_AI_MAX_RUN_SECONDS"), 180),
        max_cost_usd=_float(source.get("NEXUS_AI_MAX_COST_USD"), 2.0),
        enable_ecosystem_capabilities=_bool(source.get("NEXUS_AI_ENABLE_ECOSYSTEM_CAPABILITIES"), True),
        context_max_tokens=_int(source.get("NEXUS_AI_CONTEXT_MAX_TOKENS"), 180000),
        agent_name=source.get("NEXUS_AI_AGENT_NAME", "nexus-ai"),
    )
