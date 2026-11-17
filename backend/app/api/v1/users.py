from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, case
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User, Generation, GeneratedImage, Project, Conversation, Asset, UsageRecord
from app.schemas.user import UserProfileUpdateRequest, UserAnalyticsResponse, GenerationSummaryItem
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me/analytics", response_model=UserAnalyticsResponse)
async def get_user_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Computes exact personal workspace statistics from real database records.
    Never returns hardcoded counters.
    """
    user_id = current_user.id

    # 1. Total, successful, failed, cancelled generations
    gen_stats_query = select(
        func.count(Generation.id).label("total"),
        func.sum(case((Generation.status == "COMPLETED", 1), else_=0)).label("successful"),
        func.sum(case((Generation.status == "FAILED", 1), else_=0)).label("failed"),
        func.sum(case((Generation.status == "CANCELLED", 1), else_=0)).label("cancelled"),
    ).where(Generation.user_id == user_id)

    gen_res = await db.execute(gen_stats_query)
    gen_row = gen_res.first()

    total_gen = gen_row.total or 0
    successful_gen = gen_row.successful or 0
    failed_gen = gen_row.failed or 0
    cancelled_gen = gen_row.cancelled or 0

    # 2. Total credits consumed (from UsageRecord, fallback to successful_gen)
    usage_query = select(func.sum(UsageRecord.credits_consumed)).where(UsageRecord.user_id == user_id)
    usage_res = await db.execute(usage_query)
    total_credits = usage_res.scalar() or successful_gen

    # 3. Total projects
    proj_query = select(func.count(Project.id)).where(Project.user_id == user_id, Project.is_archived == False)
    proj_res = await db.execute(proj_query)
    total_projects = proj_res.scalar() or 0

    # 4. Total conversations
    conv_query = select(func.count(Conversation.id)).where(Conversation.user_id == user_id)
    conv_res = await db.execute(conv_query)
    total_conversations = conv_res.scalar() or 0

    # 5. Total uploaded assets
    asset_query = select(func.count(Asset.id)).where(Asset.user_id == user_id)
    asset_res = await db.execute(asset_query)
    total_assets = asset_res.scalar() or 0

    # 6. Recent activity (up to 10 latest generations with thumbnails)
    recent_query = (
        select(Generation)
        .options(selectinload(Generation.images))
        .where(Generation.user_id == user_id)
        .order_by(Generation.created_at.desc())
        .limit(10)
    )
    recent_res = await db.execute(recent_query)
    recent_gens = recent_res.scalars().all()

    recent_items: List[GenerationSummaryItem] = []
    for g in recent_gens:
        thumb = g.images[0].thumbnail_url if g.images else None
        recent_items.append(
            GenerationSummaryItem(
                id=g.id,
                prompt=g.prompt,
                status=g.status,
                created_at=g.created_at,
                thumbnail_url=thumb,
            )
        )

    return UserAnalyticsResponse(
        user_id=current_user.id,
        email=current_user.email,
        plan_tier=current_user.plan_tier,
        credits_remaining=current_user.credits_remaining,
        total_generations=total_gen,
        successful_generations=successful_gen,
        failed_generations=failed_gen,
        cancelled_generations=cancelled_gen,
        total_credits_consumed=total_credits,
        total_projects=total_projects,
        total_conversations=total_conversations,
        total_assets=total_assets,
        recent_activity=recent_items,
    )


@router.patch("/me", response_model=UserResponse)
async def update_user_profile(
    req: UserProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.full_name is not None:
        current_user.full_name = req.full_name.strip()
    if req.avatar_url is not None:
        current_user.avatar_url = req.avatar_url.strip()

    await db.commit()
    await db.refresh(current_user)
    return current_user
