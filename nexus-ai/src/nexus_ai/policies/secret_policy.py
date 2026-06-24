from __future__ import annotations

import re


SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{12,}"),
    re.compile(r"sk-or-v1-[A-Za-z0-9_-]{12,}"),
    re.compile(r"pk-lf-[A-Za-z0-9_-]{8,}"),
    re.compile(r"sk-lf-[A-Za-z0-9_-]{8,}"),
    re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{16,}", re.IGNORECASE),
    re.compile(r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[^'\"\s,}]+"),
]


def redact_secrets(value: object) -> object:
    if isinstance(value, str):
        redacted = value
        for pattern in SECRET_PATTERNS:
            redacted = pattern.sub("[REDACTED]", redacted)
        return redacted
    if isinstance(value, list):
        return [redact_secrets(item) for item in value]
    if isinstance(value, tuple):
        return tuple(redact_secrets(item) for item in value)
    if isinstance(value, dict):
        return {key: redact_secrets(item) for key, item in value.items()}
    return value

