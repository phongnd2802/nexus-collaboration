from typing import Any


class QdrantRagStore:
    def __init__(
        self,
        url: str,
        api_key: str | None,
        document_collection: str = "nexus_rag_documents",
        chunk_collection: str = "nexus_rag_chunks",
    ) -> None:
        self.url = url
        self.api_key = api_key
        self.document_collection = document_collection
        self.chunk_collection = chunk_collection
        self._client: Any | None = None

    def client(self):
        if self._client is not None:
            return self._client
        from qdrant_client import AsyncQdrantClient

        self._client = AsyncQdrantClient(url=self.url, api_key=self.api_key)
        return self._client

    async def delete_file(self, workspace_id: str, file_id: str) -> None:
        from qdrant_client.http import models

        selector = models.Filter(
            must=[
                models.FieldCondition(key="workspace_id", match=models.MatchValue(value=workspace_id)),
                models.FieldCondition(key="file_id", match=models.MatchValue(value=file_id)),
            ]
        )
        client = self.client()
        for collection in (self.document_collection, self.chunk_collection):
            await client.delete(collection_name=collection, points_selector=selector)

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()

