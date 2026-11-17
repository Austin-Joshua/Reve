from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
from ai_engine.pipelines.schemas import (
    GenerationRequest,
    Img2ImgRequest,
    InpaintRequest,
    OutpaintRequest,
    GenerationResult,
    ProviderHealth,
    PreflightResult,
)


class BaseImageProvider(ABC):
    """
    Abstract Base Class for all AI model inference providers.
    All inference backends must implement this interface.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Unique provider identifier (e.g. 'local_diffusers', 'replicate')."""
        pass

    @property
    @abstractmethod
    def supported_capabilities(self) -> List[str]:
        """List of operations supported by this provider (text2img, img2img, etc.)."""
        pass

    @abstractmethod
    async def preflight_check(self, model_id: str) -> PreflightResult:
        """
        Conduct preflight hardware and dependency check prior to inference.
        Must verify GPU, VRAM, RAM, dependencies, and model weight availability.
        """
        pass

    @abstractmethod
    async def text_to_image(self, request: GenerationRequest) -> GenerationResult:
        """
        Execute pixel-space text-to-image synthesis.
        Must return actual generated image bytes or raise an informative exception.
        """
        pass

    @abstractmethod
    async def image_to_image(self, request: Img2ImgRequest) -> GenerationResult:
        """
        Execute image-to-image transformation with prompt conditioning.
        """
        pass

    @abstractmethod
    async def inpaint(self, request: InpaintRequest) -> GenerationResult:
        """
        Execute region-based inpainting using a binary alpha mask.
        """
        pass

    @abstractmethod
    async def outpaint(self, request: OutpaintRequest) -> GenerationResult:
        """
        Execute canvas expansion / outpainting in specified directions.
        """
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """
        Report hardware, VRAM, and model readiness status.
        """
        pass
