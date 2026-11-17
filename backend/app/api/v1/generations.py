import asyncio
import json
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db, AsyncSessionLocal
from app.core.security import decode_token
from app.core.config import settings
from app.api.deps import get_current_user
from app.models.entities import User, Generation, GenerationJob, GeneratedImage, Asset, Conversation, ConversationMessage
from app.schemas.generation import (
    TextToImageRequest,
    ImageToImageRequest,
    GenerationJobResponse,
    GenerationResponse,
)
from app.services.generation_service import execute_generation_job

router = APIRouter(tags=["generations"])


@router.post("/generations/text-to-image", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_text_to_image(
    req: TextToImageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify credits
    if current_user.credits_remaining < req.num_images:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "CREDITS_EXHAUSTED", "message": "Insufficient credits remaining"},
        )

    # Dimension validation (multiples of 8)
    if req.width % 8 != 0 or req.height % 8 != 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "INVALID_DIMENSIONS", "message": "Width and height must be multiples of 8."},
        )

    # Validate conversation if provided
    if req.conversation_id:
        conv_res = await db.execute(
            select(Conversation).where(
                Conversation.id == req.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        if not conv_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
            )

    # Create Generation entity
    generation = Generation(
        user_id=current_user.id,
        project_id=req.project_id,
        conversation_id=req.conversation_id,
        generation_type="text_to_image",
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        model_id=req.model_id,
        provider_name=settings.IMAGE_PROVIDER,
        seed=req.seed,
        cfg_scale=req.cfg_scale,
        steps=req.steps,
        width=req.width,
        height=req.height,
        status="QUEUED",
        parameters={
            "scheduler": req.scheduler,
            "num_images": req.num_images,
            "enhance_prompt": req.enhance_prompt,
        },
    )
    db.add(generation)
    await db.flush()

    # Automatically save user prompt in conversation if conversation active
    if req.conversation_id:
        user_msg = ConversationMessage(
            conversation_id=req.conversation_id,
            role="user",
            content=req.prompt,
            metadata_json={"generation_type": "text_to_image", "generation_id": generation.id},
        )
        db.add(user_msg)

    job = GenerationJob(
        generation_id=generation.id,
        status="QUEUED",
        stage="queued",
        progress=0,
    )
    db.add(job)

    # Deduct credits
    current_user.credits_remaining -= req.num_images

    await db.commit()
    await db.refresh(job)

    # Enqueue background execution task
    background_tasks.add_task(execute_generation_job, job.id)

    return GenerationJobResponse(
        job_id=job.id,
        generation_id=generation.id,
        status=job.status,
        progress=job.progress,
        estimated_duration_seconds=15,
        message="Generation job successfully queued for execution.",
    )


@router.post("/generations/image-to-image", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_image_to_image(
    req: ImageToImageRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify credits
    if current_user.credits_remaining < 1:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "CREDITS_EXHAUSTED", "message": "Insufficient credits remaining"},
        )

    # Verify source image asset exists AND belongs to the user
    asset_res = await db.execute(
        select(Asset).where(Asset.id == req.source_image_id, Asset.user_id == current_user.id)
    )
    asset = asset_res.scalar_one_or_none()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SOURCE_IMAGE_NOT_FOUND", "message": "Source image asset not found or access denied."},
        )

    # Validate conversation if provided
    if req.conversation_id:
        conv_res = await db.execute(
            select(Conversation).where(
                Conversation.id == req.conversation_id,
                Conversation.user_id == current_user.id,
            )
        )
        if not conv_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
            )

    # Create Generation entity
    generation = Generation(
        user_id=current_user.id,
        project_id=req.project_id,
        conversation_id=req.conversation_id,
        generation_type="image_to_image",
        source_image_id=req.source_image_id,
        prompt=req.prompt,
        negative_prompt=req.negative_prompt,
        model_id=req.model_id,
        provider_name=settings.IMAGE_PROVIDER,
        seed=req.seed,
        cfg_scale=req.cfg_scale,
        steps=req.steps,
        width=asset.width or 1024,
        height=asset.height or 1024,
        status="QUEUED",
        parameters={
            "strength": req.strength,
        },
    )
    db.add(generation)
    await db.flush()

    if req.conversation_id:
        user_msg = ConversationMessage(
            conversation_id=req.conversation_id,
            role="user",
            content=req.prompt,
            metadata_json={"generation_type": "image_to_image", "generation_id": generation.id},
        )
        db.add(user_msg)

    job = GenerationJob(
        generation_id=generation.id,
        status="QUEUED",
        stage="queued",
        progress=0,
    )
    db.add(job)

    current_user.credits_remaining -= 1
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(execute_generation_job, job.id)

    return GenerationJobResponse(
        job_id=job.id,
        generation_id=generation.id,
        status=job.status,
        progress=job.progress,
        estimated_duration_seconds=20,
        message="Image-to-image job queued for execution.",
    )


@router.get("/jobs/{job_id}")
async def get_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GenerationJob, Generation)
        .join(Generation, GenerationJob.generation_id == Generation.id)
        .where(GenerationJob.id == job_id, Generation.user_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(
            status_code=404,
            detail={"code": "JOB_NOT_FOUND", "message": "Job not found or access denied."},
        )

    job, generation = row

    images_res = await db.execute(
        select(GeneratedImage).where(GeneratedImage.generation_id == generation.id)
    )
    images = images_res.scalars().all()

    return {
        "job_id": job.id,
        "generation_id": job.generation_id,
        "status": job.status,
        "progress": job.progress,
        "stage": job.stage,
        "error_message": job.error_message,
        "execution_time_seconds": job.execution_time_seconds,
        "created_at": job.created_at,
        "updated_at": job.updated_at,
        "result_images": [
            {
                "id": img.id,
                "url": img.storage_url,
                "thumbnail_url": img.thumbnail_url,
                "width": img.width,
                "height": img.height,
                "mime_type": img.mime_type,
            }
            for img in images
        ],
    }


@router.post("/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GenerationJob, Generation)
        .join(Generation, GenerationJob.generation_id == Generation.id)
        .where(GenerationJob.id == job_id, Generation.user_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail={"code": "JOB_NOT_FOUND", "message": "Job not found"})

    job, generation = row
    if job.status in ["COMPLETED", "FAILED", "CANCELLED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "JOB_NOT_CANCELLABLE", "message": f"Job is already {job.status}"},
        )

    job.status = "CANCELLED"
    job.stage = "cancelled"
    generation.status = "CANCELLED"

    # Refund credits
    current_user.credits_remaining += generation.parameters.get("num_images", 1)

    await db.commit()

    # Notify provider to unblock and cancel remote execution if active
    try:
        from ai_engine.providers.registry import ProviderRegistry
        provider = ProviderRegistry.get_provider(generation.provider_name)
        if hasattr(provider, "cancel_job"):
            provider.cancel_job(job.id)
    except Exception:
        pass

    return {"job_id": job.id, "status": "CANCELLED", "message": "Job successfully cancelled and credits refunded."}


@router.get("/jobs/{job_id}/stream")
async def stream_job_progress(
    job_id: str,
    token: Optional[str] = Query(None, description="JWT token for SSE clients"),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticated Server-Sent Events (SSE) endpoint streaming real-time job progress.
    Validates token from Authorization header or ?token query param.
    """
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split(" ")[1]
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "AUTHENTICATION_REQUIRED", "message": "Authentication token is required for job stream."},
        )

    try:
        payload = decode_token(auth_token)
        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Missing subject")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired authentication token."},
        )

    async def event_generator():
        last_progress = -1
        last_status = None

        for _ in range(60):  # Stream for up to 60 seconds
            async with AsyncSessionLocal() as session:
                query = (
                    select(GenerationJob, Generation)
                    .join(Generation, GenerationJob.generation_id == Generation.id)
                    .where(GenerationJob.id == job_id, Generation.user_id == user_id)
                )

                res = await session.execute(query)
                row = res.first()
                if not row:
                    yield f"event: job.failed\ndata: {json.dumps({'error': 'Job not found or access denied'})}\n\n"
                    break

                job, generation = row

                if job.status != last_status or job.progress != last_progress:
                    last_status = job.status
                    last_progress = job.progress

                    payload = {
                        "job_id": job.id,
                        "status": job.status,
                        "progress": job.progress,
                        "stage": job.stage,
                    }

                    if job.status == "COMPLETED":
                        img_res = await session.execute(
                            select(GeneratedImage).where(GeneratedImage.generation_id == job.generation_id)
                        )
                        images = img_res.scalars().all()
                        payload["images"] = [
                            {"id": i.id, "url": i.storage_url, "thumbnail_url": i.thumbnail_url}
                            for i in images
                        ]
                        yield f"event: job.completed\ndata: {json.dumps(payload)}\n\n"
                        break

                    elif job.status in ["FAILED", "CANCELLED"]:
                        payload["error_message"] = job.error_message
                        yield f"event: job.failed\ndata: {json.dumps(payload)}\n\n"
                        break

                    else:
                        yield f"event: job.progress\ndata: {json.dumps(payload)}\n\n"

            await asyncio.sleep(0.5)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/generations")
async def list_generations(
    project_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Generation)
        .options(selectinload(Generation.images))
        .where(Generation.user_id == current_user.id)
    )
    if project_id:
        query = query.where(Generation.project_id == project_id)

    query = query.order_by(Generation.created_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    generations = result.scalars().all()

    items = []
    for g in generations:
        items.append({
            "id": g.id,
            "project_id": g.project_id,
            "generation_type": g.generation_type,
            "prompt": g.prompt,
            "negative_prompt": g.negative_prompt,
            "model_id": g.model_id,
            "status": g.status,
            "width": g.width,
            "height": g.height,
            "seed": g.seed,
            "cfg_scale": g.cfg_scale,
            "steps": g.steps,
            "created_at": g.created_at,
            "images": [
                {
                    "id": img.id,
                    "url": img.storage_url,
                    "thumbnail_url": img.thumbnail_url,
                    "width": img.width,
                    "height": img.height,
                }
                for img in g.images
            ],
        })

    return items
