"""
Internal Worker API endpoints for Reve.
Allows external ephemeral GPU workers (Google Colab / Kaggle Notebooks)
to report heartbeats, poll pending inference jobs, and submit results or failure reports.

Security:
- All routes require X-Worker-Token header.
- Token validated via constant-time comparison against settings.REVE_WORKER_SECRET_TOKEN.
- No user-identifying data, emails, or project records are exposed to worker nodes.
"""

import time
import secrets
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Response, status
from pydantic import BaseModel, Field

from app.core.config import settings
from ai_engine.providers.registry import ProviderRegistry
from ai_engine.providers.remote_worker import (
    WorkerHeartbeat,
    RemoteInferenceRequest,
    RemoteInferenceResponse,
    RemoteWorkerProvider,
)

router = APIRouter(prefix="/internal/worker", tags=["internal-worker"])


class WorkerFailRequest(BaseModel):
    error_message: str = Field(..., min_length=1, max_length=2048)


def verify_worker_token(
    x_worker_token: Optional[str] = Header(None, alias="X-Worker-Token")
) -> str:
    """Enforces constant-time token verification for remote worker endpoints."""
    if not x_worker_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_WORKER_TOKEN", "message": "X-Worker-Token header is required."},
        )

    expected = settings.REVE_WORKER_SECRET_TOKEN
    if not secrets.compare_digest(x_worker_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_WORKER_TOKEN", "message": "Unauthorized worker secret token."},
        )

    return x_worker_token


def _get_remote_provider() -> RemoteWorkerProvider:
    provider = ProviderRegistry.get_provider("remote_worker")
    if not isinstance(provider, RemoteWorkerProvider):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "PROVIDER_ERROR", "message": "Remote worker provider is not properly registered."},
        )
    return provider


@router.post("/heartbeat")
async def report_heartbeat(
    heartbeat: WorkerHeartbeat,
    token: str = Depends(verify_worker_token),
):
    """
    Worker status telemetry. Registers worker availability, GPU type, and free VRAM.
    """
    provider = _get_remote_provider()
    # Ensure provider uses the active config token
    provider.config.worker_token = settings.REVE_WORKER_SECRET_TOKEN

    accepted = provider.update_heartbeat(heartbeat, token)
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "HEARTBEAT_REJECTED", "message": "Worker heartbeat token rejected."},
        )

    return {
        "status": "acknowledged",
        "worker_id": heartbeat.worker_id,
        "environment": heartbeat.environment,
        "timestamp": time.time(),
    }


@router.get("/jobs/poll")
async def poll_for_job(
    worker_id: Optional[str] = Query(None, description="Worker identifier"),
    token: str = Depends(verify_worker_token),
):
    """
    Called by remote worker to retrieve the oldest pending inference job.
    Returns HTTP 204 No Content if no jobs are waiting.
    """
    provider = _get_remote_provider()
    job = provider.get_next_job(worker_id)
    if not job:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    # Return sanitized job payload (no user/tenant/project leaks)
    return {
        "job_id": job.job_id,
        "operation": job.operation,
        "model_id": job.model_id,
        "prompt": job.prompt,
        "negative_prompt": job.negative_prompt,
        "seed": job.seed,
        "cfg_scale": job.cfg_scale,
        "steps": job.steps,
        "width": job.width,
        "height": job.height,
        "source_image_base64": job.source_image_base64,
        "strength": job.strength,
    }


@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str,
    payload: RemoteInferenceResponse,
    token: str = Depends(verify_worker_token),
):
    """
    Receives generated base64 image bytes from worker, validates them,
    and resolves the waiting text_to_image / image_to_image task.
    """
    if payload.job_id != job_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "JOB_ID_MISMATCH", "message": f"URL job_id '{job_id}' does not match payload '{payload.job_id}'."},
        )

    provider = _get_remote_provider()

    try:
        provider.submit_result(job_id, payload)
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": str(e)},
        )
    except ValueError as e:
        err_str = str(e)
        if "duplicate" in err_str.lower() or "already in terminal state" in err_str.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "DUPLICATE_SUBMISSION", "message": err_str},
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_IMAGE_PAYLOAD", "message": err_str},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "RESULT_PROCESSING_FAILED", "message": str(e)},
        )

    return {"status": "received", "job_id": job_id}


@router.post("/jobs/{job_id}/fail")
async def report_job_failure(
    job_id: str,
    payload: WorkerFailRequest,
    token: str = Depends(verify_worker_token),
):
    """
    Called when remote worker encounters an unrecoverable CUDA error, OOM, or model crash.
    """
    provider = _get_remote_provider()

    try:
        provider.submit_failure(job_id, payload.error_message)
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": str(e)},
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE_SUBMISSION", "message": str(e)},
        )

    return {"status": "failure_recorded", "job_id": job_id}
