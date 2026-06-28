from __future__ import annotations

import httpx
import math

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
                json={
                    "model": self.settings.rag_embedding_model,
                    "input": texts,
                    "encoding_format": "float",
                },
            )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data")
        if not isinstance(data, list):
            raise RuntimeError("Invalid OpenRouter embeddings response")

        vectors: list[list[float]] = []
        for index, item in enumerate(data):
            embedding = item.get("embedding") if isinstance(item, dict) else None
            if not isinstance(embedding, list) or not embedding:
                raise RuntimeError(f"Invalid OpenRouter embedding at index {index}: missing float vector")

            vector: list[float] = []
            for value in embedding:
                if not isinstance(value, (int, float)) or not math.isfinite(float(value)):
                    raise RuntimeError(f"Invalid OpenRouter embedding at index {index}: non-finite value")
                vector.append(float(value))
            vectors.append(vector)

        if len(vectors) != len(texts):
            raise RuntimeError(
                f"Invalid OpenRouter embeddings response: expected {len(texts)} vectors, got {len(vectors)}"
            )
        return vectors
