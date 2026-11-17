from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class ServiceStatus(BaseModel):
    status: str
    details: Optional[Dict[str, Any]] = None


class HealthCheckResponse(BaseModel):
    status: str = Field(..., description="'healthy' or 'degraded'")
    environment: str
    version: str = "1.0.0"
    services: Dict[str, Any]
