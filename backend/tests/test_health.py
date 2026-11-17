import pytest
import httpx


@pytest.mark.asyncio
async def test_root_endpoint(client: httpx.AsyncClient):
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Reve-Inspired AI Platform"
    assert "version" in data
    assert "docs" in data


@pytest.mark.asyncio
async def test_health_check_endpoint(client: httpx.AsyncClient):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "services" in data
    assert data["services"]["database"]["status"] == "connected"
