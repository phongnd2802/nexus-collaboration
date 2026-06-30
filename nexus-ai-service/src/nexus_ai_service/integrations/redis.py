from typing import Any


class RedisQueue:
    def __init__(self, redis_url: str) -> None:
        self.redis_url = redis_url

    async def enqueue_rag_index(self, payload: dict[str, Any]) -> Any:
        from arq import create_pool
        from arq.connections import RedisSettings

        settings = RedisSettings.from_dsn(self.redis_url)
        pool = await create_pool(settings)
        try:
            return await pool.enqueue_job(
                "rag_index_file",
                payload,
                _job_id=self.idempotency_key(payload),
                _defer_by=0,
            )
        finally:
            await pool.close()

    def idempotency_key(self, payload: dict[str, Any]) -> str:
        return f"rag:index:{payload['workspace_id']}:{payload['file_id']}:{payload['job_id']}"
