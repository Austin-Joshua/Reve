import sys
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# Ensure ai-engine is in sys.path
root_dir = Path(__file__).resolve().parents[2]
ai_engine_path = str(root_dir / "ai-engine")
if ai_engine_path not in sys.path:
    sys.path.append(ai_engine_path)

from app.core.config import settings
from app.core.database import engine, Base
from app.api.v1 import api_v1_router
from app.services.generation_service import recover_stale_generation_jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables (for dev SQLite or until Alembic runs)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Clean up and idempotently refund any orphaned jobs left by previous server crash/restart
    try:
        recovered = await recover_stale_generation_jobs()
        if recovered > 0:
            print(f"[Lifespan] Recovered {recovered} stale generation jobs from previous process.")
    except Exception as e:
        print(f"[Lifespan] Stale job recovery notice: {e}")

    yield
    await engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Reve-Inspired AI Visual Creation Platform",
    version="1.0.0",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 router
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "health": f"{settings.API_V1_PREFIX}/health",
    }


# Standard application error handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if settings.DEBUG:
        import traceback
        traceback.print_exc()
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc) if settings.DEBUG else "An unexpected error occurred.",
            }
        },
    )
