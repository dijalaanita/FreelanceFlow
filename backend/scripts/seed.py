"""Seed content_statuses and subscription_tiers.

Run with: python -m scripts.seed
"""
import asyncio

from sqlmodel import select

from app.core.database import async_session_maker, init_models
from app.models import ALL_STATUSES, ContentStatus, SubscriptionTier


async def seed() -> None:
    await init_models()
    async with async_session_maker() as session:
        for name in ALL_STATUSES:
            result = await session.exec(select(ContentStatus).where(ContentStatus.name == name))
            if not result.first():
                session.add(ContentStatus(name=name))

        tiers = [
            {"name": "Free", "max_clients": 1, "custom_branding_enabled": False, "csv_export_enabled": False},
            {"name": "Pro", "max_clients": 999, "custom_branding_enabled": True, "csv_export_enabled": True},
        ]
        for tier in tiers:
            result = await session.exec(select(SubscriptionTier).where(SubscriptionTier.name == tier["name"]))
            if not result.first():
                session.add(SubscriptionTier(**tier))

        await session.commit()
    print("Seed complete: content statuses + subscription tiers.")


if __name__ == "__main__":
    asyncio.run(seed())
