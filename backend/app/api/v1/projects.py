from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import (
    User,
    Project,
    SceneDocument,
    ProjectMember,
    ProjectInvitation,
    Generation,
    Asset,
)
from app.schemas.project import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectMemberResponse,
    MemberRoleUpdateRequest,
    InvitationCreateRequest,
    InvitationResponse,
    OwnershipTransferRequest,
    SceneDocumentResponse,
)

router = APIRouter(prefix="/projects", tags=["projects"])


async def get_project_and_role(
    project_id: str,
    user_id: str,
    db: AsyncSession,
    min_role: str = "VIEWER",
) -> tuple[Project, str]:
    """
    Enforces project-level role-based authorization:
    - OWNER: full administrative control, membership management, deletion.
    - EDITOR: modify scene, create/edit assets, start generations.
    - VIEWER: read-only access to canvas and history.
    """
    res = await db.execute(select(Project).where(Project.id == project_id))
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found"},
        )

    if project.user_id == user_id:
        return project, "OWNER"

    mem_res = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == user_id,
        )
    )
    member = mem_res.scalar_one_or_none()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCESS_DENIED", "message": "You do not have access to this project."},
        )

    role = member.role
    hierarchy = {"VIEWER": 1, "EDITOR": 2, "OWNER": 3}
    if hierarchy.get(role, 0) < hierarchy.get(min_role, 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "INSUFFICIENT_PERMISSIONS", "message": f"Requires {min_role} role, but user has {role}."},
        )

    return project, role


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    req: ProjectCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        user_id=current_user.id,
        name=req.name.strip() if req.name else "Untitled Project",
        description=req.description,
        canvas_width=req.canvas_width,
        canvas_height=req.canvas_height,
        canvas_background=req.canvas_background,
        is_archived=False,
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

    # Automatically add creator as OWNER member
    member = ProjectMember(
        project_id=project.id,
        user_id=current_user.id,
        role="OWNER",
    )
    db.add(member)

    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=project.is_archived,
        role="OWNER",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = Query(False, description="Include archived projects"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch projects owned by user or where user is an active member
    owned_query = select(Project).where(Project.user_id == current_user.id)
    if not include_archived:
        owned_query = owned_query.where(Project.is_archived == False)

    owned_res = await db.execute(owned_query)
    owned_projects = owned_res.scalars().all()

    # Shared projects via membership
    member_query = (
        select(Project, ProjectMember.role)
        .join(ProjectMember, Project.id == ProjectMember.project_id)
        .where(ProjectMember.user_id == current_user.id, Project.user_id != current_user.id)
    )
    if not include_archived:
        member_query = member_query.where(Project.is_archived == False)

    member_res = await db.execute(member_query)
    member_rows = member_res.all()

    items = []
    seen_ids = set()

    for p in owned_projects:
        seen_ids.add(p.id)
        items.append(
            ProjectResponse(
                id=p.id,
                user_id=p.user_id,
                name=p.name,
                description=p.description,
                thumbnail_url=p.thumbnail_url,
                canvas_width=p.canvas_width,
                canvas_height=p.canvas_height,
                canvas_background=p.canvas_background,
                is_archived=p.is_archived,
                role="OWNER",
                created_at=p.created_at,
                updated_at=p.updated_at,
            )
        )

    for p, role in member_rows:
        if p.id not in seen_ids:
            seen_ids.add(p.id)
            items.append(
                ProjectResponse(
                    id=p.id,
                    user_id=p.user_id,
                    name=p.name,
                    description=p.description,
                    thumbnail_url=p.thumbnail_url,
                    canvas_width=p.canvas_width,
                    canvas_height=p.canvas_height,
                    canvas_background=p.canvas_background,
                    is_archived=p.is_archived,
                    role=role,
                    created_at=p.created_at,
                    updated_at=p.updated_at,
                )
            )

    items.sort(key=lambda x: x.updated_at, reverse=True)
    return items


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="VIEWER")
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=project.is_archived,
        role=role,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    req: ProjectUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Only EDITOR or OWNER can update project metadata
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="EDITOR")

    if req.name is not None:
        project.name = req.name.strip()
    if req.description is not None:
        project.description = req.description.strip()
    if req.canvas_background is not None:
        project.canvas_background = req.canvas_background
    if req.is_archived is not None:
        if role != "OWNER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"code": "OWNER_ONLY", "message": "Only the project owner can archive or unarchive."},
            )
        project.is_archived = req.is_archived

    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=project.is_archived,
        role=role,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Strictly OWNER only
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")
    await db.delete(project)
    await db.commit()
    return None


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")
    project.is_archived = True
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=True,
        role=role,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


@router.post("/{project_id}/restore", response_model=ProjectResponse)
async def restore_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")
    project.is_archived = False
    await db.commit()
    await db.refresh(project)
    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=False,
        role=role,
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


# -----------------------------------------------------------------------------
# Scene Document Operations
# -----------------------------------------------------------------------------

@router.get("/{project_id}/scene", response_model=SceneDocumentResponse)
async def get_project_scene(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_and_role(project_id, current_user.id, db, min_role="VIEWER")
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
    # Only EDITOR or OWNER can update scene document
    await get_project_and_role(project_id, current_user.id, db, min_role="EDITOR")
    result = await db.execute(select(SceneDocument).where(SceneDocument.project_id == project_id))
    scene = result.scalar_one_or_none()
    if not scene:
        raise HTTPException(status_code=404, detail={"code": "SCENE_NOT_FOUND", "message": "Scene document not found"})

    scene.version += 1
    if "canvas" in scene_data:
        scene.canvas_data = scene_data["canvas"]
    if "layers" in scene_data:
        scene.layers_data = scene_data["layers"]

    await db.commit()
    await db.refresh(scene)
    return scene


# -----------------------------------------------------------------------------
# Project Collaboration & Membership Endpoints
# -----------------------------------------------------------------------------

@router.get("/{project_id}/members", response_model=List[ProjectMemberResponse])
async def list_project_members(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_and_role(project_id, current_user.id, db, min_role="VIEWER")
    query = (
        select(ProjectMember, User.email, User.full_name)
        .join(User, ProjectMember.user_id == User.id)
        .where(ProjectMember.project_id == project_id)
        .order_by(ProjectMember.created_at.asc())
    )
    res = await db.execute(query)
    rows = res.all()

    return [
        ProjectMemberResponse(
            id=m.id,
            project_id=m.project_id,
            user_id=m.user_id,
            email=email,
            full_name=full_name,
            role=m.role,
            created_at=m.created_at,
        )
        for m, email, full_name in rows
    ]


@router.patch("/{project_id}/members/{user_id}", response_model=ProjectMemberResponse)
async def update_member_role(
    project_id: str,
    user_id: str,
    req: MemberRoleUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # OWNER only
    project, _ = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")

    if user_id == project.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_DEMOTE_OWNER", "message": "Cannot change the project owner's role directly. Use transfer-ownership."},
        )

    res = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    )
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail={"code": "MEMBER_NOT_FOUND", "message": "Member not found in project."})

    target_role = req.role.upper()
    if target_role not in ["EDITOR", "VIEWER"]:
        raise HTTPException(status_code=400, detail={"code": "INVALID_ROLE", "message": "Role must be EDITOR or VIEWER."})

    member.role = target_role
    await db.commit()
    await db.refresh(member)

    user_res = await db.execute(select(User).where(User.id == member.user_id))
    u = user_res.scalar_one()

    return ProjectMemberResponse(
        id=member.id,
        project_id=member.project_id,
        user_id=member.user_id,
        email=u.email,
        full_name=u.full_name,
        role=member.role,
        created_at=member.created_at,
    )


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_project_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, role = await get_project_and_role(project_id, current_user.id, db, min_role="VIEWER")

    # Either owner removes a member, or user removes themselves (leaves project)
    if role != "OWNER" and current_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "OWNER_ONLY", "message": "Only the project owner can remove other members."},
        )

    if user_id == project.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_REMOVE_OWNER", "message": "Project owner cannot leave their own project."},
        )

    res = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == user_id)
    )
    member = res.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=404, detail={"code": "MEMBER_NOT_FOUND", "message": "Member not found in project."})

    await db.delete(member)
    await db.commit()
    return None


@router.post("/{project_id}/transfer-ownership", response_model=ProjectResponse)
async def transfer_project_ownership(
    project_id: str,
    req: OwnershipTransferRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Strictly OWNER only
    project, _ = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")

    target_res = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == req.new_owner_user_id)
    )
    target_member = target_res.scalar_one_or_none()
    if not target_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TARGET_NOT_MEMBER", "message": "New owner must already be an active member of the project."},
        )

    # 1. Update project owner
    project.user_id = req.new_owner_user_id
    target_member.role = "OWNER"

    # 2. Demote previous owner to EDITOR in members list
    old_owner_res = await db.execute(
        select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == current_user.id)
    )
    old_owner_member = old_owner_res.scalar_one_or_none()
    if old_owner_member:
        old_owner_member.role = "EDITOR"

    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        user_id=project.user_id,
        name=project.name,
        description=project.description,
        thumbnail_url=project.thumbnail_url,
        canvas_width=project.canvas_width,
        canvas_height=project.canvas_height,
        canvas_background=project.canvas_background,
        is_archived=project.is_archived,
        role="EDITOR",
        created_at=project.created_at,
        updated_at=project.updated_at,
    )


# -----------------------------------------------------------------------------
# In-App Project Invitations
# -----------------------------------------------------------------------------

@router.post("/{project_id}/invitations", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_member_to_project(
    project_id: str,
    req: InvitationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, _ = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")

    invitee_email = req.get_email().strip().lower()
    if invitee_email == current_user.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "CANNOT_INVITE_SELF", "message": "You cannot invite yourself to your own project."},
        )

    # Check if target user exists in Reve
    user_res = await db.execute(select(User).where(User.email == invitee_email))
    target_user = user_res.scalar_one_or_none()
    if target_user:
        # Check if already a member
        mem_res = await db.execute(
            select(ProjectMember).where(ProjectMember.project_id == project_id, ProjectMember.user_id == target_user.id)
        )
        if mem_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={"code": "ALREADY_MEMBER", "message": f"{invitee_email} is already a member of this project."},
            )

    # Check if pending invitation exists
    inv_res = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.project_id == project_id,
            ProjectInvitation.invitee_email == invitee_email,
            ProjectInvitation.status == "PENDING",
        )
    )
    if inv_res.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "INVITATION_PENDING", "message": f"A pending invitation already exists for {invitee_email}."},
        )

    role = req.role.upper()
    if role not in ["EDITOR", "VIEWER"]:
        role = "EDITOR"

    inv = ProjectInvitation(
        project_id=project_id,
        inviter_id=current_user.id,
        invitee_email=invitee_email,
        role=role,
        status="PENDING",
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)

    return InvitationResponse(
        id=inv.id,
        project_id=inv.project_id,
        project_name=project.name,
        inviter_id=inv.inviter_id,
        inviter_email=current_user.email,
        invitee_email=inv.invitee_email,
        role=inv.role,
        status=inv.status,
        created_at=inv.created_at,
    )


@router.get("/{project_id}/invitations", response_model=List[InvitationResponse])
async def list_project_invitations(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project, _ = await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")
    query = (
        select(ProjectInvitation, User.email)
        .join(User, ProjectInvitation.inviter_id == User.id)
        .where(ProjectInvitation.project_id == project_id)
        .order_by(ProjectInvitation.created_at.desc())
    )
    res = await db.execute(query)
    rows = res.all()

    return [
        InvitationResponse(
            id=inv.id,
            project_id=inv.project_id,
            project_name=project.name,
            inviter_id=inv.inviter_id,
            inviter_email=inviter_email,
            invitee_email=inv.invitee_email,
            role=inv.role,
            status=inv.status,
            created_at=inv.created_at,
        )
        for inv, inviter_email in rows
    ]


@router.delete("/{project_id}/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitation(
    project_id: str,
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_project_and_role(project_id, current_user.id, db, min_role="OWNER")
    res = await db.execute(
        select(ProjectInvitation).where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.project_id == project_id,
        )
    )
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail={"code": "INVITATION_NOT_FOUND", "message": "Invitation not found."})

    inv.status = "REVOKED"
    await db.commit()
    return None
