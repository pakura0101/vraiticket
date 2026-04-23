from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "VraiTicket"
    # Safe defaults — explicitly set APP_ENV=development in your local .env
    APP_ENV: str = "production"
    DEBUG: bool = False

    # ── Database ───────────────────────────────────────────────
    DATABASE_URL: str

    # ── JWT ────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Redis / Celery ─────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/1"

    # ── SLA ────────────────────────────────────────────────────
    DEFAULT_SLA_HOURS: int = 24

    # ── CORS ───────────────────────────────────────────────────
    # Comma-separated list of allowed origins.
    # Example: "https://app.vraiticket.io,https://admin.vraiticket.io"
    # In DEBUG mode this is ignored and all origins are allowed.
    ALLOWED_ORIGINS: str = ""

    # ── Seed admin ─────────────────────────────────────────────
    # Required — no defaults so that a misconfigured deploy fails loudly
    # rather than silently creating a predictable admin account.
    FIRST_ADMIN_EMAIL: str
    FIRST_ADMIN_PASSWORD: str

    # ── Derived helper ─────────────────────────────────────────
    @property
    def allowed_origins_list(self) -> List[str]:
        if self.DEBUG:
            return ["*"]
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
