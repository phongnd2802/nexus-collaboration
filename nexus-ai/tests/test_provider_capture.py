from pathlib import Path

import httpx
import pytest

from app.provider_capture import ProviderCaptureState, RawCaptureTransport


class StaticAsyncByteStream(httpx.AsyncByteStream):
    def __init__(self, chunks: list[bytes]) -> None:
        self._chunks = chunks

    async def __aiter__(self):
        for chunk in self._chunks:
            yield chunk

    async def aclose(self) -> None:
        return None


class FakeTransport(httpx.AsyncBaseTransport):
    def __init__(self, chunks: list[bytes]) -> None:
        self._chunks = chunks

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            request=request,
            stream=StaticAsyncByteStream(self._chunks),
        )

    async def aclose(self) -> None:
        return None


@pytest.mark.asyncio
async def test_raw_capture_transport_writes_streamed_response(tmp_path: Path) -> None:
    output_path = tmp_path / "provider-response.txt"
    transport = RawCaptureTransport(FakeTransport([b"chunk-1", b"chunk-2"]), output_path, ProviderCaptureState())
    request = httpx.Request("POST", "https://example.com/chat")

    response = await transport.handle_async_request(request)
    body = b"".join([chunk async for chunk in response.aiter_bytes()])

    assert body == b"chunk-1chunk-2"
    content = output_path.read_bytes()
    assert b'"url": "https://example.com/chat"' in content
    assert b"--- provider raw response ---" in content
    assert content.endswith(b"chunk-1chunk-2")


def test_provider_capture_state_records_first_text_delta() -> None:
    state = ProviderCaptureState()
    state.ingest_bytes(
        b'data: {"choices":[{"delta":{"content":"Xin","role":"assistant"},"finish_reason":null}]}\n\n'
    )
    state.ingest_bytes(
        b'data: {"choices":[{"delta":{"content":" ch","role":"assistant"},"finish_reason":null}]}\n\n'
    )

    assert state.first_text_delta == "Xin"
