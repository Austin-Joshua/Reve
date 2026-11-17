import time
import asyncio
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.storage import storage_manager
from app.core.config import settings
from app.models.entities import Generation, GenerationJob, GeneratedImage, User, Asset, ConversationMessage, UsageRecord
from ai_engine.providers.registry import ProviderRegistry
from ai_engine.pipelines.schemas import GenerationRequest, Img2ImgRequest


async def execute_generation_job(job_id: str):
    """
    Asynchronous executor for generation jobs.
    Runs preflight checks, executes provider inference, manages lifecycle transitions,
    saves generated raster images, and updates database records.
    Automatically refunds reserved credits on execution failure.
    """
    async with AsyncSessionLocal() as session:
        # 1. Fetch job and generation
        result = await session.execute(
            select(GenerationJob, Generation)
            .join(Generation, GenerationJob.generation_id == Generation.id)
            .where(GenerationJob.id == job_id)
        )
        row = result.first()
        if not row:
            return

        job, gen = row

        # If job was cancelled before execution started
        if job.status == "CANCELLED":
            return

        # 2. Transition: QUEUED -> PROCESSING
        start_time = time.time()
        job.status = "PROCESSING"
        job.stage = "preflight_check"
        job.progress = 10
        gen.status = "PROCESSING"
        await session.commit()

        # 3. Resolve Provider
        provider_name = gen.provider_name or settings.IMAGE_PROVIDER
        try:
            provider = ProviderRegistry.get_provider(
                provider_name,
                allow_cpu=settings.ALLOW_CPU_INFERENCE,
            )
        except Exception as e:
            await _fail_job_and_refund(session, job, gen, f"Provider initialization failed: {str(e)}")
            return

        # 4. Hardware and Dependency Preflight Check
        try:
            job.stage = "preflight_check"
            job.progress = 20
            await session.commit()

            preflight = await provider.preflight_check(gen.model_id)
            if not preflight.can_run:
                await _fail_job_and_refund(
                    session,
                    job,
                    gen,
                    f"[{preflight.status}] {preflight.reason}",
                )
                return

        except Exception as e:
            await _fail_job_and_refund(session, job, gen, f"Preflight check error: {str(e)}")
            return

        # 5. Execute Inference
        try:
            job.stage = "diffusion_inference"
            job.progress = 40
            await session.commit()

            if gen.generation_type == "text_to_image":
                req = GenerationRequest(
                    prompt=gen.prompt,
                    negative_prompt=gen.negative_prompt,
                    seed=gen.seed,
                    cfg_scale=gen.cfg_scale,
                    steps=gen.steps,
                    width=gen.width,
                    height=gen.height,
                    num_images=gen.parameters.get("num_images", 1),
                    model_id=gen.model_id,
                    extra_params={"job_id": job.id},
                )
                inference_result = await provider.text_to_image(req)

            elif gen.generation_type == "image_to_image":
                # Retrieve source image bytes
                source_asset_id = gen.source_image_id
                asset_res = await session.execute(select(Asset).where(Asset.id == source_asset_id))
                asset = asset_res.scalar_one_or_none()
                if not asset:
                    await _fail_job_and_refund(session, job, gen, "Source image asset not found.")
                    return

                # Get filename/key from storage_url
                key = asset.storage_url.split("/")[-1]
                source_bytes = storage_manager.get_image_bytes(key)
                if not source_bytes:
                    await _fail_job_and_refund(session, job, gen, "Failed to load source image bytes from storage.")
                    return

                req_img = Img2ImgRequest(
                    source_image_bytes=source_bytes,
                    prompt=gen.prompt,
                    negative_prompt=gen.negative_prompt,
                    strength=gen.parameters.get("strength", 0.75),
                    seed=gen.seed,
                    cfg_scale=gen.cfg_scale,
                    steps=gen.steps,
                    model_id=gen.model_id,
                    extra_params={"job_id": job.id},
                )
                inference_result = await provider.image_to_image(req_img)

            else:
                await _fail_job_and_refund(session, job, gen, f"Unsupported generation type: {gen.generation_type}")
                return

        except Exception as e:
            await _fail_job_and_refund(session, job, gen, f"Inference execution failed: {str(e)}")
            return

        # Check if job was cancelled during inference execution
        await session.refresh(job)
        if job.status == "CANCELLED":
            # Discard results and preserve CANCELLED status; credits were already refunded
            return

        # 6. Save Result Images to Storage
        job.stage = "saving_results"
        job.progress = 85
        await session.commit()

        for idx, img_payload in enumerate(inference_result.images):
            saved = storage_manager.save_image(
                image_bytes=img_payload.image_bytes,
                mime_type=img_payload.mime_type,
            )

            db_img = GeneratedImage(
                generation_id=gen.id,
                storage_url=saved["storage_url"],
                thumbnail_url=saved["thumbnail_url"],
                width=saved["width"],
                height=saved["height"],
                file_size_bytes=saved["file_size_bytes"],
                mime_type=saved["mime_type"],
            )
            session.add(db_img)

        # 7. Complete Job
        duration = round(time.time() - start_time, 2)
        job.status = "COMPLETED"
        job.stage = "completed"
        job.progress = 100
        job.execution_time_seconds = duration
        gen.status = "COMPLETED"

        # Record assistant outcome message in conversation
        if gen.conversation_id:
            assistant_msg = ConversationMessage(
                conversation_id=gen.conversation_id,
                role="assistant",
                content=f"Generated image output in {duration}s for prompt: \"{gen.prompt}\"",
                generation_id=gen.id,
                metadata_json={
                    "status": "COMPLETED",
                    "model_id": gen.model_id,
                    "seed": gen.seed,
                    "images_count": len(inference_result.images),
                    "execution_time_seconds": duration,
                },
            )
            session.add(assistant_msg)

        # Record usage analytics
        credits_used = gen.parameters.get("num_images", 1)
        usage = UsageRecord(
            user_id=gen.user_id,
            operation=gen.generation_type,
            credits_consumed=credits_used,
            details={
                "generation_id": gen.id,
                "model_id": gen.model_id,
                "status": "COMPLETED",
                "execution_time_seconds": duration,
            },
        )
        session.add(usage)

        await session.commit()


async def _fail_job_and_refund(session: AsyncSession, job: GenerationJob, gen: Generation, error_msg: str):
    await session.refresh(job)
    if job.status in ["FAILED", "CANCELLED"]:
        # Idempotent: already cancelled or failed; do not refund credits a second time
        return

    # Refund reserved user credits
    user_res = await session.execute(select(User).where(User.id == gen.user_id))
    user = user_res.scalar_one_or_none()
    if user:
        user.credits_remaining += gen.parameters.get("num_images", 1)

    job.status = "FAILED"
    job.stage = "failed"
    job.error_message = error_msg
    gen.status = "FAILED"

    # Record failure message in conversation if active
    if gen.conversation_id:
        fail_msg = ConversationMessage(
            conversation_id=gen.conversation_id,
            role="assistant",
            content=f"Generation failed: {error_msg}",
            generation_id=gen.id,
            metadata_json={"status": "FAILED", "error": error_msg},
        )
        session.add(fail_msg)

    await session.commit()
