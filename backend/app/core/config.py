import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent
_DEFAULT_DB_FILE = (_BACKEND_DIR / "reve_dev.db").as_posix()


def normalize_database_url(url: str) -> str:
    """
    Normalizes database connection strings for SQLAlchemy async engine compatibility:
    - postgres:// -> postgresql+asyncpg://
    - postgresql:// -> postgresql+asyncpg:// (if missing driver)
    - sqlite:// -> sqlite+aiosqlite:// (if missing driver)
    - replaces sslmode= with ssl= for asyncpg parameter compatibility
    """
    if not url:
        return url
    trimmed = url.strip()
    if trimmed.startswith("postgres://"):
        trimmed = trimmed.replace("postgres://", "postgresql+asyncpg://", 1)
    elif trimmed.startswith("postgresql://") and "+asyncpg" not in trimmed:
        trimmed = trimmed.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif trimmed.startswith("sqlite://") and "+aiosqlite" not in trimmed:
        trimmed = trimmed.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # asyncpg does not accept 'sslmode' query param, expects 'ssl'
    if "sslmode=" in trimmed:
        trimmed = (
            trimmed.replace("sslmode=require", "ssl=require")
            .replace("sslmode=prefer", "ssl=prefer")
            .replace("sslmode=disable", "ssl=disable")
        )

    return trimmed


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Reve-Inspired AI Platform"
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]

    # Security & Auth
    JWT_SECRET_KEY: str = "dev-insecure-secret-key-min-32-chars-long-reve-platform"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    REVE_WORKER_SECRET_TOKEN: str = "dev-reve-remote-worker-secret-token"

    # Abuse Protection & Rate Limiting
    ENABLE_RATE_LIMITING: bool = True
    MAX_CONCURRENT_JOBS_PER_USER: int = 1
    MAX_GENERATIONS_PER_USER_WINDOW: int = 10
    GENERATION_WINDOW_SECONDS: int = 300  # 10 generations per 5 mins
    MAX_REGISTRATIONS_PER_IP_HOUR: int = 5
    MAX_UPLOADS_PER_USER_HOUR: int = 20
    INVITE_ONLY_REGISTRATION: bool = False
    INVITE_CODE: Optional[str] = None

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_DEFAULT_DB_FILE}"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # S3 / MinIO / Cloudflare R2
    S3_ENDPOINT_URL: Optional[str] = "http://localhost:9000"
    S3_BUCKET: str = "reve-assets"
    AWS_ACCESS_KEY_ID: str = "minioadmin"
    AWS_SECRET_ACCESS_KEY: str = "minioadmin"
    AWS_REGION: str = "us-east-1"
    S3_USE_SSL: bool = False
    S3_PUBLIC_URL: Optional[str] = "http://localhost:9000/reve-assets"

    # AI Model Provider
    IMAGE_PROVIDER: str = "local_diffusers"
    HF_MODEL_ID: str = "black-forest-labs/FLUX.1-dev"
    HF_FALLBACK_MODEL_ID: str = "stabilityai/stable-diffusion-xl-base-1.0"
    ALLOW_CPU_INFERENCE: bool = True

    model_config = {
        "env_file": (
            str(_ROOT_DIR / ".env"),
            str(_BACKEND_DIR / ".env"),
            ".env",
        ),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }

    @model_validator(mode="after")
    def validate_and_normalize(self) -> "Settings":
        # Always normalize DATABASE_URL for driver compatibility
        self.DATABASE_URL = normalize_database_url(self.DATABASE_URL)

        if self.REVE_WORKER_SECRET_TOKEN:
            os.environ["REVE_WORKER_SECRET_TOKEN"] = self.REVE_WORKER_SECRET_TOKEN

        if self.ENVIRONMENT == "production":
            if self.DEBUG:
                raise ValueError("DEBUG must be set to False in production.")
            if self.IMAGE_PROVIDER != "remote_worker":
                raise ValueError(
                    f"IMAGE_PROVIDER must be 'remote_worker' in production (got '{self.IMAGE_PROVIDER}'). "
                    "Render free-tier 512MB RAM will crash if local Diffusers inference is attempted."
                )
            if "sqlite" in self.DATABASE_URL.lower():
                raise ValueError(
                    "DATABASE_URL must point to a persistent PostgreSQL database in production (e.g. Supabase). "
                    "SQLite on Render is ephemeral and will lose data on restart."
                )
            if "dev-" in self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be a secure random key with at least 32 characters in production.")
            if "dev-" in self.REVE_WORKER_SECRET_TOKEN or len(self.REVE_WORKER_SECRET_TOKEN) < 16:
                raise ValueError("REVE_WORKER_SECRET_TOKEN must be a secure non-default secret in production.")
            if not self.S3_BUCKET or not self.AWS_ACCESS_KEY_ID or self.AWS_ACCESS_KEY_ID == "minioadmin":
                raise ValueError(
                    "Cloudflare R2 / S3 storage credentials must be configured in production (local storage is ephemeral on Render)."
                )

        return self


settings = Settings()
