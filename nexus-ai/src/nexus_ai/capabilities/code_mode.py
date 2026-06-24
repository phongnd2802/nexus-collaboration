from __future__ import annotations

from typing import Any


def create_code_mode_capability() -> Any:
    try:
        from pydantic_ai_harness import CodeMode
    except ImportError as exc:
        raise RuntimeError("CodeMode is unavailable. Install pydantic-ai-harness[code-mode].") from exc

    return CodeMode(tools={"code_mode": True}, max_retries=3)

