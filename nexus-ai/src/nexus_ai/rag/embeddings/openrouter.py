from __future__ import annotations

import httpx

from nexus_ai.settings import Settings


class OpenRouterEmbeddingClient:
    def __init__(self, settings: Settings) -> None:
        if not settings.openrouter_api_key:
            raise RuntimeError("OPENROUTER_API_KEY is required for RAG embeddings")
        self.settings = settings

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                },
                json={"model": self.settings.rag_embedding_model, "input": texts},
            )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data")
        if not isinstance(data, list):
            raise RuntimeError("Invalid OpenRouter embeddings response")
        return [item["embedding"] for item in data]
