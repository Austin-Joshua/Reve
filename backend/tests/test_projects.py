import pytest
import httpx


@pytest.mark.asyncio
async def test_project_and_scene_lifecycle(client: httpx.AsyncClient):
    # 1. Register & login
    await client.post(
        "/api/v1/auth/register",
        json={"email": "creator@reve.ai", "password": "Password123!"},
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "creator@reve.ai", "password": "Password123!"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create project
    proj_resp = await client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": "Cyberpunk Poster",
            "canvas_width": 1024,
            "canvas_height": 1024,
            "canvas_background": "#0A0A0B",
        },
    )
    assert proj_resp.status_code == 201
    project = proj_resp.json()
    assert project["name"] == "Cyberpunk Poster"
    project_id = project["id"]

    # 3. List projects
    list_resp = await client.get("/api/v1/projects", headers=headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1

    # 4. Get scene document
    scene_resp = await client.get(f"/api/v1/projects/{project_id}/scene", headers=headers)
    assert scene_resp.status_code == 200
    scene = scene_resp.json()
    assert scene["canvas_data"]["width"] == 1024
    assert scene["layers_data"] == []

    # 5. Update scene document with a raster layer and text layer
    update_scene_resp = await client.put(
        f"/api/v1/projects/{project_id}/scene",
        headers=headers,
        json={
            "canvas": {"width": 1024, "height": 1024, "background": "#111113"},
            "layers": [
                {
                    "id": "layer-1",
                    "type": "raster",
                    "name": "Background Artwork",
                    "visible": True,
                    "opacity": 1.0,
                    "zIndex": 0,
                    "content": {"imageUrl": "http://localhost:9000/reve-assets/bg.png"},
                },
                {
                    "id": "layer-2",
                    "type": "text",
                    "name": "Headline",
                    "visible": True,
                    "opacity": 1.0,
                    "zIndex": 1,
                    "content": {"text": "NEO TOKYO", "fontFamily": "Inter", "fontSize": 48},
                },
            ],
        },
    )
    assert update_scene_resp.status_code == 200
    updated_scene = update_scene_resp.json()
    assert updated_scene["version"] == 2
    assert len(updated_scene["layers_data"]) == 2
    assert updated_scene["layers_data"][0]["type"] == "raster"
    assert updated_scene["layers_data"][1]["type"] == "text"
