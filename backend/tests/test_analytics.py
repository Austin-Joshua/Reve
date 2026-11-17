import pytest
import httpx


@pytest.mark.asyncio
async def test_user_profile_and_analytics(client: httpx.AsyncClient):
    # 1. Register User A and User B
    await client.post(
        "/api/v1/auth/register",
        json={"email": "creator_a@reve.ai", "password": "Password123!", "full_name": "Creator Alpha"},
    )
    await client.post(
        "/api/v1/auth/register",
        json={"email": "creator_b@reve.ai", "password": "Password123!", "full_name": "Creator Beta"},
    )

    async def login(email: str):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Password123!"},
        )
        return resp.json()["access_token"]

    token_a = await login("creator_a@reve.ai")
    token_b = await login("creator_b@reve.ai")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 2. User A updates profile
    patch_resp = await client.patch(
        "/api/v1/users/me",
        headers=headers_a,
        json={"full_name": "Master Creator"},
    )
    assert patch_resp.status_code == 200
    user_data = patch_resp.json()
    assert user_data["full_name"] == "Master Creator"

    # 3. User A checks analytics before any generation
    analytics_a = await client.get("/api/v1/users/me/analytics", headers=headers_a)
    assert analytics_a.status_code == 200
    data_a = analytics_a.json()
    assert data_a["total_generations"] == 0
    assert data_a["successful_generations"] == 0
    assert data_a["failed_generations"] == 0
    assert data_a["cancelled_generations"] == 0
    assert data_a["credits_remaining"] == 50
    assert data_a["total_credits_consumed"] == 0
    assert data_a["total_projects"] == 0
    assert data_a["total_conversations"] == 0
    assert data_a["total_assets"] == 0
    assert data_a["recent_activity"] == []

    # 4. User A creates a project and a conversation
    await client.post(
        "/api/v1/projects",
        headers=headers_a,
        json={"name": "Analytics Alpha Project"},
    )
    await client.post(
        "/api/v1/conversations",
        headers=headers_a,
        json={"title": "Alpha Chat"},
    )

    # 5. Check analytics reflects counts
    analytics_a_updated = await client.get("/api/v1/users/me/analytics", headers=headers_a)
    assert analytics_a_updated.status_code == 200
    data_a_updated = analytics_a_updated.json()
    assert data_a_updated["total_projects"] == 1
    assert data_a_updated["total_conversations"] == 1

    # 6. Multi-User Isolation: User B's analytics must still show 0 projects and 0 conversations
    analytics_b = await client.get("/api/v1/users/me/analytics", headers=headers_b)
    assert analytics_b.status_code == 200
    data_b = analytics_b.json()
    assert data_b["total_projects"] == 0
    assert data_b["total_conversations"] == 0
