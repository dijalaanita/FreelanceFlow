from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, echo=settings.debug, future=True)

# Review finding #1: the original starter yielded a raw asyncpg.Connection
# from get_session(), but every endpoint called session.exec()/.add()/.get(),
# which only exist on AsyncSession. Fixed here.
async_session_maker = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


async def init_models() -> None:
    """Create tables from SQLModel metadata. Useful for local/dev/sqlite.
    In production, use `alembic upgrade head` instead."""
    from sqlmodel import SQLModel

    import app.models  # noqa: F401  (ensures models are registered)

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
