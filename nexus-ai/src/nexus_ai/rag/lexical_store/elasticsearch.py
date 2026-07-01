from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

import httpx

from nexus_ai.rag.schemas import ChildChunk, FileSource
from nexus_ai.settings import Settings


INDEX_SETTINGS = {
    "settings": {
        "analysis": {
            "analyzer": {
                "nexus_text": {
                    "type": "custom",
                    "tokenizer": "standard",
                    "filter": ["lowercase", "asciifolding"],
                }
            }
        }
    },
    "mappings": {
        "properties": {
            "workspace_id": {"type": "keyword"},
            "file_id": {"type": "keyword"},
            "parent_id": {"type": "keyword"},
            "job_id": {"type": "keyword"},
            "file_name": {
                "type": "text",
                "analyzer": "nexus_text",
                "fields": {"keyword": {"type": "keyword", "ignore_above": 512}},
            },
            "title": {
                "type": "text",
                "analyzer": "nexus_text",
                "fields": {"keyword": {"type": "keyword", "ignore_above": 512}},
            },
            "chunk_text": {"type": "text", "analyzer": "nexus_text"},
            "raw_text": {"type": "text", "analyzer": "nexus_text"},
            "contextual_header": {"type": "text", "analyzer": "nexus_text"},
            "parent_text": {"type": "text", "index": False},
            "heading_path": {"type": "keyword"},
            "page_numbers": {"type": "integer"},
            "chunk_index": {"type": "integer"},
            "mime_type": {"type": "keyword"},
            "file_hash": {"type": "keyword"},
            "context_source": {"type": "keyword"},
            "context_prompt_version": {"type": "keyword"},
            "chunking_strategy": {"type": "keyword"},
            "embedding_model": {"type": "keyword"},
            "created_at": {"type": "date"},
            "updated_at": {"type": "date"},
        }
    },
}


class ElasticsearchLexicalStore:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.base_url = settings.elasticsearch_url.rstrip("/")
        self.index_name = settings.elasticsearch_rag_chunk_index
        self._initialized = False

    @property
    def enabled(self) -> bool:
        return self.settings.rag_lexical_provider == "elasticsearch"

    async def ensure_index(self) -> None:
        if not self.enabled or self._initialized:
            return
        async with self._client() as client:
            response = await client.head(f"/{self.index_name}")
            if response.status_code == 404:
                create = await client.put(f"/{self.index_name}", json=INDEX_SETTINGS)
                create.raise_for_status()
            else:
                response.raise_for_status()
        self._initialized = True

    async def upsert_chunks(self, source: FileSource, chunks: list[ChildChunk], job_id: str) -> None:
        if not self.enabled:
            return
        await self.ensure_index()
        now = _utcnow()
        lines: list[str] = []
        for chunk in chunks:
            lines.append(json.dumps({"index": {"_index": self.index_name, "_id": chunk.child_id}}))
            lines.append(
                json.dumps(
                    {
                        "workspace_id": source.workspace_id,
                        "file_id": source.id,
                        "parent_id": chunk.parent_id,
                        "job_id": job_id,
                        "file_name": source.name,
                        "title": source.name,
                        "chunk_text": chunk.contextual_text,
                        "raw_text": chunk.text,
                        "contextual_header": chunk.contextual_header,
                        "parent_text": chunk.parent_text,
                        "heading_path": chunk.heading_path,
                        "page_numbers": chunk.page_numbers,
                        "chunk_index": chunk.chunk_index,
                        "mime_type": source.mime_type,
                        "file_hash": source.file_hash,
                        "context_source": chunk.context_source,
                        "context_prompt_version": chunk.context_prompt_version,
                        "chunking_strategy": self.settings.rag_chunking_strategy,
                        "embedding_model": self.settings.rag_embedding_model,
                        "created_at": now,
                        "updated_at": now,
                    },
                    ensure_ascii=False,
                )
            )
        payload = "\n".join(lines) + "\n"
        async with self._client() as client:
            response = await client.post(
                "/_bulk",
                content=payload,
                headers={"Content-Type": "application/x-ndjson"},
            )
            response.raise_for_status()
            body = response.json()
            if body.get("errors"):
                raise RuntimeError("Elasticsearch bulk upsert returned item errors for RAG chunks")

    async def delete_file(self, workspace_id: str, file_id: str) -> None:
        if not self.enabled:
            return
        await self.ensure_index()
        async with self._client() as client:
            response = await client.post(
                f"/{self.index_name}/_delete_by_query",
                json={
                    "query": {
                        "bool": {
                            "filter": [
                                {"term": {"workspace_id": workspace_id}},
                                {"term": {"file_id": file_id}},
                            ]
                        }
                    }
                },
            )
            response.raise_for_status()

    async def search_chunks(
        self,
        workspace_id: str,
        query: str,
        *,
        limit: int,
        file_ids: list[str] | None = None,
        document_ids: list[str] | None = None,
    ) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        await self.ensure_index()
        filters: list[dict[str, Any]] = [{"term": {"workspace_id": workspace_id}}]
        allowed_file_ids = document_ids or file_ids
        if allowed_file_ids:
            filters.append({"terms": {"file_id": allowed_file_ids}})

        request = {
            "size": limit,
            "query": {
                "bool": {
                    "filter": filters,
                    "should": [
                        {
                            "multi_match": {
                                "query": query,
                                "type": "best_fields",
                                "fields": [
                                    "chunk_text^4",
                                    "raw_text^3",
                                    "contextual_header^2",
                                    "file_name^1.5",
                                    "title^1.5",
                                ],
                            }
                        }
                    ],
                    "minimum_should_match": 1,
                }
            },
            "highlight": {
                "fields": {
                    "chunk_text": {"fragment_size": 240, "number_of_fragments": 1},
                    "raw_text": {"fragment_size": 240, "number_of_fragments": 1},
                }
            },
        }

        async with self._client() as client:
            response = await client.post(f"/{self.index_name}/_search", json=request)
            response.raise_for_status()
            payload = response.json()

        hits = payload.get("hits", {}).get("hits", [])
        max_score = max((float(hit.get("_score") or 0.0) for hit in hits), default=0.0)
        results: list[dict[str, Any]] = []
        for hit in hits:
            source = dict(hit.get("_source") or {})
            highlight = hit.get("highlight") or {}
            snippet = _first_highlight(highlight) or str(source.get("chunk_text") or source.get("raw_text") or "")
            raw_score = float(hit.get("_score") or 0.0)
            results.append(
                {
                    "id": str(hit.get("_id") or source.get("id") or ""),
                    "score": (raw_score / max_score) if max_score > 0 else raw_score,
                    "retrieval_source": "lexical",
                    "snippet": snippet,
                    "highlight": highlight,
                    **source,
                }
            )
        return results

    def _client(self) -> httpx.AsyncClient:
        headers = {"Accept": "application/json"}
        if self.settings.elasticsearch_api_key:
            headers["Authorization"] = f"ApiKey {self.settings.elasticsearch_api_key}"
        auth = None
        if self.settings.elasticsearch_username:
            auth = (self.settings.elasticsearch_username, self.settings.elasticsearch_password)
        return httpx.AsyncClient(
            base_url=self.base_url,
            headers=headers,
            auth=auth,
            verify=self.settings.elasticsearch_verify_certs,
            timeout=30.0,
        )


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


def _first_highlight(highlight: dict[str, Any]) -> str | None:
    for key in ("chunk_text", "raw_text"):
        fragments = highlight.get(key)
        if isinstance(fragments, list) and fragments:
            return str(fragments[0])
    return None
