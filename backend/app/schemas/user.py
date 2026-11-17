from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class UserProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = Field(None, max_length=512)


class GenerationSummaryItem(BaseModel):
    id: str
    prompt: str
    status: str
    created_at: datetime
    thumbnail_url: Optional[str] = None


class UserAnalyticsResponse(BaseModel):
    user_id: str
    email: str
    plan_tier: str
    credits_remaining: int
    total_generations: int
    successful_generations: int
    failed_generations: int
    cancelled_generations: int
    total_credits_consumed: int
    total_projects: int
    total_conversations: int
    total_assets: int
    recent_activity: List[GenerationSummaryItem] = []
