from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Conversation, ConversationMessage, Project
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationUpdateRequest,
    ConversationResponse,
    ConversationDetailResponse,
    MessageCreateRequest,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    req: ConversationCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.project_id:
        proj_res = await db.execute(
            select(Project).where(Project.id == req.project_id, Project.user_id == current_user.id)
        )
        if not proj_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found or access denied."},
            )

    conv = Conversation(
        user_id=current_user.id,
        project_id=req.project_id,
        title=req.title or "New Conversation",
        is_archived=False,
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        project_id=conv.project_id,
        title=conv.title,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=0,
        latest_message=None,
    )


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    project_id: Optional[str] = None,
    include_archived: bool = Query(False, description="Include archived conversations"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.user_id == current_user.id)
    )

    if not include_archived:
        query = query.where(Conversation.is_archived == False)

    if project_id:
        query = query.where(Conversation.project_id == project_id)

    query = query.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)
    res = await db.execute(query)
    conversations = res.scalars().all()

    items = []
    for c in conversations:
        latest = c.messages[-1].content if c.messages else None
        items.append(
            ConversationResponse(
                id=c.id,
                user_id=c.user_id,
                project_id=c.project_id,
                title=c.title,
                is_archived=c.is_archived,
                created_at=c.created_at,
                updated_at=c.updated_at,
                message_count=len(c.messages),
                latest_message=latest,
            )
        )
    return items


@router.get("/{conversation_id}", response_model=ConversationDetailResponse)
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
        )

    return ConversationDetailResponse(
        id=conv.id,
        user_id=conv.user_id,
        project_id=conv.project_id,
        title=conv.title,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=[
            MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                content=m.content,
                generation_id=m.generation_id,
                metadata_json=m.metadata_json or {},
                created_at=m.created_at,
            )
            for m in conv.messages
        ],
    )


@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: str,
    req: ConversationUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
        )

    if req.title is not None:
        conv.title = req.title.strip()
    if req.is_archived is not None:
        conv.is_archived = req.is_archived
    if req.project_id is not None:
        if req.project_id == "":
            conv.project_id = None
        else:
            proj_res = await db.execute(
                select(Project).where(Project.id == req.project_id, Project.user_id == current_user.id)
            )
            if not proj_res.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail={"code": "PROJECT_NOT_FOUND", "message": "Project not found or access denied."},
                )
            conv.project_id = req.project_id

    await db.commit()
    await db.refresh(conv)

    return ConversationResponse(
        id=conv.id,
        user_id=conv.user_id,
        project_id=conv.project_id,
        title=conv.title,
        is_archived=conv.is_archived,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=len(conv.messages),
        latest_message=conv.messages[-1].content if conv.messages else None,
    )


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
        )

    await db.delete(conv)
    await db.commit()
    return None


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def add_message_to_conversation(
    conversation_id: str,
    req: MessageCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Conversation).where(Conversation.id == conversation_id, Conversation.user_id == current_user.id)
    )
    conv = res.scalar_one_or_none()
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "CONVERSATION_NOT_FOUND", "message": "Conversation not found or access denied."},
        )

    msg = ConversationMessage(
        conversation_id=conv.id,
        role=req.role,
        content=req.content.strip(),
        generation_id=req.generation_id,
        metadata_json=req.metadata_json or {},
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg
