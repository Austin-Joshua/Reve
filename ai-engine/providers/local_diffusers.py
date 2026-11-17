import os
import io
import time
from typing import Dict, Any, Optional, List
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
from ai_engine.model_registry.models import get_model_metadata


class LocalDiffusersProvider(BaseImageProvider):
    """
    Local Hugging Face diffusers inference provider.
    Supports FLUX.1-dev, FLUX.1-schnell, and SDXL using PyTorch.
    Follows a strict ₹0 preflight verification policy.
    Never returns fake or mock images in production paths.
    """

    def __init__(
        self,
        default_model: str = "FLUX.1-dev",
        device: Optional[str] = None,
        allow_cpu: bool = False,
    ):
        self._default_model = default_model
        self._allow_cpu = allow_cpu
        self._device = device or self._detect_device()
        self._pipeline = None
        self._loaded_model_id = None

    @property
    def provider_name(self) -> str:
        return "local_diffusers"

    @property
    def supported_capabilities(self) -> List[str]:
        return ["text2img", "img2img"]

    def _detect_device(self) -> str:
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except ImportError:
            pass
        return "cpu"

    async def preflight_check(self, model_id: str) -> PreflightResult:
        metadata = get_model_metadata(model_id)
        if not metadata:
            return PreflightResult(
                can_run=False,
                status="UNKNOWN_MODEL",
                reason=f"Model '{model_id}' is not registered in the model catalog.",
                model_id=model_id,
                required_vram_gb=0.0,
                device=self._device,
            )

        missing_reqs = []
        hardware_summary = {"device": self._device}

        # 1. Check PyTorch & Diffusers dependencies
        has_torch = False
        has_diffusers = False
        try:
            import torch
            has_torch = True
            hardware_summary["torch_version"] = torch.__version__
        except ImportError:
            missing_reqs.append("torch")

        try:
            import diffusers
            has_diffusers = True
            hardware_summary["diffusers_version"] = diffusers.__version__
        except ImportError:
            missing_reqs.append("diffusers")

        if not (has_torch and has_diffusers):
            return PreflightResult(
                can_run=False,
                status="DEPENDENCIES_MISSING",
                reason=f"Inference dependencies missing: {', '.join(missing_reqs)}. Real inference cannot execute.",
                model_id=model_id,
                required_vram_gb=metadata.min_vram_gb_fp8,
                device=self._device,
                missing_requirements=missing_reqs,
                hardware_summary=hardware_summary,
            )

        # 2. Check Hardware & VRAM
        import torch
        if not torch.cuda.is_available():
            hardware_summary["cuda_available"] = False
            if not self._allow_cpu:
                return PreflightResult(
                    can_run=False,
                    status="CUDA_UNAVAILABLE",
                    reason=(
                        f"CUDA GPU is not available. Model '{model_id}' requires a dedicated NVIDIA GPU "
                        f"with at least {metadata.min_vram_gb_fp8}GB VRAM. CPU inference is disabled in production."
                    ),
                    model_id=model_id,
                    required_vram_gb=metadata.min_vram_gb_fp8,
                    device="cpu",
                    hardware_summary=hardware_summary,
                )

        if torch.cuda.is_available():
            props = torch.cuda.get_device_properties(0)
            total_vram_gb = round(props.total_memory / (1024**3), 2)
            free_vram_gb = round(torch.cuda.mem_get_info()[0] / (1024**3), 2)
            hardware_summary["gpu_name"] = props.name
            hardware_summary["total_vram_gb"] = total_vram_gb
            hardware_summary["free_vram_gb"] = free_vram_gb

            # Check if VRAM is sufficient for minimum quantized model requirement
            min_needed = metadata.min_vram_gb_fp8
            if total_vram_gb < min_needed:
                return PreflightResult(
                    can_run=False,
                    status="HARDWARE_INSUFFICIENT_VRAM",
                    reason=(
                        f"Detected {total_vram_gb}GB VRAM on {props.name}. Model '{model_id}' requires at least "
                        f"{min_needed}GB VRAM (quantized) or {metadata.min_vram_gb_bf16}GB VRAM (full precision). "
                        f"Inference cannot proceed on this hardware."
                    ),
                    model_id=model_id,
                    required_vram_gb=min_needed,
                    detected_vram_gb=total_vram_gb,
                    device="cuda",
                    hardware_summary=hardware_summary,
                )

        # 3. Check model weights in HuggingFace cache
        hf_cache_dir = os.environ.get("HF_HOME") or os.path.expanduser("~/.cache/huggingface/hub")
        hardware_summary["hf_cache_dir"] = hf_cache_dir
        repo_slug = metadata.huggingface_repo_id.replace("/", "--")
        expected_dir = os.path.join(hf_cache_dir, f"models--{repo_slug}")

        weights_present = os.path.exists(expected_dir)
        hardware_summary["weights_cached"] = weights_present

        if not weights_present:
            return PreflightResult(
                can_run=False,
                status="MODEL_WEIGHTS_NOT_FOUND",
                reason=(
                    f"Model weights for '{model_id}' ({metadata.huggingface_repo_id}) are not downloaded in "
                    f"'{hf_cache_dir}'. Under ₹0-first rules, weights (~{metadata.parameter_count_billions}B params) "
                    f"must be explicitly reviewed and authorized prior to download."
                ),
                model_id=model_id,
                required_vram_gb=metadata.min_vram_gb_fp8,
                device=self._device,
                hardware_summary=hardware_summary,
                missing_requirements=["model_weights"],
            )

        # If all checks pass
        return PreflightResult(
            can_run=True,
            status="READY",
            reason="Hardware, dependencies, and model weights are verified and ready for inference.",
            model_id=model_id,
            required_vram_gb=metadata.min_vram_gb_fp8,
            device=self._device,
            hardware_summary=hardware_summary,
        )

    async def health_check(self) -> ProviderHealth:
        details = {}
        status = ProviderHealthStatus.HEALTHY

        try:
            import torch
            details["torch_version"] = torch.__version__
            details["cuda_available"] = torch.cuda.is_available()

            if torch.cuda.is_available():
                props = torch.cuda.get_device_properties(0)
                vram_total = round(props.total_memory / (1024**3), 2)
                vram_free = round(torch.cuda.mem_get_info()[0] / (1024**3), 2)
                details["gpu_name"] = props.name
                if vram_total < 8.0:
                    status = ProviderHealthStatus.DEGRADED
                    details["warning"] = f"GPU VRAM ({vram_total}GB) is below 8GB. FLUX requires ≥12GB."
            else:
                vram_total = None
                vram_free = None
                if not self._allow_cpu:
                    status = ProviderHealthStatus.UNAVAILABLE
                    details["error"] = "No CUDA GPU detected and CPU inference is disabled."
                else:
                    status = ProviderHealthStatus.DEGRADED
                    details["warning"] = "Running on CPU. Generation throughput will be slow."
        except ImportError:
            status = ProviderHealthStatus.UNAVAILABLE
            vram_total = None
            vram_free = None
            details["error"] = "PyTorch / diffusers not installed in runtime environment."

        return ProviderHealth(
            provider_name=self.provider_name,
            status=status,
            device=self._device,
            vram_total_gb=vram_total,
            vram_free_gb=vram_free,
            loaded_models=[self._loaded_model_id] if self._loaded_model_id else [],
            details=details,
        )

    async def text_to_image(self, request: GenerationRequest) -> GenerationResult:
        preflight = await self.preflight_check(request.model_id)
        if not preflight.can_run:
            raise RuntimeError(f"Preflight check failed [{preflight.status}]: {preflight.reason}")

        metadata = get_model_metadata(request.model_id)
        assert metadata is not None

        # Execute genuine diffusion inference
        import torch
        from diffusers import DiffusionPipeline

        start_time = time.time()
        if self._loaded_model_id != request.model_id or self._pipeline is None:
            dtype = torch.bfloat16 if self._device == "cuda" else torch.float32
            self._pipeline = DiffusionPipeline.from_pretrained(
                metadata.huggingface_repo_id,
                torch_dtype=dtype,
            )
            self._pipeline.to(self._device)
            self._loaded_model_id = request.model_id

        generator = None
        if request.seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(request.seed)

        output = self._pipeline(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            width=request.width,
            height=request.height,
            num_inference_steps=request.steps,
            guidance_scale=request.cfg_scale,
            num_images_per_prompt=request.num_images,
            generator=generator,
        )

        results = []
        for img in output.images:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            results.append(
                GeneratedImagePayload(
                    image_bytes=buf.getvalue(),
                    width=img.width,
                    height=img.height,
                    mime_type="image/png",
                    seed=request.seed or 0,
                )
            )

        duration = time.time() - start_time
        return GenerationResult(
            images=results,
            provider_name=self.provider_name,
            model_id=request.model_id,
            execution_time_seconds=duration,
            seed=request.seed or 0,
            metadata={"device": self._device},
        )

    async def image_to_image(self, request: Img2ImgRequest) -> GenerationResult:
        preflight = await self.preflight_check(request.model_id)
        if not preflight.can_run:
            raise RuntimeError(f"Preflight check failed [{preflight.status}]: {preflight.reason}")

        metadata = get_model_metadata(request.model_id)
        assert metadata is not None

        import torch
        from diffusers import AutoPipelineForImage2Image

        start_time = time.time()
        pipe = AutoPipelineForImage2Image.from_pretrained(
            metadata.huggingface_repo_id,
            torch_dtype=torch.float16 if self._device == "cuda" else torch.float32,
        )
        pipe.to(self._device)

        init_image = Image.open(io.BytesIO(request.source_image_bytes)).convert("RGB")
        generator = None
        if request.seed is not None:
            generator = torch.Generator(device=self._device).manual_seed(request.seed)

        output = pipe(
            prompt=request.prompt,
            negative_prompt=request.negative_prompt,
            image=init_image,
            strength=request.strength,
            num_inference_steps=request.steps,
            guidance_scale=request.cfg_scale,
            generator=generator,
        )

        results = []
        for img in output.images:
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            results.append(
                GeneratedImagePayload(
                    image_bytes=buf.getvalue(),
                    width=img.width,
                    height=img.height,
                    mime_type="image/png",
                    seed=request.seed or 0,
                )
            )

        duration = time.time() - start_time
        return GenerationResult(
            images=results,
            provider_name=self.provider_name,
            model_id=request.model_id,
            execution_time_seconds=duration,
            seed=request.seed or 0,
            metadata={"device": self._device},
        )

    async def inpaint(self, request: InpaintRequest) -> GenerationResult:
        raise NotImplementedError("Inpainting is a Phase 2 capability.")

    async def outpaint(self, request: OutpaintRequest) -> GenerationResult:
        raise NotImplementedError("Outpainting is a Phase 2 capability.")
