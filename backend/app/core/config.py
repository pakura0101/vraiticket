from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # ── Application ────────────────────────────────────────────
    APP_NAME: str = "VraiTicket"
    APP_ENV: str = "development"
    DEBUG: bool = True

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

    # ── Seed admin ─────────────────────────────────────────────
    FIRST_ADMIN_EMAIL: str = "admin@vraiticket.io"
    FIRST_ADMIN_PASSWORD: str = "Admin@12345"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
