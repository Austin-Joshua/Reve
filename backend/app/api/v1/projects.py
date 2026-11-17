from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Project, SceneDocument
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    SceneDocumentResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    req: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=current_user.id,
        name=req.name,
        description=req.description,
        canvas_width=req.canvas_width,
        canvas_height=req.canvas_height,
        canvas_background=req.canvas_background,
    )
    db.add(project)
    await db.flush()

    # Create default empty scene document
    scene_doc = SceneDocument(
        project_id=project.id,
        version=1,
        canvas_data={
            "width": req.canvas_width,
            "height": req.canvas_height,
            "background": req.canvas_background,
        },
        layers_data=[],
    )
    db.add(scene_doc)
    await db.flush()
    await db.refresh(project)
    return project


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.user_id == current_user.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"})
    return project


@router.get("/{project_id}/scene", response_model=SceneDocumentResponse)
async def get_project_scene(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify project ownership
    await get_project(project_id, current_user, db)
    result = await db.execute(select(SceneDocument).where(SceneDocument.project_id == project_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail={"code": "SCENE_NOT_FOUND", "message": "Scene document not found"})
    return scene


@router.put("/{project_id}/scene", response_model=SceneDocumentResponse)
async def update_project_scene(
    project_id: str,
    scene_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project(project_id, current_user, db)
    result = await db.execute(select(SceneDocument).where(SceneDocument.project_id == project_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail={"code": "SCENE_NOT_FOUND", "message": "Scene document not found"})

    scene.version += 1
    if "canvas" in scene_data:
        scene.canvas_data = scene_data["canvas"]
    if "layers" in scene_data:
        scene.layers_data = scene_data["layers"]

    await db.flush()
    await db.refresh(scene)
    return scene
