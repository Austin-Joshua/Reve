from typing import List, Dict, Any
from fastapi import APIRouter
from ai_engine.model_registry.models import MODEL_CATALOG

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_models():
    models = []
    for m in MODEL_CATALOG.values():
        models.append({
            "model_id": m.id,
            "name": m.name,
            "family": m.family,
            "parameter_count_billions": m.parameter_count_billions,
            "native_resolution": m.native_resolution,
            "min_vram_gb_bf16": m.min_vram_gb_bf16,
            "min_vram_gb_fp8": m.min_vram_gb_fp8,
            "capabilities": m.capabilities,
            "license": m.license,
            "notes": m.notes,
        })
    return models
