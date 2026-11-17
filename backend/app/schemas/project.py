from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, computed_field


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
    is_archived: Optional[bool] = None


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
    is_archived: bool = False
    role: str = "OWNER"
    created_at: datetime
    updated_at: datetime


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    user_id: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str  # OWNER, EDITOR, VIEWER
    created_at: datetime


class MemberRoleUpdateRequest(BaseModel):
    role: str = Field(..., description="OWNER, EDITOR, or VIEWER")


class InvitationCreateRequest(BaseModel):
    invitee_email: Optional[str] = None
    email: Optional[str] = None
    role: str = Field(default="EDITOR", description="EDITOR or VIEWER")

    def get_email(self) -> str:
        return self.invitee_email or self.email or ""


class InvitationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    project_name: Optional[str] = None
    inviter_id: str
    inviter_email: Optional[str] = None
    invitee_email: str
    role: str
    status: str  # PENDING, ACCEPTED, REJECTED, REVOKED
    created_at: datetime


class OwnershipTransferRequest(BaseModel):
    new_owner_user_id: str


class SceneDocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    project_id: str
    version: int
    canvas_data: Dict[str, Any]
    layers_data: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def layers(self) -> List[Dict[str, Any]]:
        return self.layers_data

    @computed_field
    @property
    def canvas(self) -> Dict[str, Any]:
        return self.canvas_data
