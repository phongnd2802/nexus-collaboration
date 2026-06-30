import uvicorn

from nexus_ai_service.core.config import get_settings


def main() -> None:
    settings = get_settings()
    uvicorn.run(
        "nexus_ai_service.app:create_app",
        factory=True,
        host="0.0.0.0",
        port=settings.nexus_ai_port,
    )


if __name__ == "__main__":
    main()

