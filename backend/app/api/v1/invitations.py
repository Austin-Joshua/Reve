from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Project, ProjectMember, ProjectInvitation
from app.schemas.project import InvitationResponse

router = APIRouter(prefix="/invitations", tags=["invitations"])


@router.get("", response_model=List[InvitationResponse])
async def list_received_invitations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all pending project invitations addressed to the current user's email."""
    query = (
        select(ProjectInvitation, Project.name, User.email)
        .join(Project, ProjectInvitation.project_id == Project.id)
        .join(User, ProjectInvitation.inviter_id == User.id)
        .where(
            ProjectInvitation.invitee_email == current_user.email.lower(),
            ProjectInvitation.status == "PENDING",
        )
        .order_by(ProjectInvitation.created_at.desc())
    )
    res = await db.execute(query)
    rows = res.all()

    return [
        InvitationResponse(
            id=inv.id,
            project_id=inv.project_id,
            project_name=proj_name,
            inviter_id=inv.inviter_id,
            inviter_email=inviter_email,
            invitee_email=inv.invitee_email,
            role=inv.role,
            status=inv.status,
            created_at=inv.created_at,
        )
        for inv, proj_name, inviter_email in rows
    ]


@router.post("/{invitation_id}/accept", response_model=InvitationResponse)
async def accept_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ProjectInvitation, Project.name, User.email)
        .join(Project, ProjectInvitation.project_id == Project.id)
        .join(User, ProjectInvitation.inviter_id == User.id)
        .where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.invitee_email == current_user.email.lower(),
        )
    )
    res = await db.execute(query)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INVITATION_NOT_FOUND", "message": "Invitation not found or not addressed to you."},
        )

    inv, proj_name, inviter_email = row

    if inv.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVITATION_ALREADY_RESOLVED", "message": f"Invitation is already {inv.status}."},
        )

    # 1. Update status
    inv.status = "ACCEPTED"

    # 2. Add or update project membership
    existing_mem = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == inv.project_id,
            ProjectMember.user_id == current_user.id,
        )
    )
    if not existing_mem.scalar_one_or_none():
        new_member = ProjectMember(
            project_id=inv.project_id,
            user_id=current_user.id,
            role=inv.role,
        )
        db.add(new_member)

    await db.commit()
    await db.refresh(inv)

    return InvitationResponse(
        id=inv.id,
        project_id=inv.project_id,
        project_name=proj_name,
        inviter_id=inv.inviter_id,
        inviter_email=inviter_email,
        invitee_email=inv.invitee_email,
        role=inv.role,
        status=inv.status,
        created_at=inv.created_at,
    )


@router.post("/{invitation_id}/reject", response_model=InvitationResponse)
async def reject_invitation(
    invitation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(ProjectInvitation, Project.name, User.email)
        .join(Project, ProjectInvitation.project_id == Project.id)
        .join(User, ProjectInvitation.inviter_id == User.id)
        .where(
            ProjectInvitation.id == invitation_id,
            ProjectInvitation.invitee_email == current_user.email.lower(),
        )
    )
    res = await db.execute(query)
    row = res.first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "INVITATION_NOT_FOUND", "message": "Invitation not found or not addressed to you."},
        )

    inv, proj_name, inviter_email = row

    if inv.status != "PENDING":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVITATION_ALREADY_RESOLVED", "message": f"Invitation is already {inv.status}."},
        )

    inv.status = "REJECTED"
    await db.commit()
    await db.refresh(inv)

    return InvitationResponse(
        id=inv.id,
        project_id=inv.project_id,
        project_name=proj_name,
        inviter_id=inv.inviter_id,
        inviter_email=inviter_email,
        invitee_email=inv.invitee_email,
        role=inv.role,
        status=inv.status,
        created_at=inv.created_at,
    )
