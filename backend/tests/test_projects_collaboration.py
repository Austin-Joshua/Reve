import pytest
import httpx


@pytest.mark.asyncio
async def test_project_collaboration_and_rbac(client: httpx.AsyncClient):
    # 1. Register Alice (Owner), Bob (Collaborator), Charlie (Stranger)
    for email, name in [
        ("alice@reve.ai", "Alice"),
        ("bob@reve.ai", "Bob"),
        ("charlie@reve.ai", "Charlie"),
    ]:
        await client.post(
            "/api/v1/auth/register",
            json={"email": email, "password": "Password123!", "full_name": name},
        )

    async def get_token(email: str):
        resp = await client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": "Password123!"},
        )
        return resp.json()["access_token"]

    token_a = await get_token("alice@reve.ai")
    token_b = await get_token("bob@reve.ai")
    token_c = await get_token("charlie@reve.ai")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Get user profiles for IDs
    me_a = (await client.get("/api/v1/auth/me", headers=headers_a)).json()
    me_b = (await client.get("/api/v1/auth/me", headers=headers_b)).json()

    # 2. Alice creates a project
    proj_resp = await client.post(
        "/api/v1/projects",
        headers=headers_a,
        json={"name": "Collaborative Mural", "description": "Shared creative canvas"},
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()
    proj_id = project["id"]
    assert project["name"] == "Collaborative Mural"
    assert project["is_archived"] is False

    # 3. Alice updates project details
    patch_resp = await client.patch(
        f"/api/v1/projects/{proj_id}",
        headers=headers_a,
        json={"name": "Neo-Mural 2026", "description": "Updated description"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["name"] == "Neo-Mural 2026"

    # 4. Multi-User Isolation: Charlie (stranger) cannot access project
    charlie_get = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_c)
    assert charlie_get.status_code == 403

    # 5. Alice invites Bob as EDITOR
    invite_resp = await client.post(
        f"/api/v1/projects/{proj_id}/invitations",
        headers=headers_a,
        json={"email": "bob@reve.ai", "role": "EDITOR"},
    )
    assert invite_resp.status_code == 201
    invitation = invite_resp.json()
    assert invitation["invitee_email"] == "bob@reve.ai"
    assert invitation["role"] == "EDITOR"
    inv_id = invitation["id"]

    # 6. Bob checks pending invitations
    b_invites = await client.get("/api/v1/invitations", headers=headers_b)
    assert b_invites.status_code == 200
    assert len(b_invites.json()) == 1
    assert b_invites.json()[0]["id"] == inv_id

    # 7. Bob accepts the invitation
    accept_resp = await client.post(f"/api/v1/invitations/{inv_id}/accept", headers=headers_b)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "ACCEPTED"

    # 8. Bob can now access the project
    b_proj_resp = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_b)
    assert b_proj_resp.status_code == 200
    assert b_proj_resp.json()["name"] == "Neo-Mural 2026"

    # 9. Bob as EDITOR can update scene document
    update_scene_resp = await client.put(
        f"/api/v1/projects/{proj_id}/scene",
        headers=headers_b,
        json={
            "canvas": {"width": 1024, "height": 1024, "background": "#16292B"},
            "layers": [
                {
                    "id": "layer-editor-1",
                    "type": "raster",
                    "name": "Bob's Brushstroke",
                    "visible": True,
                    "opacity": 1.0,
                    "zIndex": 0,
                    "content": {},
                }
            ],
        },
    )
    assert update_scene_resp.status_code == 200

    # 10. Bob as EDITOR attempts to delete the project -> 403 Forbidden
    b_delete = await client.delete(f"/api/v1/projects/{proj_id}", headers=headers_b)
    assert b_delete.status_code == 403

    # 11. Bob as EDITOR attempts to invite Charlie -> 403 Forbidden
    b_invite_c = await client.post(
        f"/api/v1/projects/{proj_id}/invitations",
        headers=headers_b,
        json={"email": "charlie@reve.ai", "role": "VIEWER"},
    )
    assert b_invite_c.status_code == 403

    # 12. Alice downgrades Bob's role to VIEWER
    role_change = await client.patch(
        f"/api/v1/projects/{proj_id}/members/{me_b['id']}",
        headers=headers_a,
        json={"role": "VIEWER"},
    )
    assert role_change.status_code == 200
    assert role_change.json()["role"] == "VIEWER"

    # 13. Bob as VIEWER attempts to update scene document -> 403 Forbidden
    b_edit_scene = await client.put(
        f"/api/v1/projects/{proj_id}/scene",
        headers=headers_b,
        json={
            "canvas": {"width": 1024, "height": 1024, "background": "#000000"},
            "layers": [],
        },
    )
    assert b_edit_scene.status_code == 403

    # 14. Alice archives and restores project
    archive_resp = await client.post(f"/api/v1/projects/{proj_id}/archive", headers=headers_a)
    assert archive_resp.status_code == 200
    assert archive_resp.json()["is_archived"] is True

    restore_resp = await client.post(f"/api/v1/projects/{proj_id}/restore", headers=headers_a)
    assert restore_resp.status_code == 200
    assert restore_resp.json()["is_archived"] is False

    # 15. Alice transfers ownership to Bob
    transfer_resp = await client.post(
        f"/api/v1/projects/{proj_id}/transfer-ownership",
        headers=headers_a,
        json={"new_owner_user_id": me_b["id"]},
    )
    assert transfer_resp.status_code == 200
    assert transfer_resp.json()["user_id"] == me_b["id"]

    # Verify members list reflects new owner and demoted editor
    members_resp = await client.get(f"/api/v1/projects/{proj_id}/members", headers=headers_b)
    assert members_resp.status_code == 200
    members = members_resp.json()
    bob_member = next(m for m in members if m["user_id"] == me_b["id"])
    alice_member = next(m for m in members if m["user_id"] == me_a["id"])
    assert bob_member["role"] == "OWNER"
    assert alice_member["role"] == "EDITOR"

    # 16. Bob (now OWNER) removes Alice from the project
    remove_resp = await client.delete(
        f"/api/v1/projects/{proj_id}/members/{me_a['id']}",
        headers=headers_b,
    )
    assert remove_resp.status_code == 204

    # Alice can no longer access the project
    alice_check = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_a)
    assert alice_check.status_code == 403

    # 17. Bob deletes the project
    del_resp = await client.delete(f"/api/v1/projects/{proj_id}", headers=headers_b)
    assert del_resp.status_code == 204


@pytest.mark.asyncio
async def test_unregistered_email_invitation_claim_flow(client: httpx.AsyncClient):
    """Verify that an owner can invite an unregistered email, and when that user

    later registers with that email, the pending invitation is claimable.
    """
    # 1. Register Owner
    await client.post(
        "/api/v1/auth/register",
        json={"email": "diana@reve.ai", "password": "Password123!", "full_name": "Diana"},
    )
    login_d = await client.post(
        "/api/v1/auth/login",
        json={"email": "diana@reve.ai", "password": "Password123!"},
    )
    headers_d = {"Authorization": f"Bearer {login_d.json()['access_token']}"}

    # 2. Diana creates a project
    proj_resp = await client.post(
        "/api/v1/projects",
        headers=headers_d,
        json={"name": "Future Space", "description": "Avant-garde architecture"},
    )
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # 3. Diana invites an unregistered user
    unregistered_email = "newcomer_2026@external.org"
    invite_resp = await client.post(
        f"/api/v1/projects/{proj_id}/invitations",
        headers=headers_d,
        json={"email": unregistered_email, "role": "EDITOR"},
    )
    assert invite_resp.status_code == 201
    inv_data = invite_resp.json()
    assert inv_data["invitee_email"] == unregistered_email
    assert inv_data["role"] == "EDITOR"
    assert inv_data["status"] == "PENDING"
    inv_id = inv_data["id"]

    # 4. Unregistered user signs up now
    reg_newcomer = await client.post(
        "/api/v1/auth/register",
        json={
            "email": unregistered_email,
            "password": "Password123!",
            "full_name": "New Comer",
        },
    )
    assert reg_newcomer.status_code == 201

    login_newcomer = await client.post(
        "/api/v1/auth/login",
        json={"email": unregistered_email, "password": "Password123!"},
    )
    headers_newcomer = {"Authorization": f"Bearer {login_newcomer.json()['access_token']}"}

    # 5. Newcomer queries their pending invitations
    pending_resp = await client.get("/api/v1/invitations", headers=headers_newcomer)
    assert pending_resp.status_code == 200
    pending_list = pending_resp.json()
    assert len(pending_list) == 1
    assert pending_list[0]["id"] == inv_id
    assert pending_list[0]["project_name"] == "Future Space"

    # 6. Newcomer accepts the invitation
    accept_resp = await client.post(f"/api/v1/invitations/{inv_id}/accept", headers=headers_newcomer)
    assert accept_resp.status_code == 200
    assert accept_resp.json()["status"] == "ACCEPTED"

    # 7. Newcomer now has EDITOR access to the project
    proj_check = await client.get(f"/api/v1/projects/{proj_id}", headers=headers_newcomer)
    assert proj_check.status_code == 200
    assert proj_check.json()["role"] == "EDITOR"


@pytest.mark.asyncio
async def test_scene_persistence_roundtrip(client: httpx.AsyncClient):
    """Verify that canvas scenes can be saved and reloaded with layer data,

    and that non-members cannot read or edit scenes.
    """
    # 1. Register User E
    await client.post(
        "/api/v1/auth/register",
        json={"email": "elena@reve.ai", "password": "Password123!", "full_name": "Elena"},
    )
    login_e = await client.post(
        "/api/v1/auth/login",
        json={"email": "elena@reve.ai", "password": "Password123!"},
    )
    headers_e = {"Authorization": f"Bearer {login_e.json()['access_token']}"}

    # Register Stranger F
    await client.post(
        "/api/v1/auth/register",
        json={"email": "frank@reve.ai", "password": "Password123!", "full_name": "Frank"},
    )
    login_f = await client.post(
        "/api/v1/auth/login",
        json={"email": "frank@reve.ai", "password": "Password123!"},
    )
    headers_f = {"Authorization": f"Bearer {login_f.json()['access_token']}"}

    # 2. Elena creates a project
    proj_resp = await client.post(
        "/api/v1/projects",
        headers=headers_e,
        json={"name": "Scene Lab", "canvas_width": 512, "canvas_height": 512},
    )
    assert proj_resp.status_code == 201
    proj_id = proj_resp.json()["id"]

    # 3. Elena persists a scene with 2 layers
    scene_payload = {
        "canvas": {"width": 512, "height": 512, "background": "#16292B"},
        "layers": [
            {
                "id": "layer-bg-1",
                "type": "raster",
                "name": "Background Ambience",
                "visible": True,
                "locked": True,
                "opacity": 0.85,
                "zIndex": 0,
                "transform": {"x": 0, "y": 0, "width": 512, "height": 512, "rotation": 0},
                "content": {"url": "http://example.com/layer1.png"},
            },
            {
                "id": "layer-fg-2",
                "type": "raster",
                "name": "Foreground Subject",
                "visible": True,
                "locked": False,
                "opacity": 1.0,
                "zIndex": 1,
                "transform": {"x": 50, "y": 50, "width": 256, "height": 256, "rotation": 15},
                "content": {"url": "http://example.com/layer2.png"},
            },
        ],
    }

    put_resp = await client.put(
        f"/api/v1/projects/{proj_id}/scene",
        headers=headers_e,
        json=scene_payload,
    )
    assert put_resp.status_code == 200
    res_data = put_resp.json()
    assert res_data["project_id"] == proj_id
    assert len(res_data["layers"]) == 2

    # 4. Reload the scene via GET
    get_resp = await client.get(f"/api/v1/projects/{proj_id}/scene", headers=headers_e)
    assert get_resp.status_code == 200
    scene_data = get_resp.json()
    assert len(scene_data["layers"]) == 2
    assert scene_data["layers"][0]["id"] == "layer-bg-1"
    assert scene_data["layers"][1]["name"] == "Foreground Subject"
    assert scene_data["canvas"]["background"] == "#16292B"

    # 5. Frank (stranger) attempts to read and update scene -> 403 Forbidden
    frank_get = await client.get(f"/api/v1/projects/{proj_id}/scene", headers=headers_f)
    assert frank_get.status_code == 403

    frank_put = await client.put(
        f"/api/v1/projects/{proj_id}/scene",
        headers=headers_f,
        json=scene_payload,
    )
    assert frank_put.status_code == 403
