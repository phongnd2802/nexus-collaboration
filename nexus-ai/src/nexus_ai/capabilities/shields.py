from __future__ import annotations

PROMPT_INJECTION_MARKERS = [
    "ignore previous instructions",
    "ignore all previous instructions",
    "reveal your system prompt",
    "show hidden instructions",
    "bypass safety",
]


def validate_user_input(prompt: str) -> None:
    lower = prompt.lower()
    for marker in PROMPT_INJECTION_MARKERS:
        if marker in lower:
            raise ValueError(f"Input rejected by Nexus AI guardrail: {marker}")

