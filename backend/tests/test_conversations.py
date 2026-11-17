import pytest
import httpx


@pytest.mark.asyncio
async def test_conversation_lifecycle_and_messages(client: httpx.AsyncClient):
    # 1. Register & login User A
    await client.post(
        "/api/v1/auth/register",
        json={"email": "alice@reve.ai", "password": "Password123!", "full_name": "Alice"},
    )
    resp_a = await client.post(
        "/api/v1/auth/login",
        json={"email": "alice@reve.ai", "password": "Password123!"},
    )
    token_a = resp_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register & login User B
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bob@reve.ai", "password": "Password123!", "full_name": "Bob"},
    )
    resp_b = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob@reve.ai", "password": "Password123!"},
    )
    token_b = resp_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A creates a conversation
    create_resp = await client.post(
        "/api/v1/conversations",
        headers=headers_a,
        json={"title": "Concept Art Ideation"},
    )
    assert create_resp.status_code == 201
    conv = create_resp.json()
    assert conv["title"] == "Concept Art Ideation"
    conv_id = conv["id"]

    # 4. User A sends user and assistant messages
    msg1_resp = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=headers_a,
        json={"role": "user", "content": "Create a futuristic floating city in the clouds"},
    )
    assert msg1_resp.status_code == 201
    msg1 = msg1_resp.json()
    assert msg1["role"] == "user"
    assert msg1["content"] == "Create a futuristic floating city in the clouds"
    assert msg1["estimated_tokens"] > 0

    msg2_resp = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=headers_a,
        json={
            "role": "assistant",
            "content": "Rendered 1 image with seed 42",
            "metadata_json": {"seed": 42, "model": "SD-1.5"},
        },
    )
    assert msg2_resp.status_code == 201
    msg2 = msg2_resp.json()
    assert msg2["role"] == "assistant"
    assert msg2["metadata_json"]["seed"] == 42

    # 5. User A retrieves conversation detail with messages
    detail_resp = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["id"] == conv_id
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["id"] == msg1["id"]
    assert detail["messages"][1]["id"] == msg2["id"]

    # 6. User A updates conversation title
    patch_resp = await client.patch(
        f"/api/v1/conversations/{conv_id}",
        headers=headers_a,
        json={"title": "Updated Cloud City Ideation"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Updated Cloud City Ideation"

    # 7. Multi-User Isolation: User B cannot access User A's conversation
    unauth_detail = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_b)
    assert unauth_detail.status_code == 404

    unauth_msg = await client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        headers=headers_b,
        json={"role": "user", "content": "Attempting intrusion"},
    )
    assert unauth_msg.status_code == 404

    # 8. User A lists conversations
    list_resp = await client.get("/api/v1/conversations", headers=headers_a)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["id"] == conv_id

    # User B lists conversations: should be empty
    list_b_resp = await client.get("/api/v1/conversations", headers=headers_b)
    assert list_b_resp.status_code == 200
    assert len(list_b_resp.json()) == 0

    # 9. User A deletes conversation
    del_resp = await client.delete(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert del_resp.status_code == 204

    # Verify conversation is gone
    after_del = await client.get(f"/api/v1/conversations/{conv_id}", headers=headers_a)
    assert after_del.status_code == 404
