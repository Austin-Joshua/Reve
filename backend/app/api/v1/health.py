import sys
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

# Add ai-engine to sys.path so we can import directly
ai_engine_path = str(Path(__file__).resolve().parents[4] / "ai-engine")
if ai_engine_path not in sys.path:
    sys.path.append(ai_engine_path)

from app.core.config import settings
from app.core.database import get_db
from app.core.redis import redis_client
from app.core.storage import storage_manager
from app.schemas.health import HealthCheckResponse
from ai_engine.providers.registry import ProviderRegistry

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheckResponse)
async def health_check(db: AsyncSession = Depends(get_db)):
    services = {}

    # 1. Database check
    try:
        await db.execute(text("SELECT 1"))
        services["database"] = {"status": "connected"}
    except Exception as e:
        services["database"] = {"status": "error", "error": str(e)}

    # 2. Redis check
    services["redis"] = await redis_client.health_check()

    # 3. Storage / MinIO check
    services["storage"] = storage_manager.health_check()

    # 4. AI Provider check
    try:
        provider = ProviderRegistry.get_provider(
            settings.IMAGE_PROVIDER,
            allow_cpu=settings.ALLOW_CPU_INFERENCE,
        )
        ai_health = await provider.health_check()
        services["ai_provider"] = {
            "status": ai_health.status.value,
            "provider": ai_health.provider_name,
            "device": ai_health.device,
            "vram_total_gb": ai_health.vram_total_gb,
            "vram_free_gb": ai_health.vram_free_gb,
            "details": ai_health.details,
        }
    except Exception as e:
        services["ai_provider"] = {"status": "unavailable", "error": str(e)}

    # Determine overall status
    db_ok = services["database"].get("status") == "connected"
    overall_status = "healthy" if db_ok else "degraded"

    return HealthCheckResponse(
        status=overall_status,
        environment=settings.ENVIRONMENT,
        version="1.0.0",
        services=services,
    )
