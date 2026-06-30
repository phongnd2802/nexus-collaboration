from contextlib import asynccontextmanager
from typing import AsyncIterator


class LangfuseTracer:
    def __init__(self, public_key: str | None, secret_key: str | None, host: str | None = None) -> None:
        self.enabled = bool(public_key and secret_key)
        self.host = host

    @asynccontextmanager
    async def span(self, _name: str, **_metadata: object) -> AsyncIterator[None]:
        yield

