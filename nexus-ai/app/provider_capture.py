import json
from codecs import getincrementaldecoder
from dataclasses import dataclass, field
from collections.abc import AsyncIterator
from pathlib import Path

import httpx


@dataclass
class ProviderCaptureState:
    first_text_delta: str | None = None
    _buffer: str = field(default="", init=False, repr=False)
    _decoder: object = field(default_factory=lambda: getincrementaldecoder("utf-8")(), init=False, repr=False)

    def ingest_bytes(self, chunk: bytes) -> None:
        self._buffer += self._decoder.decode(chunk)
        while "\n\n" in self._buffer:
            event, self._buffer = self._buffer.split("\n\n", 1)
            self._ingest_event(event)

    def _ingest_event(self, event: str) -> None:
        for line in event.splitlines():
            if not line.startswith("data: "):
                continue
            raw = line.removeprefix("data: ").strip()
            if raw == "[DONE]":
                return
            try:
                payload = json.loads(raw)
            except Exception:
                return
            content = payload.get("choices", [{}])[0].get("delta", {}).get("content")
            if isinstance(content, str) and content and self.first_text_delta is None:
                self.first_text_delta = content
                return


class TeeAsyncByteStream(httpx.AsyncByteStream):
    def __init__(
        self,
        stream: httpx.AsyncByteStream,
        output_path: Path | None,
        capture_state: ProviderCaptureState,
    ) -> None:
        self._stream = stream
        self._output_path = output_path
        self._capture_state = capture_state

    async def __aiter__(self) -> AsyncIterator[bytes]:
        handle = self._output_path.open("ab") if self._output_path else None
        try:
            async for chunk in self._stream:
                if handle:
                    handle.write(chunk)
                self._capture_state.ingest_bytes(chunk)
                yield chunk
        finally:
            if handle:
                handle.close()

    async def aclose(self) -> None:
        await self._stream.aclose()


class RawCaptureTransport(httpx.AsyncBaseTransport):
    def __init__(
        self,
        wrapped: httpx.AsyncBaseTransport,
        output_path: Path | None,
        capture_state: ProviderCaptureState,
    ) -> None:
        self._wrapped = wrapped
        self._output_path = output_path
        self._capture_state = capture_state

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        if self._output_path:
            self._output_path.parent.mkdir(parents=True, exist_ok=True)
            with self._output_path.open("ab") as handle:
                handle.write(
                    json.dumps(
                        {
                            "request": {
                                "method": request.method,
                                "url": str(request.url),
                                "headers": dict(request.headers),
                            }
                        },
                        ensure_ascii=True,
                        indent=2,
                    ).encode("utf-8")
                )
                handle.write(b"\n")
                handle.write(b"--- provider raw response ---\n")

        response = await self._wrapped.handle_async_request(request)
        stream = response.stream
        if isinstance(stream, httpx.AsyncByteStream):
            response.stream = TeeAsyncByteStream(stream, self._output_path, self._capture_state)
            return response

        if self._output_path:
            with self._output_path.open("ab") as handle:
                handle.write(response.content)
                handle.write(b"\n")
        return response

    async def aclose(self) -> None:
        await self._wrapped.aclose()


def create_provider_http_client(output_path: Path | None, capture_state: ProviderCaptureState) -> httpx.AsyncClient:
    transport = RawCaptureTransport(httpx.AsyncHTTPTransport(), output_path, capture_state)
    return httpx.AsyncClient(transport=transport, timeout=60)
