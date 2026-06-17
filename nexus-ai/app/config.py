from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    openrouter_api_key: str = ""
    nexus_ai_model: str = "openai/gpt-4o-mini"
    nexus_ai_api_key: str = ""
    nexus_ai_host: str = "0.0.0.0"
    nexus_ai_port: int = 8000
    openrouter_app_url: str | None = None
    openrouter_app_title: str | None = "Nexus"


settings = Settings()
