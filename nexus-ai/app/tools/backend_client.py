from typing import Any
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException

from app.config import settings


async def request_backend(
    *,
    user_id: str,
    workspace_id: str,
    method: str,
    path: str,
    query: dict[str, Any] | None = None,
    body: dict[str, Any] | None = None,
) -> Any:
    if not settings.nexus_internal_api_token:
        raise HTTPException(
            status_code=500,
            detail="NEXUS_INTERNAL_API_TOKEN is not configured for nexus-ai",
        )

    url = f"{settings.nexus_backend_base_url.rstrip('/')}/internal/agent/workspaces/{workspace_id}{path}"
    filtered_query = {key: value for key, value in (query or {}).items() if value is not None}
    if filtered_query:
        url = f"{url}?{urlencode(filtered_query)}"

    headers = {
        "x-nexus-internal-token": settings.nexus_internal_api_token,
        "x-user-id": user_id,
        "x-workspace-id": workspace_id,
    }

    print(
        "[nexus-ai] internal api request",
        {
            "method": method,
            "url": url,
            "user_id": user_id,
            "workspace_id": workspace_id,
            "query": filtered_query or None,
            "body": body,
        },
    )

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.request(method, url, json=body, headers=headers)

    print(
        "[nexus-ai] internal api response",
        {
            "method": method,
            "url": url,
            "status_code": response.status_code,
        },
    )

    if response.status_code >= 400:
        try:
            payload = response.json()
            detail = payload.get("message") or payload.get("error")
        except Exception:
            detail = response.text
        print(
            "[nexus-ai] internal api error",
            {
                "method": method,
                "url": url,
                "status_code": response.status_code,
                "detail": detail,
            },
        )
        raise HTTPException(response.status_code, detail or "Nexus backend request failed")

    if response.status_code == 204:
        print(
            "[nexus-ai] internal api result",
            {
                "method": method,
                "url": url,
                "result": None,
            },
        )
        return None
    result = response.json()
    print(
        "[nexus-ai] internal api result",
        {
            "method": method,
            "url": url,
            "result": result,
        },
    )
    return result
