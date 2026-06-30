from collections.abc import AsyncIterator

import httpx


class OpenRouterClient:
    def __init__(self, api_key: str, model: str, timeout: float = 60.0) -> None:
        self.api_key = api_key
        self.model = model
        self.timeout = timeout

    async def complete(self, messages: list[dict[str, str]]) -> str:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://nexus.local",
                    "X-Title": "Nexus Collaboration",
                },
                json={"model": self.model, "messages": messages},
            )
            response.raise_for_status()
            payload = response.json()
        choices = payload.get("choices") or []
        if not choices:
            return ""
        content = choices[0].get("message", {}).get("content")
        return content if isinstance(content, str) else ""


async def chunk_text(text: str, size: int = 48) -> AsyncIterator[str]:
    for index in range(0, len(text), size):
        yield text[index : index + size]

