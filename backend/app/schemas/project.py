from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class ProjectCreateRequest(BaseModel):
    name: str = Field(default="Untitled Project", max_length=255)
    description: Optional[str] = None
    canvas_width: int = Field(default=1024, ge=256, le=4096)
    canvas_height: int = Field(default=1024, ge=256, le=4096)
    canvas_background: str = Field(default="#0A0A0B")


class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    canvas_background: Optional[str] = None


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    canvas_width: int
    canvas_height: int
    canvas_background: str
    created_at: datetime
    updated_at: datetime


class SceneDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    version: int
    canvas_data: Dict[str, Any]
    layers_data: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
