from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ReferenceImageInput(BaseModel):
    id: str
    role: str = Field(default="style", description="subject, style, composition, color, character")
    strength: float = Field(default=0.75, ge=0.0, le=1.0)


class TextToImageRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=4096)
    negative_prompt: Optional[str] = Field(None, max_length=2048)
    seed: Optional[int] = Field(None, ge=0, le=2147483647)
    cfg_scale: float = Field(default=7.0, ge=1.0, le=20.0)
    steps: int = Field(default=28, ge=10, le=100)
    scheduler: str = Field(default="FlowMatchEulerDiscreteScheduler")
    width: int = Field(default=1024, ge=256, le=2048)
    height: int = Field(default=1024, ge=256, le=2048)
    num_images: int = Field(default=1, ge=1, le=4)
    model_id: str = Field(default="FLUX.1-dev")
    project_id: Optional[str] = None
    enhance_prompt: bool = Field(default=False)
    reference_images: Optional[List[ReferenceImageInput]] = None


class ImageToImageRequest(BaseModel):
    source_image_id: str
    prompt: str = Field(..., min_length=1, max_length=4096)
    negative_prompt: Optional[str] = None
    strength: float = 0.75
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    model_id: str = "FLUX.1-dev"
    project_id: Optional[str] = None


class InpaintRequest(BaseModel):
    source_image_id: str
    mask_image_base64: str = Field(..., description="Base64 encoded binary PNG mask")
    prompt: str = Field(..., min_length=1, max_length=4096)
    negative_prompt: Optional[str] = None
    strength: float = 0.9
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    model_id: str = "FLUX.1-dev"
    project_id: Optional[str] = None


class OutpaintRequest(BaseModel):
    source_image_id: str
    direction: str
    pixels: int = 256
    prompt: str
    model_id: str = "FLUX.1-dev"
    project_id: Optional[str] = None


class GenerationJobResponse(BaseModel):
    job_id: str
    generation_id: str
    status: str
    progress: int = 0
    estimated_duration_seconds: Optional[int] = None
    message: str = "Job created"


class GenerationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: Optional[str] = None
    generation_type: str
    prompt: str
    negative_prompt: Optional[str] = None
    model_id: str
    width: int
    height: int
    status: str
    created_at: datetime
    images: List[Dict[str, Any]] = []
