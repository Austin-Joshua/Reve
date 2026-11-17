import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field, model_validator

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ROOT_DIR = _BACKEND_DIR.parent
_DEFAULT_DB_FILE = (_BACKEND_DIR / "reve_dev.db").as_posix()


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

    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{_DEFAULT_DB_FILE}"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"

    # S3 / MinIO
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
    def validate_production_secrets(self) -> "Settings":
        if self.REVE_WORKER_SECRET_TOKEN:
            os.environ["REVE_WORKER_SECRET_TOKEN"] = self.REVE_WORKER_SECRET_TOKEN
        if self.ENVIRONMENT == "production":
            if "dev-" in self.JWT_SECRET_KEY or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError("JWT_SECRET_KEY must be a secure random key with at least 32 characters in production.")
            if "dev-" in self.REVE_WORKER_SECRET_TOKEN or len(self.REVE_WORKER_SECRET_TOKEN) < 16:
                raise ValueError("REVE_WORKER_SECRET_TOKEN must be a secure non-default secret in production.")
        return self


settings = Settings()
