import pytest
import io
import time
import base64
from PIL import Image
import httpx

from app.core.config import settings
from ai_engine.providers.registry import ProviderRegistry
from ai_engine.providers.remote_worker import (
    RemoteWorkerProvider,
    WorkerHeartbeat,
    RemoteInferenceResponse,
)


def create_png_base64(width=512, height=512, color=(100, 150, 200)) -> str:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")


@pytest.fixture(autouse=True)
def reset_remote_provider():
    """Ensure a clean remote worker provider before and after each test."""
    provider = ProviderRegistry.get_provider("remote_worker")
    if isinstance(provider, RemoteWorkerProvider):
        provider._registered_workers.clear()
        provider._last_heartbeat = None
        provider._pending_jobs.clear()
        provider._job_events.clear()
        provider._job_results.clear()
        provider._job_status.clear()
        provider._job_dispatched_at.clear()
        provider.config.worker_token = settings.REVE_WORKER_SECRET_TOKEN
    yield


@pytest.mark.asyncio
async def test_worker_authentication(client: httpx.AsyncClient):
    hb_payload = {
        "worker_id": "test_colab_worker",
        "environment": "colab",
        "gpu_name": "NVIDIA Tesla T4",
        "vram_total_gb": 15.0,
        "vram_free_gb": 14.2,
        "cuda_version": "12.2",
        "torch_version": "2.3.1",
        "loaded_models": ["runwayml/stable-diffusion-v1-5"],
    }

    # 1. Missing token header -> 401
    resp_no_token = await client.post("/api/v1/internal/worker/heartbeat", json=hb_payload)
    assert resp_no_token.status_code == 401
    assert resp_no_token.json()["detail"]["code"] == "MISSING_WORKER_TOKEN"

    # 2. Invalid token header -> 401
    resp_bad_token = await client.post(
        "/api/v1/internal/worker/heartbeat",
        json=hb_payload,
        headers={"X-Worker-Token": "invalid-secret-token"},
    )
    assert resp_bad_token.status_code == 401
    assert resp_bad_token.json()["detail"]["code"] == "INVALID_WORKER_TOKEN"

    # 3. Valid token header -> 200
    resp_ok = await client.post(
        "/api/v1/internal/worker/heartbeat",
        json=hb_payload,
        headers={"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN},
    )
    assert resp_ok.status_code == 200
    assert resp_ok.json()["status"] == "acknowledged"
    assert resp_ok.json()["worker_id"] == "test_colab_worker"


@pytest.mark.asyncio
async def test_heartbeat_and_stale_detection(client: httpx.AsyncClient):
    provider = ProviderRegistry.get_provider("remote_worker")
    assert isinstance(provider, RemoteWorkerProvider)

    # Initially offline
    preflight = await provider.preflight_check("SD-1.5")
    assert preflight.can_run is False
    assert preflight.status == "REMOTE_WORKER_OFFLINE"

    # Register active heartbeat
    hb = WorkerHeartbeat(
        worker_id="active_t4",
        gpu_name="Tesla T4",
        vram_total_gb=15.0,
        vram_free_gb=14.0,
        timestamp=time.time(),
    )
    provider.update_heartbeat(hb, settings.REVE_WORKER_SECRET_TOKEN)

    # Should be online and ready
    preflight_ready = await provider.preflight_check("SD-1.5")
    assert preflight_ready.can_run is True
    assert preflight_ready.status == "READY"

    # Simulate stale heartbeat (> 45s ago)
    hb_stale = WorkerHeartbeat(
        worker_id="active_t4",
        gpu_name="Tesla T4",
        vram_total_gb=15.0,
        vram_free_gb=14.0,
        timestamp=time.time() - 60,
    )
    provider.update_heartbeat(hb_stale, settings.REVE_WORKER_SECRET_TOKEN)

    # Should detect stale state and mark offline
    preflight_stale = await provider.preflight_check("SD-1.5")
    assert preflight_stale.can_run is False
    assert preflight_stale.status == "REMOTE_WORKER_OFFLINE"


@pytest.mark.asyncio
async def test_job_polling_and_dispatch(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}

    # 1. Poll when no jobs are pending -> 204 No Content
    poll_empty = await client.get("/api/v1/internal/worker/jobs/poll", headers=worker_headers)
    assert poll_empty.status_code == 204

    # 2. Enqueue a job on the provider
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    req = RemoteInferenceRequest(
        job_id="test_job_101",
        model_id="SD-1.5",
        prompt="A photo of an astronaut on Mars",
        width=512,
        height=512,
        steps=25,
        cfg_scale=7.5,
        seed=12345,
    )
    provider.enqueue_job(req)

    # 3. Poll again -> 200 with job payload
    poll_active = await client.get("/api/v1/internal/worker/jobs/poll", headers=worker_headers)
    assert poll_active.status_code == 200
    data = poll_active.json()
    assert data["job_id"] == "test_job_101"
    assert data["prompt"] == "A photo of an astronaut on Mars"
    assert data["width"] == 512
    assert data["steps"] == 25
    assert data["seed"] == 12345

    # 4. Immediate second poll -> 204 No Content (already dispatched)
    poll_again = await client.get("/api/v1/internal/worker/jobs/poll", headers=worker_headers)
    assert poll_again.status_code == 204


@pytest.mark.asyncio
async def test_successful_image_completion(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    req = RemoteInferenceRequest(
        job_id="test_job_success",
        model_id="SD-1.5",
        prompt="A serene Japanese garden with cherry blossoms",
        width=512,
        height=512,
    )
    provider.enqueue_job(req)

    # Worker completes job with valid PNG base64
    valid_b64 = create_png_base64(512, 512)
    complete_resp = await client.post(
        "/api/v1/internal/worker/jobs/test_job_success/complete",
        headers=worker_headers,
        json={
            "job_id": "test_job_success",
            "status": "SUCCESS",
            "images_base64": [valid_b64],
            "seed": 42,
            "model_id": "SD-1.5",
            "execution_time_seconds": 3.8,
        },
    )
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "received"
    assert provider._job_status["test_job_success"] == "COMPLETED"


@pytest.mark.asyncio
async def test_invalid_and_corrupt_image_payloads(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    # 1. Invalid base64 string -> 422
    provider.enqueue_job(RemoteInferenceRequest(job_id="corrupt_b64", model_id="SD-1.5", prompt="test"))
    resp_bad_b64 = await client.post(
        "/api/v1/internal/worker/jobs/corrupt_b64/complete",
        headers=worker_headers,
        json={"job_id": "corrupt_b64", "status": "SUCCESS", "images_base64": ["!!!NOT_BASE_64!!!"]},
    )
    assert resp_bad_b64.status_code == 422
    assert resp_bad_b64.json()["detail"]["code"] == "INVALID_IMAGE_PAYLOAD"

    # 2. Valid base64 but corrupt non-image bytes -> 422
    provider.enqueue_job(RemoteInferenceRequest(job_id="corrupt_header", model_id="SD-1.5", prompt="test"))
    fake_bytes_b64 = base64.b64encode(b"This is plain text, not a valid PNG or JPEG image.").decode("utf-8")
    resp_bad_header = await client.post(
        "/api/v1/internal/worker/jobs/corrupt_header/complete",
        headers=worker_headers,
        json={"job_id": "corrupt_header", "status": "SUCCESS", "images_base64": [fake_bytes_b64]},
    )
    assert resp_bad_header.status_code == 422

    # 3. Empty images list -> 422
    provider.enqueue_job(RemoteInferenceRequest(job_id="empty_images", model_id="SD-1.5", prompt="test"))
    resp_empty = await client.post(
        "/api/v1/internal/worker/jobs/empty_images/complete",
        headers=worker_headers,
        json={"job_id": "empty_images", "status": "SUCCESS", "images_base64": []},
    )
    assert resp_empty.status_code == 422


@pytest.mark.asyncio
async def test_duplicate_result_submission_rejected(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    provider.enqueue_job(RemoteInferenceRequest(job_id="dup_test", model_id="SD-1.5", prompt="test"))
    valid_b64 = create_png_base64(256, 256)

    payload = {
        "job_id": "dup_test",
        "status": "SUCCESS",
        "images_base64": [valid_b64],
        "seed": 42,
    }

    # First completion -> 200
    res1 = await client.post("/api/v1/internal/worker/jobs/dup_test/complete", headers=worker_headers, json=payload)
    assert res1.status_code == 200

    # Duplicate completion -> 409 Conflict
    res2 = await client.post("/api/v1/internal/worker/jobs/dup_test/complete", headers=worker_headers, json=payload)
    assert res2.status_code == 409
    assert res2.json()["detail"]["code"] == "DUPLICATE_SUBMISSION"


@pytest.mark.asyncio
async def test_worker_failure_submission(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    provider.enqueue_job(RemoteInferenceRequest(job_id="fail_test", model_id="SD-1.5", prompt="test"))

    res = await client.post(
        "/api/v1/internal/worker/jobs/fail_test/fail",
        headers=worker_headers,
        json={"error_message": "CUDA out of memory during backward pass"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "failure_recorded"
    assert provider._job_status["fail_test"] == "FAILED"


@pytest.mark.asyncio
async def test_cancelled_job_result_rejection(client: httpx.AsyncClient):
    worker_headers = {"X-Worker-Token": settings.REVE_WORKER_SECRET_TOKEN}
    provider = ProviderRegistry.get_provider("remote_worker")
    from ai_engine.providers.remote_worker import RemoteInferenceRequest

    provider.enqueue_job(RemoteInferenceRequest(job_id="cancel_rejection_job", model_id="SD-1.5", prompt="test"))

    # Cancel job
    provider.cancel_job("cancel_rejection_job")

    # Worker tries to complete a cancelled job -> 409 Conflict
    valid_b64 = create_png_base64(256, 256)
    res = await client.post(
        "/api/v1/internal/worker/jobs/cancel_rejection_job/complete",
        headers=worker_headers,
        json={"job_id": "cancel_rejection_job", "status": "SUCCESS", "images_base64": [valid_b64]},
    )
    assert res.status_code == 409
    assert res.json()["detail"]["code"] == "DUPLICATE_SUBMISSION"


@pytest.mark.asyncio
async def test_sse_authentication_and_ownership(client: httpx.AsyncClient):
    # 1. SSE without token -> 401 Unauthorized
    resp_no_token = await client.get("/api/v1/jobs/nonexistent_job/stream")
    assert resp_no_token.status_code == 401
    assert resp_no_token.json()["detail"]["code"] == "AUTHENTICATION_REQUIRED"

    # 2. SSE with invalid token -> 401 Unauthorized
    resp_bad_token = await client.get("/api/v1/jobs/nonexistent_job/stream?token=invalid.jwt.token")
    assert resp_bad_token.status_code == 401
    assert resp_bad_token.json()["detail"]["code"] == "INVALID_TOKEN"


@pytest.mark.asyncio
async def test_provider_initialization_kwargs():
    # Verify that RemoteWorkerProvider accepts allow_cpu and other kwargs from ProviderRegistry
    ProviderRegistry.reset()
    provider = ProviderRegistry.get_provider("remote_worker", allow_cpu=True, extra_unused_kwarg="safe")
    assert provider.provider_name == "remote_worker"
    assert provider.allow_cpu is True


@pytest.mark.asyncio
async def test_worker_timeout_exception():
    provider = ProviderRegistry.get_provider("remote_worker")
    provider.config.inference_timeout_seconds = 0.1  # 100ms
    provider.update_heartbeat(
        WorkerHeartbeat(worker_id="t4_timeout", gpu_name="Tesla T4", vram_total_gb=15.0, vram_free_gb=14.0),
        settings.REVE_WORKER_SECRET_TOKEN,
    )
    from ai_engine.pipelines.schemas import GenerationRequest

    req = GenerationRequest(
        prompt="Timeout prompt",
        model_id="SD-1.5",
        extra_params={"job_id": "job_will_timeout"},
    )
    with pytest.raises(TimeoutError) as exc_info:
        await provider.text_to_image(req)
    assert "timed out after 0.1 seconds" in str(exc_info.value)
    assert "job_will_timeout" not in provider._pending_jobs


@pytest.mark.asyncio
async def test_credit_refund_idempotency(client: httpx.AsyncClient):
    # Register & login
    await client.post("/api/v1/auth/register", json={"email": "idempotent@reve.ai", "password": "Password123!"})
    login_resp = await client.post("/api/v1/auth/login", json={"email": "idempotent@reve.ai", "password": "Password123!"})
    token = login_resp.json()["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}

    # Create job
    gen_resp = await client.post(
        "/api/v1/generations/text-to-image",
        headers=user_headers,
        json={"prompt": "Test idempotent refund", "num_images": 2},
    )
    job_id = gen_resp.json()["job_id"]

    # Deducted 2 credits -> 48
    me1 = await client.get("/api/v1/auth/me", headers=user_headers)
    assert me1.json()["credits_remaining"] == 48

    # Cancel once -> refunded to 50
    cancel1 = await client.post(f"/api/v1/jobs/{job_id}/cancel", headers=user_headers)
    assert cancel1.status_code == 200
    assert cancel1.json()["status"] == "CANCELLED"
    me2 = await client.get("/api/v1/auth/me", headers=user_headers)
    assert me2.json()["credits_remaining"] == 50

    # Cancel second time -> 400 Bad Request, credits remain 50 (never double refunded)
    cancel2 = await client.post(f"/api/v1/jobs/{job_id}/cancel", headers=user_headers)
    assert cancel2.status_code == 400
    me3 = await client.get("/api/v1/auth/me", headers=user_headers)
    assert me3.json()["credits_remaining"] == 50
