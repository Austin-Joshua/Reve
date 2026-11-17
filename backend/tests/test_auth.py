import pytest
import httpx


@pytest.mark.asyncio
async def test_register_and_login(client: httpx.AsyncClient):
    # 1. Register
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "artist@reve.ai",
            "password": "StrongPassword123!",
            "full_name": "Digital Artist",
        },
    )
    assert reg_resp.status_code == 201
    user_data = reg_resp.json()
    assert user_data["email"] == "artist@reve.ai"
    assert user_data["full_name"] == "Digital Artist"
    assert user_data["plan_tier"] == "free"
    assert user_data["credits_remaining"] == 50

    # 2. Duplicate registration rejected
    dup_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "artist@reve.ai",
            "password": "AnotherPassword123!",
        },
    )
    assert dup_resp.status_code == 409

    # 3. Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "artist@reve.ai",
            "password": "StrongPassword123!",
        },
    )
    assert login_resp.status_code == 200
    token_data = login_resp.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["token_type"] == "bearer"

    # 4. Access /auth/me with bearer token
    headers = {"Authorization": f"Bearer {token_data['access_token']}"}
    me_resp = await client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "artist@reve.ai"

    # 5. Refresh token
    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": token_data["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    new_token_data = refresh_resp.json()
    assert "access_token" in new_token_data
