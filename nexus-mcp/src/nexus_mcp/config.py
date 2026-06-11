from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mcp_server_name: str = "autopilot_core"
    nexus_internal_api_url: str = "http://localhost:3002/api/v1/internal/mcp"
    nexus_internal_api_token: str = "change-me"
    request_timeout_seconds: float = 30.0


settings = Settings()

