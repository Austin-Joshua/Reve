from fastapi import APIRouter
from app.api.v1.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.projects import router as projects_router
from app.api.v1.generations import router as generations_router
from app.api.v1.models import router as models_router
from app.api.v1.images import router as images_router
from app.api.v1.internal_worker import router as internal_worker_router

api_v1_router = APIRouter()
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(projects_router)
api_v1_router.include_router(generations_router)
api_v1_router.include_router(models_router)
api_v1_router.include_router(images_router)
api_v1_router.include_router(internal_worker_router)

__all__ = ["api_v1_router"]
