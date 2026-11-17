#!/usr/bin/env python3
"""
Reve Platform - Database Seed Utility
Seeds initial model providers and a demo user into the active database.
"""
import asyncio
import sys
from pathlib import Path

# Add backend and ai-engine to sys.path
backend_path = str(Path(__file__).resolve().parents[1] / "backend")
if backend_path not in sys.path:
    sys.path.append(backend_path)

ai_engine_path = str(Path(__file__).resolve().parents[1] / "ai-engine")
if ai_engine_path not in sys.path:
    sys.path.append(ai_engine_path)

from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password
from app.models.entities import User, ModelProvider
from ai_engine.model_registry.models import MODEL_CATALOG


async def seed():
    print("Connecting to database...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # 1. Seed demo user
        result = await session.execute(select(User).where(User.email == "demo@reve.ai"))
        if not result.scalar_one_or_none():
            demo_user = User(
                email="demo@reve.ai",
                hashed_password=hash_password("DemoPassword123!"),
                full_name="Demo Creator",
                plan_tier="pro",
                credits_remaining=500,
                is_active=True,
                is_verified=True,
            )
            session.add(demo_user)
            print("Created demo user: demo@reve.ai (Password: DemoPassword123!)")

        # 2. Seed model providers
        for model_id, model in MODEL_CATALOG.items():
            result = await session.execute(select(ModelProvider).where(ModelProvider.name == model_id))
            if not result.scalar_one_or_none():
                provider_record = ModelProvider(
                    name=model_id,
                    is_active=True,
                    priority=1,
                    supported_models=[model.id],
                )
                session.add(provider_record)
                print(f"Registered model catalog entry: {model_id}")

        await session.commit()
    print("Database seeding completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
