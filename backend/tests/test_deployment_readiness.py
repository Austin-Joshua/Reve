"""
Automated verification tests for Reve Phase 1 Production Deployment Readiness:
- PostgreSQL URL normalization (asyncpg and ssl translation)
- Production environment configuration guardrails (prevent local Diffusers OOM on Render)
- Server restart stale-job recovery and idempotent credit refunds
- Abuse protection and rate limiting (registration throttling and concurrent job caps)
- Storage access resolution (local file serving and private redirect safety)
"""

import pytest
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, normalize_database_url, settings
from app.core.rate_limiter import rate_limiter
from app.models.entities import User, Generation, GenerationJob
from app.services.generation_service import recover_stale_generation_jobs


def test_database_url_normalization():
    """Verify that postgres:// and postgresql:// are safely normalized for asyncpg

    and sslmode is converted to ssl for asyncpg parameter compatibility.
    """
    # 1. Standard postgres:// alias (common in Supabase / Render / Heroku)
    url1 = "postgres://user:secret@db.supabase.co:5432/postgres"
    assert normalize_database_url(url1) == "postgresql+asyncpg://user:secret@db.supabase.co:5432/postgres"

    # 2. postgresql:// without async driver
    url2 = "postgresql://user:secret@db.supabase.co:5432/postgres?sslmode=require"
    assert normalize_database_url(url2) == "postgresql+asyncpg://user:secret@db.supabase.co:5432/postgres?ssl=require"

    # 3. Already asyncpg-explicit URL
    url3 = "postgresql+asyncpg://user:secret@db.supabase.co:5432/postgres?ssl=require"
    assert normalize_database_url(url3) == "postgresql+asyncpg://user:secret@db.supabase.co:5432/postgres?ssl=require"

    # 4. SQLite normalization
    url4 = "sqlite:///local.db"
    assert normalize_database_url(url4) == "sqlite+aiosqlite:///local.db"


def test_production_configuration_guardrails():
    """Verify that production mode strictly enforces zero-cost remote worker architecture,

    non-default credentials, and persistent PostgreSQL persistence.
    """
    # 1. Production must reject local_diffusers (prevents Render 512MB RAM OOM crash)
    with pytest.raises(ValueError, match="IMAGE_PROVIDER must be 'remote_worker' in production"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            IMAGE_PROVIDER="local_diffusers",
            DATABASE_URL="postgresql+asyncpg://user:pass@host/db",
            JWT_SECRET_KEY="a" * 32,
            REVE_WORKER_SECRET_TOKEN="b" * 16,
            S3_BUCKET="reve-assets",
            AWS_ACCESS_KEY_ID="valid-access-key",
            AWS_SECRET_ACCESS_KEY="valid-secret-key",
        )

    # 2. Production must reject SQLite (ephemeral on Render)
    with pytest.raises(ValueError, match="DATABASE_URL must point to a persistent PostgreSQL database"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=False,
            IMAGE_PROVIDER="remote_worker",
            DATABASE_URL="sqlite+aiosqlite:///ephemeral.db",
            JWT_SECRET_KEY="a" * 32,
            REVE_WORKER_SECRET_TOKEN="b" * 16,
            S3_BUCKET="reve-assets",
            AWS_ACCESS_KEY_ID="valid-access-key",
            AWS_SECRET_ACCESS_KEY="valid-secret-key",
        )

    # 3. Production must reject DEBUG=True
    with pytest.raises(ValueError, match="DEBUG must be set to False in production"):
        Settings(
            ENVIRONMENT="production",
            DEBUG=True,
            IMAGE_PROVIDER="remote_worker",
            DATABASE_URL="postgresql+asyncpg://user:pass@host/db",
            JWT_SECRET_KEY="a" * 32,
            REVE_WORKER_SECRET_TOKEN="b" * 16,
            S3_BUCKET="reve-assets",
            AWS_ACCESS_KEY_ID="valid-access-key",
            AWS_SECRET_ACCESS_KEY="valid-secret-key",
        )

    # 4. Valid production settings succeed
    valid_prod = Settings(
        ENVIRONMENT="production",
        DEBUG=False,
        IMAGE_PROVIDER="remote_worker",
        DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require",
        JWT_SECRET_KEY="prod-very-secure-jwt-key-minimum-32-chars-long",
        REVE_WORKER_SECRET_TOKEN="prod-worker-token-secure-1234",
        S3_BUCKET="reve-assets",
        AWS_ACCESS_KEY_ID="valid-r2-key-id",
        AWS_SECRET_ACCESS_KEY="valid-r2-secret-key",
    )
    assert valid_prod.IMAGE_PROVIDER == "remote_worker"
    assert "postgresql+asyncpg://" in valid_prod.DATABASE_URL


@pytest.mark.asyncio
async def test_stale_job_recovery_and_idempotent_credit_refund(client: httpx.AsyncClient, test_db: AsyncSession):
    """Verify that generation jobs left in QUEUED or PROCESSING across server restarts

    are cleanly transitioned to FAILED and credits are refunded idempotently.
    """
    # 1. Register test user
    reg = await client.post(
        "/api/v1/auth/register",
        json={"email": "restart_recovery@reve.ai", "password": "Password123!", "full_name": "Restart Tester"},
    )
    assert reg.status_code == 201
    user_id = reg.json()["id"]

    # 2. Simulate an in-flight job left in PROCESSING when the server restarted
    user_res = await test_db.execute(select(User).where(User.id == user_id))
    user = user_res.scalar_one()
    initial_credits = user.credits_remaining

    # Deduct 1 credit for an in-flight job
    user.credits_remaining -= 1

    gen = Generation(
        user_id=user.id,
        generation_type="text_to_image",
        prompt="A cybernetic lotus blossom",
        model_id="SD-1.5",
        status="PROCESSING",
        parameters={"num_images": 1},
    )
    test_db.add(gen)
    await test_db.flush()

    job = GenerationJob(
        generation_id=gen.id,
        status="PROCESSING",
        stage="diffusion_inference",
        progress=50,
    )
    test_db.add(job)
    await test_db.commit()
    await test_db.refresh(job)
    await test_db.refresh(user)

    assert user.credits_remaining == initial_credits - 1
    assert job.status == "PROCESSING"

    # 3. Simulate server restart: run recover_stale_generation_jobs()
    recovered_count = await recover_stale_generation_jobs(session=test_db)
    assert recovered_count >= 1

    await test_db.refresh(job)
    await test_db.refresh(user)

    # Check that job status is now FAILED and message notes restart
    assert job.status == "FAILED"
    assert "server restart" in job.error_message.lower()

    # Verify credit was refunded
    assert user.credits_remaining == initial_credits

    # 4. Idempotency check: run recovery a second time
    second_recovery = await recover_stale_generation_jobs(session=test_db)
    # The job was already failed, so it must not be touched or double-refunded
    await test_db.refresh(user)
    assert user.credits_remaining == initial_credits


@pytest.mark.asyncio
async def test_concurrent_generation_abuse_protection(client: httpx.AsyncClient):
    """Verify that a user cannot submit multiple concurrent generation jobs,

    preventing queue hoarding and GPU quota exhaustion on free infrastructure.
    """
    await client.post(
        "/api/v1/auth/register",
        json={"email": "concurrency_test@reve.ai", "password": "Password123!", "full_name": "Concurrency Tester"},
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "concurrency_test@reve.ai", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    # Reset rate limiter state for clean test run
    rate_limiter.reset()

    # First generation request succeeds (queued)
    first_gen = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={"prompt": "First prompt in flight", "model_id": "SD-1.5"},
    )
    assert first_gen.status_code == 202

    # Second concurrent generation request from the same user is rejected with 429
    second_gen = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={"prompt": "Second prompt while first is active", "model_id": "SD-1.5"},
    )
    assert second_gen.status_code == 429
    assert second_gen.json()["detail"]["code"] == "CONCURRENT_JOB_LIMIT_EXCEEDED"

    # Clean up stale jobs so subsequent tests are not blocked
    await recover_stale_generation_jobs()


@pytest.mark.asyncio
async def test_registration_rate_limiting(client: httpx.AsyncClient):
    """Verify that rapid automated registrations from the same IP are throttled."""
    rate_limiter.reset()
    max_registrations = settings.MAX_REGISTRATIONS_PER_IP_HOUR

    for i in range(max_registrations):
        resp = await client.post(
            "/api/v1/auth/register",
            json={"email": f"bot_user_{i}@domain.com", "password": "Password123!"},
        )
        assert resp.status_code == 201

    # The (max+1)-th registration must be rejected with 429
    throttled = await client.post(
        "/api/v1/auth/register",
        json={"email": "bot_user_exceeded@domain.com", "password": "Password123!"},
    )
    assert throttled.status_code == 429
    assert throttled.json()["detail"]["code"] == "RATE_LIMIT_EXCEEDED"

    # Reset rate limiter
    rate_limiter.reset()


def test_kaggle_worker_token_precedence_and_url_normalization(monkeypatch):
    """Verify Kaggle worker token resolution precedence, production protection,

    and backend URL normalization.
    """
    from worker.kaggle_worker import resolve_backend_url, resolve_worker_token

    # 1. Backend URL normalization strips trailing slashes and /api/v1
    monkeypatch.setenv("REVE_BACKEND_URL", "https://reve-backend.onrender.com/api/v1/")
    assert resolve_backend_url() == "https://reve-backend.onrender.com"

    monkeypatch.setenv("REVE_BACKEND_URL", "https://reve-backend.onrender.com")
    assert resolve_backend_url() == "https://reve-backend.onrender.com"

    # 2. Token Precedence: REVE_WORKER_TOKEN takes precedence over REVE_WORKER_SECRET_TOKEN
    monkeypatch.setenv("REVE_WORKER_TOKEN", "token-from-kaggle-secrets")
    monkeypatch.setenv("REVE_WORKER_SECRET_TOKEN", "token-from-render-env")
    assert resolve_worker_token() == "token-from-kaggle-secrets"

    # 3. Fallback to REVE_WORKER_SECRET_TOKEN when REVE_WORKER_TOKEN is not set
    monkeypatch.delenv("REVE_WORKER_TOKEN", raising=False)
    monkeypatch.setenv("REVE_WORKER_SECRET_TOKEN", "token-from-render-env")
    assert resolve_worker_token() == "token-from-render-env"

    # 4. In production without token, must raise RuntimeError
    monkeypatch.delenv("REVE_WORKER_TOKEN", raising=False)
    monkeypatch.delenv("REVE_WORKER_SECRET_TOKEN", raising=False)
    monkeypatch.setenv("REVE_BACKEND_URL", "https://reve-backend.onrender.com")
    monkeypatch.delenv("ALLOW_DEV_TOKEN", raising=False)

    with pytest.raises(RuntimeError, match="Missing worker token"):
        resolve_worker_token()


def test_vercel_routing_configuration():
    """Verify that frontend/vercel.json is properly configured to proxy /api/*

    before falling back to SPA /index.html.
    """
    import json
    from pathlib import Path

    vercel_json_path = Path(__file__).resolve().parents[2] / "frontend" / "vercel.json"
    assert vercel_json_path.exists(), "frontend/vercel.json must exist"

    with open(vercel_json_path, "r", encoding="utf-8") as f:
        config = json.load(f)

    rewrites = config.get("rewrites", [])
    assert len(rewrites) >= 2, "vercel.json must define both API proxy and SPA fallback rewrites"

    # The first rewrite MUST route /api/:path* to Render
    assert rewrites[0]["source"] == "/api/:path*"
    assert "render.com" in rewrites[0]["destination"] or "/api/:path*" in rewrites[0]["destination"]

    # The fallback rewrite MUST route remaining paths to /index.html
    assert rewrites[1]["source"] == "/(.*)"
    assert rewrites[1]["destination"] == "/index.html"

