from types import SimpleNamespace
import importlib

import pytest

from app.config import settings

backend_client_module = importlib.import_module("app.tools.backend_client")
lookup_member_module = importlib.import_module("app.tools.workspace.get_member_id_by_name")


class FakeResponse:
    def __init__(self, payload: object, status_code: int = 200) -> None:
        self._payload = payload
        self.status_code = status_code
        self.text = ""

    def json(self) -> object:
        return self._payload


class FakeAsyncClient:
    def __init__(self, response: FakeResponse) -> None:
        self.response = response
        self.calls: list[tuple[str, str, dict | None]] = []

    async def __aenter__(self) -> "FakeAsyncClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def request(
        self,
        method: str,
        url: str,
        *,
        json: dict | None = None,
        headers: dict | None = None,
    ) -> FakeResponse:
        self.calls.append((method, url, headers))
        return self.response


def _ctx() -> SimpleNamespace:
    return SimpleNamespace(deps=SimpleNamespace(user_id="user_1", workspace_id="ws_1"))


def _member(user_id: str, *, name: str | None = None, username: str | None = None, email: str | None = None) -> dict:
    return {
        "id": f"wm_{user_id}",
        "workspace_id": "ws_1",
        "user_id": user_id,
        "role": "member",
        "user": {
            "id": user_id,
            "name": name,
            "username": username,
            "email": email,
        },
    }


@pytest.mark.asyncio
async def test_get_member_id_by_name_matches_name(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse([_member("user_2", name="Alice Nguyen", username="alice", email="alice@example.com")]))
    monkeypatch.setattr(backend_client_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    result = await lookup_member_module.get_member_id_by_name(_ctx(), "  alice nguyen ")

    assert client.calls == [
        (
            "GET",
            "http://backend.test/api/v1/internal/agent/workspaces/ws_1/members",
            {
                "x-nexus-internal-token": "token",
                "x-user-id": "user_1",
                "x-workspace-id": "ws_1",
            },
        )
    ]
    assert result == {
        "matched": True,
        "user_id": "user_2",
        "member": {
            "user_id": "user_2",
            "name": "Alice Nguyen",
            "username": "alice",
            "email": "alice@example.com",
            "role": "member",
        },
        "matched_by": "name",
    }


@pytest.mark.asyncio
async def test_get_member_id_by_name_falls_back_to_username(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse([_member("user_2", name="Alice Nguyen", username="alice", email="alice@example.com")]))
    monkeypatch.setattr(backend_client_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    result = await lookup_member_module.get_member_id_by_name(_ctx(), "alice")

    assert result["matched"] is True
    assert result["user_id"] == "user_2"
    assert result["matched_by"] == "username"


@pytest.mark.asyncio
async def test_get_member_id_by_name_falls_back_to_email(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse([_member("user_2", name="Alice Nguyen", username="alice", email="alice@example.com")]))
    monkeypatch.setattr(backend_client_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    result = await lookup_member_module.get_member_id_by_name(_ctx(), "alice@example.com")

    assert result["matched"] is True
    assert result["user_id"] == "user_2"
    assert result["matched_by"] == "email"


@pytest.mark.asyncio
async def test_get_member_id_by_name_returns_ambiguous_candidates(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = [
        _member("user_2", name="Alice Nguyen", username="alice", email="alice1@example.com"),
        _member("user_3", name="Alice Nguyen", username="alice.ng", email="alice2@example.com"),
    ]
    client = FakeAsyncClient(FakeResponse(payload))
    monkeypatch.setattr(backend_client_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    result = await lookup_member_module.get_member_id_by_name(_ctx(), "Alice Nguyen")

    assert result == {
        "matched": False,
        "reason": "ambiguous",
        "matched_by": "name",
        "candidates": [
            {
                "user_id": "user_2",
                "name": "Alice Nguyen",
                "username": "alice",
                "email": "alice1@example.com",
                "role": "member",
            },
            {
                "user_id": "user_3",
                "name": "Alice Nguyen",
                "username": "alice.ng",
                "email": "alice2@example.com",
                "role": "member",
            },
        ],
    }


@pytest.mark.asyncio
async def test_get_member_id_by_name_returns_not_found(monkeypatch: pytest.MonkeyPatch) -> None:
    client = FakeAsyncClient(FakeResponse([_member("user_2", name="Alice Nguyen", username="alice", email="alice@example.com")]))
    monkeypatch.setattr(backend_client_module.httpx, "AsyncClient", lambda timeout: client)
    monkeypatch.setattr(settings, "nexus_internal_api_token", "token", raising=False)
    monkeypatch.setattr(settings, "nexus_backend_base_url", "http://backend.test/api/v1", raising=False)

    result = await lookup_member_module.get_member_id_by_name(_ctx(), "Bob Tran")

    assert result == {
        "matched": False,
        "reason": "not_found",
        "candidates": [],
    }
