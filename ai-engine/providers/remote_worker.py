"""
Provider-Neutral Remote Inference Worker Provider for Reve.
Supports ephemeral external GPU workers (Google Colab / Kaggle Notebooks / Dedicated GPU servers)
without creating a permanent dependency on temporary public URLs.

Architecture:
- The Reve backend exposes a secure internal worker bridge.
- The external GPU worker (e.g. running in Colab or Kaggle) polls the backend job queue via outbound HTTPS.
- All requests and responses are strictly typed and authenticated via secret worker token.
- Image bytes are validated for MIME type, integrity, file size, and dimensions before being accepted into storage.
- In-memory asynchronous coordination (asyncio.Event + job queue) bridges HTTP worker routes with provider execution.
"""

import os
import time
import io
import uuid
import base64
import secrets
import asyncio
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field
from PIL import Image

from ai_engine.providers.base import BaseImageProvider
from ai_engine.pipelines.schemas import (
    GenerationRequest,
    Img2ImgRequest,
    InpaintRequest,
    OutpaintRequest,
    GenerationResult,
    GeneratedImagePayload,
    ProviderHealth,
    ProviderHealthStatus,
    PreflightResult,
)


class WorkerHeartbeat(BaseModel):
    worker_id: str
    worker_name: str = "ephemeral_gpu_worker"
    environment: str = "colab"  # colab, kaggle, custom_gpu
    gpu_name: str = "NVIDIA Tesla T4"
    vram_total_gb: float = 15.0
    vram_free_gb: float = 14.2
    cuda_version: str = "12.1"
    torch_version: str = "2.3.0"
    loaded_models: List[str] = Field(default_factory=list)
    timestamp: float = Field(default_factory=time.time)


class RemoteWorkerConfig(BaseModel):
    worker_token: str = Field(default_factory=lambda: os.environ.get("REVE_WORKER_SECRET_TOKEN", "dev-reve-remote-worker-secret-token"))
    heartbeat_ttl_seconds: int = 45
    inference_timeout_seconds: int = 120
    max_image_payload_bytes: int = 20 * 1024 * 1024  # 20 MB ceiling
    max_retries: int = 2
    worker_endpoint_url: Optional[str] = None  # Optional if worker operates in polling mode


class RemoteInferenceRequest(BaseModel):
    job_id: str
    operation: str = "text_to_image"  # text_to_image, image_to_image, inpaint, outpaint
    model_id: str
    prompt: str
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    cfg_scale: float = 7.0
    steps: int = 28
    width: int = 1024
    height: int = 1024
    source_image_base64: Optional[str] = None
    mask_image_base64: Optional[str] = None
    strength: Optional[float] = None
    direction: Optional[str] = None
    pixels: Optional[int] = None
    extra_params: Dict[str, Any] = Field(default_factory=dict)


class RemoteInferenceResponse(BaseModel):
    job_id: str
    status: str  # SUCCESS, FAILED, TIMEOUT
    images_base64: List[str] = Field(default_factory=list)
    seed: Optional[int] = 42
    model_id: str = "SD-1.5"
    execution_time_seconds: float = 0.0
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RemoteWorkerProvider(BaseImageProvider):
    """
    Provider-neutral bridge to remote ephemeral GPU instances.
    Implements BaseImageProvider so the core pipeline treats it identically to any local or cloud provider.
    Coordinates asynchronous polling worker execution via asyncio.Event primitives.
    """

    def __init__(
        self,
        config: Optional[RemoteWorkerConfig] = None,
        allow_cpu: bool = False,
        **kwargs,
    ):
        self.config = config or RemoteWorkerConfig()
        self.allow_cpu = allow_cpu
        self._last_heartbeat: Optional[WorkerHeartbeat] = None
        self._registered_workers: Dict[str, WorkerHeartbeat] = {}

        # In-memory asynchronous job coordination
        self._pending_jobs: Dict[str, RemoteInferenceRequest] = {}
        self._job_events: Dict[str, asyncio.Event] = {}
        self._job_results: Dict[str, RemoteInferenceResponse] = {}
        self._job_status: Dict[str, str] = {}  # PENDING, DISPATCHED, COMPLETED, FAILED, CANCELLED, TIMEOUT
        self._job_dispatched_at: Dict[str, float] = {}

    @property
    def provider_name(self) -> str:
        return "remote_worker"

    @property
    def supported_capabilities(self) -> List[str]:
        return ["text2img", "img2img", "inpaint", "outpaint"]

    # --- Heartbeat and Registration ---

    def update_heartbeat(self, heartbeat: WorkerHeartbeat, token: str) -> bool:
        """Called by backend internal API when a remote worker reports its status."""
        if not secrets.compare_digest(token, self.config.worker_token):
            return False
        self._registered_workers[heartbeat.worker_id] = heartbeat
        self._last_heartbeat = heartbeat
        return True

    def get_active_worker(self) -> Optional[WorkerHeartbeat]:
        """Finds the most recently active, responsive worker within TTL."""
        now = time.time()
        for worker in sorted(self._registered_workers.values(), key=lambda w: w.timestamp, reverse=True):
            if now - worker.timestamp <= self.config.heartbeat_ttl_seconds:
                return worker
        return None

    # --- Preflight and Health ---

    async def preflight_check(self, model_id: str) -> PreflightResult:
        """
        Verify that a remote GPU worker is currently connected, healthy,
        and has sufficient VRAM for the requested model.
        """
        worker = self.get_active_worker()

        # VRAM Requirements map (GB)
        vram_reqs = {
            "FLUX.1-dev": 12.0,
            "FLUX.1-schnell": 8.0,
            "SDXL-1.0": 8.0,
            "SDXL-Turbo": 6.0,
            "SD-1.5": 4.0,
            "stabilityai/stable-diffusion-xl-base-1.0": 8.0,
            "black-forest-labs/FLUX.1-dev": 12.0,
            "black-forest-labs/FLUX.1-schnell": 8.0,
            "runwayml/stable-diffusion-v1-5": 4.0,
        }
        required_vram = vram_reqs.get(model_id, 4.0)

        if not worker:
            return PreflightResult(
                can_run=False,
                status="REMOTE_WORKER_OFFLINE",
                reason=(
                    f"No active remote GPU worker connected within the last {self.config.heartbeat_ttl_seconds} seconds. "
                    "Start a zero-cost GPU notebook (Google Colab or Kaggle) and establish worker bridge."
                ),
                model_id=model_id,
                required_vram_gb=required_vram,
                device="remote",
                hardware_summary={"active_workers": 0},
                missing_requirements=["Remote GPU worker heartbeat"],
            )

        if worker.vram_free_gb < required_vram:
            return PreflightResult(
                can_run=False,
                status="HARDWARE_INSUFFICIENT_VRAM",
                reason=(
                    f"Remote GPU ({worker.gpu_name}) has only {worker.vram_free_gb:.1f} GB free VRAM, "
                    f"but {model_id} requires at least {required_vram:.1f} GB."
                ),
                model_id=model_id,
                required_vram_gb=required_vram,
                detected_vram_gb=worker.vram_free_gb,
                device=f"remote:{worker.gpu_name}",
                hardware_summary={
                    "worker_id": worker.worker_id,
                    "environment": worker.environment,
                    "gpu_name": worker.gpu_name,
                    "vram_total_gb": worker.vram_total_gb,
                    "vram_free_gb": worker.vram_free_gb,
                },
                missing_requirements=[f"At least {required_vram} GB free VRAM"],
            )

        return PreflightResult(
            can_run=True,
            status="READY",
            reason=f"Connected to remote GPU worker ({worker.gpu_name} in {worker.environment}) with {worker.vram_free_gb:.1f} GB free VRAM.",
            model_id=model_id,
            required_vram_gb=required_vram,
            detected_vram_gb=worker.vram_free_gb,
            device=f"remote:{worker.gpu_name}",
            hardware_summary={
                "worker_id": worker.worker_id,
                "environment": worker.environment,
                "gpu_name": worker.gpu_name,
                "vram_total_gb": worker.vram_total_gb,
                "vram_free_gb": worker.vram_free_gb,
                "torch_version": worker.torch_version,
            },
        )

    async def health_check(self) -> ProviderHealth:
        worker = self.get_active_worker()
        if not worker:
            return ProviderHealth(
                provider_name=self.provider_name,
                status=ProviderHealthStatus.UNAVAILABLE,
                device="remote",
                details={"reason": "No active remote GPU worker registered"},
            )

        return ProviderHealth(
            provider_name=self.provider_name,
            status=ProviderHealthStatus.HEALTHY,
            device=f"remote:{worker.gpu_name}",
            vram_total_gb=worker.vram_total_gb,
            vram_free_gb=worker.vram_free_gb,
            loaded_models=worker.loaded_models,
            details={
                "worker_id": worker.worker_id,
                "environment": worker.environment,
                "last_heartbeat_seconds_ago": round(time.time() - worker.timestamp, 1),
            },
        )

    # --- Job Queue & Coordination Primitives ---

    def enqueue_job(self, req: RemoteInferenceRequest) -> asyncio.Event:
        """Enqueues a job request and returns an event that fires upon completion/failure/timeout."""
        event = asyncio.Event()
        self._pending_jobs[req.job_id] = req
        self._job_events[req.job_id] = event
        self._job_status[req.job_id] = "PENDING"
        return event

    def get_next_job(self, worker_id: Optional[str] = None) -> Optional[RemoteInferenceRequest]:
        """Called by polling endpoint to fetch the oldest pending inference job."""
        for job_id, req in list(self._pending_jobs.items()):
            if self._job_status.get(job_id) == "PENDING":
                self._job_status[job_id] = "DISPATCHED"
                self._job_dispatched_at[job_id] = time.time()
                return req
        return None

    def submit_result(self, job_id: str, response: RemoteInferenceResponse) -> None:
        """Called by worker completion endpoint to deliver result and unblock waiting task."""
        if job_id not in self._job_status:
            raise KeyError(f"Job '{job_id}' not found in active remote worker registry.")

        current_status = self._job_status[job_id]
        if current_status in ["COMPLETED", "FAILED", "CANCELLED", "TIMEOUT"]:
            raise ValueError(f"Job '{job_id}' is already in terminal state '{current_status}' (duplicate rejected).")

        if not response.images_base64:
            raise ValueError("Worker response contains no generated images.")

        # Validate image payloads before accepting
        effective_seed = response.seed if response.seed is not None else 42
        self._validate_and_decode_images(response.images_base64, seed=effective_seed)

        self._job_results[job_id] = response
        self._job_status[job_id] = "COMPLETED"

        event = self._job_events.get(job_id)
        if event:
            event.set()

    def submit_failure(self, job_id: str, error_message: str) -> None:
        """Called by worker failure endpoint to report worker crash/OOM."""
        if job_id not in self._job_status:
            raise KeyError(f"Job '{job_id}' not found in active remote worker registry.")

        current_status = self._job_status[job_id]
        if current_status in ["COMPLETED", "FAILED", "CANCELLED", "TIMEOUT"]:
            raise ValueError(f"Job '{job_id}' is already in terminal state '{current_status}'.")

        self._job_status[job_id] = "FAILED"
        self._job_results[job_id] = RemoteInferenceResponse(
            job_id=job_id,
            status="FAILED",
            error_message=error_message,
        )

        event = self._job_events.get(job_id)
        if event:
            event.set()

    def cancel_job(self, job_id: str) -> bool:
        """Cancels a pending or dispatched job."""
        if job_id in self._job_status:
            self._job_status[job_id] = "CANCELLED"
            event = self._job_events.get(job_id)
            if event:
                event.set()
            return True
        return False

    def _cleanup_job(self, job_id: str) -> None:
        """Cleans up internal tracking structures for a completed/failed job."""
        self._pending_jobs.pop(job_id, None)
        self._job_events.pop(job_id, None)
        self._job_results.pop(job_id, None)
        self._job_status.pop(job_id, None)
        self._job_dispatched_at.pop(job_id, None)

    # --- Image Validation ---

    def _validate_and_decode_images(
        self,
        images_b64: List[str],
        expected_width: Optional[int] = None,
        expected_height: Optional[int] = None,
        seed: Optional[int] = 42,
    ) -> List[GeneratedImagePayload]:
        """Validates raster image integrity, format, dimensions, and payload size ceiling."""
        payloads: List[GeneratedImagePayload] = []

        for b64_str in images_b64:
            if len(b64_str) > self.config.max_image_payload_bytes:
                raise ValueError(
                    f"Image payload exceeds maximum allowed size ({self.config.max_image_payload_bytes} bytes)."
                )

            try:
                raw_bytes = base64.b64decode(b64_str)
            except Exception as e:
                raise ValueError(f"Corrupted base64 payload from remote worker: {str(e)}")

            if not raw_bytes or len(raw_bytes) < 100:
                raise ValueError("Remote worker returned an empty or truncated image payload.")

            try:
                with Image.open(io.BytesIO(raw_bytes)) as pil_img:
                    pil_img.verify()
                    format_name = (pil_img.format or "PNG").upper()
                    if format_name not in ["PNG", "JPEG", "WEBP"]:
                        raise ValueError(f"Unsupported image format: {format_name}. Expected PNG, JPEG, or WEBP.")

                # Re-open after verify() to read dimensions safely
                with Image.open(io.BytesIO(raw_bytes)) as pil_img:
                    width, height = pil_img.size
                    mime_type = f"image/{format_name.lower()}"

                if width <= 0 or height <= 0 or width > 4096 or height > 4096:
                    raise ValueError(f"Invalid image dimensions: {width}x{height}.")

            except Exception as e:
                raise ValueError(f"Image header verification failed: {str(e)}")

            payloads.append(
                GeneratedImagePayload(
                    image_bytes=raw_bytes,
                    width=width,
                    height=height,
                    mime_type=mime_type,
                    seed=seed,
                )
            )

        return payloads

    # --- Pipeline Execution ---

    async def text_to_image(self, request: GenerationRequest) -> GenerationResult:
        preflight = await self.preflight_check(request.model_id)
        if not preflight.can_run:
            raise RuntimeError(f"[{preflight.status}] {preflight.reason}")

        job_id = request.extra_params.get("job_id") or str(uuid.uuid4())
        start_time = time.time()

        remote_req = RemoteInferenceRequest(
            job_id=job_id,
            operation="text_to_image",
            model_id=request.model_id,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            cfg_scale=request.cfg_scale,
            steps=request.steps,
            width=request.width,
            height=request.height,
            extra_params=request.extra_params,
        )

        event = self.enqueue_job(remote_req)

        try:
            await asyncio.wait_for(event.wait(), timeout=float(self.config.inference_timeout_seconds))
        except asyncio.TimeoutError:
            self._job_status[job_id] = "TIMEOUT"
            self._cleanup_job(job_id)
            raise TimeoutError(
                f"Remote GPU inference timed out after {self.config.inference_timeout_seconds} seconds. "
                "The worker notebook may be offline, disconnected, or processing another queue item."
            )

        status = self._job_status.get(job_id)

        if status == "CANCELLED":
            self._cleanup_job(job_id)
            raise RuntimeError(f"Job '{job_id}' was cancelled by the user during remote inference.")

        if status == "FAILED":
            res = self._job_results.get(job_id)
            err_msg = res.error_message if res else "Unknown remote worker error"
            self._cleanup_job(job_id)
            raise RuntimeError(f"Remote worker inference failed: {err_msg}")

        if status == "COMPLETED":
            res = self._job_results[job_id]
            resolved_seed = res.seed if res.seed is not None else (remote_req.seed or 42)
            image_payloads = self._validate_and_decode_images(
                res.images_base64,
                expected_width=request.width,
                expected_height=request.height,
                seed=resolved_seed,
            )
            self._cleanup_job(job_id)
            return GenerationResult(
                images=image_payloads,
                provider_name=self.provider_name,
                model_id=request.model_id,
                execution_time_seconds=round(time.time() - start_time, 2),
                seed=resolved_seed,
                metadata=res.metadata,
            )

        self._cleanup_job(job_id)
        raise RuntimeError(f"Unexpected job state '{status}' for job '{job_id}'.")

    async def image_to_image(self, request: Img2ImgRequest) -> GenerationResult:
        preflight = await self.preflight_check(request.model_id)
        if not preflight.can_run:
            raise RuntimeError(f"[{preflight.status}] {preflight.reason}")

        job_id = request.extra_params.get("job_id") or str(uuid.uuid4())
        start_time = time.time()

        source_b64 = base64.b64encode(request.source_image_bytes).decode("utf-8")

        remote_req = RemoteInferenceRequest(
            job_id=job_id,
            operation="image_to_image",
            model_id=request.model_id,
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            seed=request.seed,
            cfg_scale=request.cfg_scale,
            steps=request.steps,
            strength=request.strength,
            source_image_base64=source_b64,
            extra_params=request.extra_params,
        )

        event = self.enqueue_job(remote_req)

        try:
            await asyncio.wait_for(event.wait(), timeout=float(self.config.inference_timeout_seconds))
        except asyncio.TimeoutError:
            self._job_status[job_id] = "TIMEOUT"
            self._cleanup_job(job_id)
            raise TimeoutError(
                f"Remote GPU img2img inference timed out after {self.config.inference_timeout_seconds} seconds."
            )

        status = self._job_status.get(job_id)

        if status == "CANCELLED":
            self._cleanup_job(job_id)
            raise RuntimeError(f"Job '{job_id}' was cancelled by the user.")

        if status == "FAILED":
            res = self._job_results.get(job_id)
            err_msg = res.error_message if res else "Unknown remote worker error"
            self._cleanup_job(job_id)
            raise RuntimeError(f"Remote worker inference failed: {err_msg}")

        if status == "COMPLETED":
            res = self._job_results[job_id]
            resolved_seed = res.seed if res.seed is not None else (remote_req.seed or 42)
            image_payloads = self._validate_and_decode_images(
                res.images_base64,
                seed=resolved_seed,
            )
            self._cleanup_job(job_id)
            return GenerationResult(
                images=image_payloads,
                provider_name=self.provider_name,
                model_id=request.model_id,
                execution_time_seconds=round(time.time() - start_time, 2),
                seed=resolved_seed,
                metadata=res.metadata,
            )

        self._cleanup_job(job_id)
        raise RuntimeError(f"Unexpected job state '{status}' for job '{job_id}'.")

    async def inpaint(self, request: InpaintRequest) -> GenerationResult:
        raise NotImplementedError("Inpainting remote execution planned for Phase 2.")

    async def outpaint(self, request: OutpaintRequest) -> GenerationResult:
        raise NotImplementedError("Outpainting remote execution planned for Phase 2.")
