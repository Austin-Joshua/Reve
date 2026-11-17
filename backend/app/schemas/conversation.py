from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, computed_field


class MessageCreateRequest(BaseModel):
    role: str = Field(default="user", description="user, assistant, or system")
    content: str = Field(..., min_length=1, max_length=10000)
    generation_id: Optional[str] = None
    metadata_json: Dict[str, Any] = Field(default_factory=dict)


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    generation_id: Optional[str] = None
    metadata_json: Dict[str, Any] = {}
    created_at: datetime

    @computed_field
    @property
    def estimated_tokens(self) -> int:
        return max(1, len(self.content) // 4) if self.content else 0


class ConversationCreateRequest(BaseModel):
    title: Optional[str] = Field(default="New Conversation", max_length=255)
    project_id: Optional[str] = None


class ConversationUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    project_id: Optional[str] = None
    is_archived: Optional[bool] = None


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: Optional[str] = None
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    message_count: Optional[int] = None
    latest_message: Optional[str] = None


class ConversationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    project_id: Optional[str] = None
    title: str
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    messages: List[MessageResponse] = []
