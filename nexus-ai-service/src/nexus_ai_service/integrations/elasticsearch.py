from typing import Any


class ElasticsearchLexicalIndex:
    def __init__(self, url: str, index_name: str = "nexus-rag-chunks-v1") -> None:
        self.url = url
        self.index_name = index_name
        self._client: Any | None = None

    def client(self):
        if self._client is not None:
            return self._client
        from elasticsearch import AsyncElasticsearch

        self._client = AsyncElasticsearch(self.url)
        return self._client

    async def index_chunk(self, chunk_id: str, document: dict[str, Any]) -> None:
        await self.client().index(index=self.index_name, id=chunk_id, document=document)

    async def search(self, workspace_id: str, query: str, file_ids: list[str], limit: int) -> list[dict[str, Any]]:
        body = {
            "size": limit,
            "query": {
                "bool": {
                    "must": [{"multi_match": {"query": query, "fields": ["title", "chunk_text", "raw_text", "content"]}}],
                    "filter": [
                        {"term": {"workspace_id": workspace_id}},
                        {"terms": {"file_id": file_ids}},
                    ],
                }
            },
        }
        result = await self.client().search(index=self.index_name, body=body)
        return list(result.get("hits", {}).get("hits", []))

    async def close(self) -> None:
        if self._client is not None:
            await self._client.close()

