import time
import io
from typing import List
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


class MockTestProvider(BaseImageProvider):
    """
    STRICTLY FOR AUTOMATED UNIT AND INTEGRATION TESTS.
    Explicitly marked as mock test provider.
    Prohibited in production pipelines.
    """

    def __init__(self, is_test_environment: bool = False):
        if not is_test_environment:
            raise PermissionError("MockTestProvider can ONLY be instantiated in automated test suites.")
        self._is_test = is_test_environment

    @property
    def provider_name(self) -> str:
        return "mock_test_provider"

    @property
    def supported_capabilities(self) -> List[str]:
        return ["text2img", "img2img"]

    async def preflight_check(self, model_id: str) -> PreflightResult:
        return PreflightResult(
            can_run=True,
            status="READY",
            reason="Mock test environment always reports ready for automated testing.",
            model_id=model_id,
            required_vram_gb=0.0,
            device="cpu",
            hardware_summary={"is_test_mock": True},
        )

    async def health_check(self) -> ProviderHealth:
        return ProviderHealth(
            provider_name=self.provider_name,
            status=ProviderHealthStatus.HEALTHY,
            device="cpu",
            vram_total_gb=16.0,
            vram_free_gb=12.0,
            loaded_models=["FLUX.1-dev"],
            details={"is_mock": True},
        )

    async def text_to_image(self, request: GenerationRequest) -> GenerationResult:
        start = time.time()
        # Create a test pattern image for test verification
        img = Image.new("RGB", (request.width, request.height), color=(124, 92, 252))
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        raw_bytes = buf.getvalue()

        return GenerationResult(
            images=[
                GeneratedImagePayload(
                    image_bytes=raw_bytes,
                    width=request.width,
                    height=request.height,
                    mime_type="image/png",
                    seed=request.seed or 42,
                )
            ],
            provider_name=self.provider_name,
            model_id=request.model_id,
            execution_time_seconds=time.time() - start,
            seed=request.seed or 42,
            metadata={"is_test_mock": True},
        )

    async def image_to_image(self, request: Img2ImgRequest) -> GenerationResult:
        start = time.time()
        # Verify valid source image
        with Image.open(io.BytesIO(request.source_image_bytes)) as src:
            w, h = src.size

        # Produce modified test image
        img = Image.new("RGB", (w, h), color=(34, 197, 94))
        buf = io.BytesIO()
        img.save(buf, format="PNG")

        return GenerationResult(
            images=[
                GeneratedImagePayload(
                    image_bytes=buf.getvalue(),
                    width=w,
                    height=h,
                    mime_type="image/png",
                    seed=request.seed or 42,
                )
            ],
            provider_name=self.provider_name,
            model_id=request.model_id,
            execution_time_seconds=time.time() - start,
            seed=request.seed or 42,
            metadata={"is_test_mock": True},
        )

    async def inpaint(self, request: InpaintRequest) -> GenerationResult:
        raise NotImplementedError("Inpainting is a Phase 2 capability.")

    async def outpaint(self, request: OutpaintRequest) -> GenerationResult:
        raise NotImplementedError("Outpainting is a Phase 2 capability.")
