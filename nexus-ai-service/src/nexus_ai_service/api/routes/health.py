from fastapi import APIRouter, Request

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, object]:
    settings = request.app.state.settings
    return {
        "status": "ok",
        "service": "nexus-ai-service",
        "model": settings.nexus_ai_model,
        "dependencies": {
            "qdrant": settings.qdrant_url,
            "elasticsearch": settings.elasticsearch_url,
            "redis": settings.redis_url,
        },
    }

