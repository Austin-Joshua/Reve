import pytest
import httpx


@pytest.mark.asyncio
async def test_generation_job_queueing(client: httpx.AsyncClient):
    # 1. Register & login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "designer@reve.ai", "password": "Password123!"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "designer@reve.ai", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Check model catalog
    models_resp = await client.get("/api/v1/models")
    assert models_resp.status_code == 200
    models = models_resp.json()
    assert len(models) >= 2
    model_ids = [m["model_id"] for m in models]
    assert "FLUX.1-dev" in model_ids
    assert "SDXL-1.0" in model_ids

    # 3. Queue text-to-image job
    gen_resp = await client.post(
        "/api/v1/generations/text-to-image",
        headers=headers,
        json={
            "prompt": "Cinematic shot of an astronaut exploring an ancient alien temple",
            "negative_prompt": "blurry, low quality, distorted",
            "model_id": "FLUX.1-dev",
            "cfg_scale": 3.5,
            "steps": 28,
            "width": 1024,
            "height": 1024,
            "num_images": 1,
        },
    )
    assert gen_resp.status_code == 202
    job_data = gen_resp.json()
    assert "job_id" in job_data
    assert job_data["status"] == "QUEUED"
    job_id = job_data["job_id"]

    # 4. Poll job status
    poll_resp = await client.get(f"/api/v1/jobs/{job_id}", headers=headers)
    assert poll_resp.status_code == 200
    polled = poll_resp.json()
    assert polled["job_id"] == job_id
    assert polled["status"] in ["QUEUED", "PROCESSING", "FAILED", "COMPLETED"]

    # 5. Check user credit deduction or refund on failure
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.json()["credits_remaining"] in [49, 50]
