import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import decode_token
from app.models import Client, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await session.get(User, uuid.UUID(user_id))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_owned_client(
    client_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Client:
    """Review finding #High: ownership was only checked on one endpoint.
    Every client-scoped route now depends on this instead."""
    client = await session.get(Client, client_id)
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your client")
    return client


async def get_status_id(session: AsyncSession, name: str) -> int:
    from app.models import ContentStatus

    result = await session.exec(select(ContentStatus).where(ContentStatus.name == name))
    status_row = result.first()
    if not status_row:
        raise HTTPException(
            status_code=500,
            detail=f"Content status '{name}' is not seeded. Run scripts/seed.py.",
        )
    return status_row.id


def require_status(name: str):
    async def _dep(session: AsyncSession = Depends(get_session)) -> int:
        return await get_status_id(session, name)

    return _dep
