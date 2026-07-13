from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite+aiosqlite:///./dev.db"

    # No default on purpose — the code review flagged a hardcoded
    # "dev-secret" fallback as a critical vuln. We fail fast instead.
    jwt_secret: str = ""

    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    frontend_origins: str = "http://localhost:3000"

    app_env: str = "development"
    debug: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.jwt_secret:
        if settings.app_env == "development":
            # Convenience only for local dev so `uvicorn app.main:app` works
            # out of the box; production MUST set a real JWT_SECRET or this
            # raises below.
            settings.jwt_secret = "dev-only-insecure-secret-do-not-deploy"
        else:
            raise RuntimeError(
                "JWT_SECRET environment variable must be set in non-development environments."
            )
    return settings
