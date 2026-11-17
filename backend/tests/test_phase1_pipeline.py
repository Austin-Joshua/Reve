import pytest
import io
from PIL import Image
import httpx

from app.core.storage import storage_manager
from ai_engine.providers.registry import ProviderRegistry
from ai_engine.providers.mock_provider import MockTestProvider
from ai_engine.providers.local_diffusers import LocalDiffusersProvider
from ai_engine.pipelines.schemas import GenerationRequest, Img2ImgRequest


def create_test_image_bytes(width=512, height=512, format="PNG") -> bytes:
    img = Image.new("RGB", (width, height), color=(70, 130, 180))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()


@pytest.mark.asyncio
async def test_image_upload_validation(client: httpx.AsyncClient):
    # 1. Register and login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "uploader@reve.ai", "password": "Password123!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "uploader@reve.ai", "password": "Password123!"},
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Reject empty file
    empty_res = await client.post(
        "/api/v1/images/upload",
        headers=headers,
        files={"file": ("empty.png", b"", "image/png")},
    )
    assert empty_res.status_code == 400
    assert empty_res.json()["detail"]["code"] == "VALIDATION_INVALID_IMAGE"

    # 3. Reject corrupt/invalid binary file
    corrupt_res = await client.post(
        "/api/v1/images/upload",
        headers=headers,
        files={"file": ("corrupt.png", b"NOT_AN_IMAGE_HEADER_DATA_STREAM", "image/png")},
    )
    assert corrupt_res.status_code == 400

    # 4. Accept valid PNG image
    valid_png = create_test_image_bytes(256, 256, "PNG")
    upload_res = await client.post(
        "/api/v1/images/upload",
        headers=headers,
        files={"file": ("test_source.png", valid_png, "image/png")},
    )
    assert upload_res.status_code == 201
    data = upload_res.json()
    assert "image_id" in data
    assert data["width"] == 256
    assert data["height"] == 256
    assert data["mime_type"] == "image/png"
    assert "url" in data
    assert "thumbnail_url" in data

    # 5. Fetch image metadata
    meta_res = await client.get(f"/api/v1/images/{data['image_id']}", headers=headers)
    assert meta_res.status_code == 200
    assert meta_res.json()["id"] == data["image_id"]

    # 6. Assert fix B3: No filename collision on duplicate filenames
    valid_png_2 = create_test_image_bytes(300, 300, "PNG")
    upload_res_2 = await client.post(
        "/api/v1/images/upload",
        headers=headers,
        files={"file": ("test_source.png", valid_png_2, "image/png")},  # exact same filename
    )
    assert upload_res_2.status_code == 201
    data_2 = upload_res_2.json()
    assert data_2["image_id"] != data["image_id"]
    assert data_2["width"] == 300

    # First image must still exist intact with original dimensions
    meta_res_1 = await client.get(f"/api/v1/images/{data['image_id']}", headers=headers)
    assert meta_res_1.status_code == 200
    assert meta_res_1.json()["width"] == 256



@pytest.mark.asyncio
async def test_generation_request_validation(client: httpx.AsyncClient):
    # Register and login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "validator@reve.ai", "password": "Password123!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "validator@reve.ai", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Reject invalid dimensions (not multiple of 8)
    res_dim = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={"prompt": "A test prompt", "width": 501, "height": 500},
    )
    assert res_dim.status_code == 422

    # 2. Reject empty prompt
    res_prompt = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={"prompt": ""},
    )
    assert res_prompt.status_code == 422


@pytest.mark.asyncio
async def test_job_cancellation_and_credit_refund(client: httpx.AsyncClient, monkeypatch):
    async def noop_exec(job_id: str):
        pass
    monkeypatch.setattr("app.api.v1.generations.execute_generation_job", noop_exec)

    await client.post(
        "/api/v1/auth/register",
        json={"email": "canceller@reve.ai", "password": "Password123!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "canceller@reve.ai", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # Queue job
    gen_res = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={"prompt": "Prompt to cancel", "num_images": 2},
    )
    assert gen_res.status_code == 202
    job_id = gen_res.json()["job_id"]

    # Check credits deducted by 2 (from 50 to 48)
    me_before = await client.get("/api/v1/auth/me", headers=headers)
    assert me_before.json()["credits_remaining"] == 48

    # Cancel job
    cancel_res = await client.post(f"/api/v1/jobs/{job_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Verify credits refunded back to 50
    me_after = await client.get("/api/v1/auth/me", headers=headers)
    assert me_after.json()["credits_remaining"] == 50


@pytest.mark.asyncio
async def test_image_to_image_workflow_with_mock(client: httpx.AsyncClient, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.IMAGE_PROVIDER", "mock_test")

    await client.post(
        "/api/v1/auth/register",
        json={"email": "img2img_user@reve.ai", "password": "Password123!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "img2img_user@reve.ai", "password": "Password123!"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    # 1. Upload source image
    valid_png = create_test_image_bytes(512, 512, "PNG")
    upload_res = await client.post(
        "/api/v1/images/upload",
        headers=headers,
        files={"file": ("source.png", valid_png, "image/png")},
    )
    source_id = upload_res.json()["image_id"]

    # 2. Submit img2img request
    i2i_res = await client.post(
        "/api/v1/generations/image-to-image",
        headers=headers,
        json={
            "source_image_id": source_id,
            "prompt": "Convert to watercolor painting",
            "strength": 0.65,
        },
    )
    assert i2i_res.status_code == 202
    job_id = i2i_res.json()["job_id"]

    # 3. Check job status
    poll_res = await client.get(f"/api/v1/jobs/{job_id}", headers=headers)
    assert poll_res.status_code == 200
    assert poll_res.json()["job_id"] == job_id


@pytest.mark.asyncio
async def test_preflight_check_hardware_reporting():
    provider = LocalDiffusersProvider(allow_cpu=False)
    # Check preflight on FLUX.1-dev without GPU/weights
    preflight = await provider.preflight_check("FLUX.1-dev")
    assert isinstance(preflight.can_run, bool)
    assert preflight.model_id == "FLUX.1-dev"
    assert preflight.required_vram_gb >= 12.0
    # Must report why it cannot run
    assert preflight.status in [
        "DEPENDENCIES_MISSING",
        "CUDA_UNAVAILABLE",
        "HARDWARE_INSUFFICIENT_VRAM",
        "MODEL_WEIGHTS_NOT_FOUND",
        "READY",
    ]
    if not preflight.can_run:
        assert len(preflight.reason) > 0
