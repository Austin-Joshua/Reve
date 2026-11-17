from typing import Dict, List, Optional
from pydantic import BaseModel


class ModelMetadata(BaseModel):
    id: str
    name: str
    family: str  # flux, sdxl, sd15
    huggingface_repo_id: str
    parameter_count_billions: float
    native_resolution: int
    min_vram_gb_bf16: float
    min_vram_gb_fp8: float
    disk_storage_gb: float
    recommended_steps: int
    optimal_cfg: float
    scheduler_default: str
    capabilities: List[str]  # text2img, img2img, inpaint, outpaint
    license: str
    notes: str


MODEL_CATALOG: Dict[str, ModelMetadata] = {
    "FLUX.1-dev": ModelMetadata(
        id="FLUX.1-dev",
        name="FLUX.1 [dev]",
        family="flux",
        huggingface_repo_id="black-forest-labs/FLUX.1-dev",
        parameter_count_billions=12.0,
        native_resolution=1024,
        min_vram_gb_bf16=24.0,
        min_vram_gb_fp8=12.0,
        disk_storage_gb=23.8,
        recommended_steps=28,
        optimal_cfg=3.5,
        scheduler_default="FlowMatchEulerDiscreteScheduler",
        capabilities=["text2img", "img2img", "inpaint", "outpaint"],
        license="Non-Commercial (FLUX.1-dev License)",
        notes="Primary generation model. Requires 24GB VRAM for BF16 or 12GB with fp8 quantization. Unusable on sub-8GB GPUs.",
    ),
    "FLUX.1-schnell": ModelMetadata(
        id="FLUX.1-schnell",
        name="FLUX.1 [schnell]",
        family="flux",
        huggingface_repo_id="black-forest-labs/FLUX.1-schnell",
        parameter_count_billions=12.0,
        native_resolution=1024,
        min_vram_gb_bf16=24.0,
        min_vram_gb_fp8=12.0,
        disk_storage_gb=23.8,
        recommended_steps=4,
        optimal_cfg=1.0,
        scheduler_default="FlowMatchEulerDiscreteScheduler",
        capabilities=["text2img", "img2img"],
        license="Apache 2.0",
        notes="High-speed distilled variant of FLUX. 4-step generation. Requires minimum 12GB VRAM.",
    ),
    "SDXL-1.0": ModelMetadata(
        id="SDXL-1.0",
        name="Stable Diffusion XL 1.0",
        family="sdxl",
        huggingface_repo_id="stabilityai/stable-diffusion-xl-base-1.0",
        parameter_count_billions=6.6,
        native_resolution=1024,
        min_vram_gb_bf16=12.0,
        min_vram_gb_fp8=8.0,
        disk_storage_gb=6.9,
        recommended_steps=30,
        optimal_cfg=7.0,
        scheduler_default="EulerAncestralDiscreteScheduler",
        capabilities=["text2img", "img2img", "inpaint", "outpaint"],
        license="OpenRAIL++",
        notes="Robust fallback model. Runs on 8GB VRAM with fp16/fp8.",
    ),
    "SDXL-Turbo": ModelMetadata(
        id="SDXL-Turbo",
        name="SDXL Turbo",
        family="sdxl",
        huggingface_repo_id="stabilityai/sdxl-turbo",
        parameter_count_billions=6.6,
        native_resolution=512,
        min_vram_gb_bf16=8.0,
        min_vram_gb_fp8=6.0,
        disk_storage_gb=6.9,
        recommended_steps=1,
        optimal_cfg=0.0,
        scheduler_default="EulerAncestralDiscreteScheduler",
        capabilities=["text2img", "img2img"],
        license="Stability Non-Commercial Research Community License",
        notes="Ultra-fast 1-step generation model. Runs on 6-8GB VRAM.",
    ),
    "SD-1.5": ModelMetadata(
        id="SD-1.5",
        name="Stable Diffusion 1.5",
        family="sd15",
        huggingface_repo_id="runwayml/stable-diffusion-v1-5",
        parameter_count_billions=1.0,
        native_resolution=512,
        min_vram_gb_bf16=6.0,
        min_vram_gb_fp8=3.5,
        disk_storage_gb=4.2,
        recommended_steps=25,
        optimal_cfg=7.5,
        scheduler_default="PNDMScheduler",
        capabilities=["text2img", "img2img", "inpaint"],
        license="CreativeML OpenRAIL-M",
        notes="Lightweight 512x512 baseline. Minimal VRAM foot-print (~3.5-4GB fp16).",
    ),
}


def get_model_metadata(model_id: str) -> Optional[ModelMetadata]:
    return MODEL_CATALOG.get(model_id)


def get_model_catalog_report() -> List[Dict[str, Any]]:
    report = []
    for m in MODEL_CATALOG.values():
        report.append({
            "model_id": m.id,
            "name": m.name,
            "family": m.family,
            "parameters": f"{m.parameter_count_billions}B",
            "disk_size_gb": m.disk_storage_gb,
            "min_vram_bf16": f"{m.min_vram_gb_bf16}GB",
            "min_vram_fp8": f"{m.min_vram_gb_fp8}GB",
            "license": m.license,
            "capabilities": m.capabilities,
            "notes": m.notes,
        })
    return report
