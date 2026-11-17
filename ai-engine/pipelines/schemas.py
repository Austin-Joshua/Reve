from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ProviderHealthStatus(str, Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNAVAILABLE = "unavailable"


class ProviderHealth(BaseModel):
    provider_name: str
    status: ProviderHealthStatus
    device: str
    vram_total_gb: Optional[float] = None
    vram_free_gb: Optional[float] = None
    loaded_models: List[str] = []
    details: Dict[str, Any] = {}


class PreflightResult(BaseModel):
    can_run: bool
    status: str  # READY, HARDWARE_INSUFFICIENT_VRAM, MODEL_WEIGHTS_NOT_FOUND, DEPENDENCIES_MISSING, CUDA_UNAVAILABLE
    reason: Optional[str] = None
    model_id: str
    required_vram_gb: float
    detected_vram_gb: Optional[float] = None
    device: str
    hardware_summary: Dict[str, Any] = {}
    missing_requirements: List[str] = []


class GenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4096)
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    scheduler: str = "FlowMatchEulerDiscreteScheduler"
    width: int = 1024
    height: int = 1024
    num_images: int = 1
    model_id: str = "FLUX.1-dev"
    extra_params: Dict[str, Any] = {}


class Img2ImgRequest(BaseModel):
    source_image_bytes: bytes
    prompt: str = Field(..., min_length=1, max_length=4096)
    negative_prompt: Optional[str] = None
    strength: float = Field(default=0.75, ge=0.0, le=1.0)
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    model_id: str = "FLUX.1-dev"
    extra_params: Dict[str, Any] = {}


class InpaintRequest(BaseModel):
    source_image_bytes: bytes
    mask_image_bytes: bytes
    prompt: str
    negative_prompt: Optional[str] = None
    strength: float = 0.9
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    model_id: str = "FLUX.1-dev"
    extra_params: Dict[str, Any] = {}


class OutpaintRequest(BaseModel):
    source_image_bytes: bytes
    direction: str  # top, bottom, left, right, all
    pixels: int = 256
    prompt: str
    model_id: str = "FLUX.1-dev"
    extra_params: Dict[str, Any] = {}


class GeneratedImagePayload(BaseModel):
    image_bytes: bytes
    width: int
    height: int
    mime_type: str = "image/png"
    seed: int


class GenerationResult(BaseModel):
    images: List[GeneratedImagePayload]
    provider_name: str
    model_id: str
    execution_time_seconds: float
    seed: int
    metadata: Dict[str, Any] = {}
