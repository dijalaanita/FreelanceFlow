from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models import RefreshToken, SubscriptionTier, User
from app.schemas import AccessTokenOut, RefreshRequest, TokenPair, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])

FREE_TIER_NAME = "Free"


@router.post("/register", response_model=UserOut)
async def register(user_in: UserCreate, session: AsyncSession = Depends(get_session)):
    existing = await session.exec(select(User).where(User.email == user_in.email))
    if existing.first():
        raise HTTPException(status_code=409, detail="Email already registered")

    tier_result = await session.exec(
        select(SubscriptionTier).where(SubscriptionTier.name == FREE_TIER_NAME)
    )
    free_tier = tier_result.first()
    if not free_tier:
        raise HTTPException(
            status_code=500,
            detail="Subscription tiers are not seeded. Run scripts/seed.py.",
        )

    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        password_hash=hash_password(user_in.password),
        subscription_tier_id=free_tier.id,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


async def _issue_tokens(user: User, session: AsyncSession) -> TokenPair:
    access_token = create_access_token(str(user.id))
    refresh_token, token_hash, expires_at = create_refresh_token(str(user.id))
    session.add(RefreshToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await session.commit()
    return TokenPair(access_token=access_token, refresh_token=refresh_token)


@router.post("/login", response_model=TokenPair)
async def login(credentials: UserLogin, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(User).where(User.email == credentials.email))
    user = result.first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return await _issue_tokens(user, session)


@router.post("/refresh", response_model=AccessTokenOut)
async def refresh(payload: RefreshRequest, session: AsyncSession = Depends(get_session)):
    from app.core.security import decode_token

    try:
        claims = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token") from exc

    if claims.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type")

    token_hash = hash_token(payload.refresh_token)
    result = await session.exec(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.first()
    if not stored or stored.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Refresh token revoked or unknown")
    if stored.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="Refresh token expired")

    return AccessTokenOut(access_token=create_access_token(claims["sub"]))


@router.get("/me", response_model=UserOut)
async def read_current_user(user: User = Depends(get_current_user)):
    return user
