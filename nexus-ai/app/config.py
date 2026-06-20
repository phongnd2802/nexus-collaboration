from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../backend/.env"),
        extra="ignore",
    )

    openrouter_api_key: str = ""
    nexus_ai_model: str = "openai/gpt-4o-mini"
    nexus_ai_api_key: str = ""
    nexus_ai_host: str = "0.0.0.0"
    nexus_ai_port: int = 8000
    nexus_backend_base_url: str = "http://localhost:3002/api/v1"
    nexus_internal_api_token: str = ""
    nexus_ai_raw_response_dir: str = "raw-provider-responses"
    nexus_ai_debug_log: bool = False
    nexus_ai_raw_provider_capture: bool = False
    openrouter_app_url: str | None = None
    openrouter_app_title: str | None = "Nexus"


settings = Settings()
