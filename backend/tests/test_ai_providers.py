import pytest
import sys
from pathlib import Path

# Add ai-engine to sys.path
ai_engine_path = str(Path(__file__).resolve().parents[2] / "ai-engine")
if ai_engine_path not in sys.path:
    sys.path.append(ai_engine_path)

from ai_engine.providers.registry import ProviderRegistry
from ai_engine.providers.base import BaseImageProvider
from ai_engine.providers.local_diffusers import LocalDiffusersProvider
from ai_engine.providers.mock_provider import MockTestProvider
from ai_engine.pipelines.schemas import GenerationRequest, ProviderHealthStatus


@pytest.mark.asyncio
async def test_provider_registry():
    registered = ProviderRegistry.list_registered()
    assert "local_diffusers" in registered
    assert "mock_test" in registered

    provider = ProviderRegistry.get_provider("local_diffusers", allow_cpu=True)
    assert isinstance(provider, BaseImageProvider)
    assert provider.provider_name == "local_diffusers"


@pytest.mark.asyncio
async def test_local_diffusers_health_check():
    provider = LocalDiffusersProvider(allow_cpu=True)
    health = await provider.health_check()
    assert health.provider_name == "local_diffusers"
    assert health.device in ["cuda", "mps", "cpu"]
    # Depending on whether torch/cuda is installed in environment:
    assert health.status in [
        ProviderHealthStatus.HEALTHY,
        ProviderHealthStatus.DEGRADED,
        ProviderHealthStatus.UNAVAILABLE,
    ]
    if health.status == ProviderHealthStatus.UNAVAILABLE:
        assert "error" in health.details


@pytest.mark.asyncio
async def test_mock_provider_unit_test():
    # Verify that mock provider can only be instantiated with explicit test flag
    with pytest.raises(PermissionError):
        MockTestProvider(is_test_environment=False)

    test_provider = MockTestProvider(is_test_environment=True)
    health = await test_provider.health_check()
    assert health.status == ProviderHealthStatus.HEALTHY

    req = GenerationRequest(
        prompt="Test prompt",
        width=256,
        height=256,
        model_id="FLUX.1-dev",
    )
    res = await test_provider.text_to_image(req)
    assert len(res.images) == 1
    assert res.images[0].width == 256
    assert res.images[0].height == 256
    assert len(res.images[0].image_bytes) > 0


@pytest.mark.asyncio
async def test_remote_worker_provider():
    from ai_engine.providers.remote_worker import RemoteWorkerProvider, WorkerHeartbeat, RemoteWorkerConfig

    provider = RemoteWorkerProvider(RemoteWorkerConfig(worker_token="secret-token-123"))
    assert provider.provider_name == "remote_worker"
    assert "text2img" in provider.supported_capabilities

    # 1. Preflight with no active worker -> REMOTE_WORKER_OFFLINE
    preflight = await provider.preflight_check("FLUX.1-dev")
    assert preflight.can_run is False
    assert preflight.status == "REMOTE_WORKER_OFFLINE"

    # 2. Reject heartbeat with invalid token
    hb = WorkerHeartbeat(
        worker_id="test_worker_1",
        gpu_name="Tesla T4",
        vram_total_gb=15.0,
        vram_free_gb=14.2,
    )
    assert provider.update_heartbeat(hb, token="wrong-token") is False

    # 3. Accept heartbeat with valid token
    assert provider.update_heartbeat(hb, token="secret-token-123") is True

    # 4. Preflight with active worker for SD-1.5 (requires 4GB, has 14.2GB)
    preflight_sd = await provider.preflight_check("SD-1.5")
    assert preflight_sd.can_run is True
    assert preflight_sd.status == "READY"
    assert "Tesla T4" in preflight_sd.device

    # 5. Preflight with low VRAM worker (simulating insufficient VRAM)
    low_vram_hb = WorkerHeartbeat(
        worker_id="low_vram_worker",
        gpu_name="GTX 1050",
        vram_total_gb=4.0,
        vram_free_gb=2.0,
    )
    provider.update_heartbeat(low_vram_hb, token="secret-token-123")
    preflight_flux = await provider.preflight_check("FLUX.1-dev")
    assert preflight_flux.can_run is False
    assert preflight_flux.status == "HARDWARE_INSUFFICIENT_VRAM"
