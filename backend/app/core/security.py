import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    to_encode = data.copy()
    expires_at = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expires_at, "type": token_type, "jti": str(uuid.uuid4())})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str) -> str:
    return _create_token(
        {"sub": user_id},
        timedelta(minutes=settings.access_token_expire_minutes),
        "access",
    )


def create_refresh_token(user_id: str) -> tuple[str, str, datetime]:
    """Returns (token, token_hash, expires_at). Only the hash is persisted —
    review finding #4/#High: refresh tokens should never be stored in
    plaintext, so a leaked DB doesn't hand out live sessions."""
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    token = _create_token({"sub": user_id}, expires_delta, "refresh")
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + expires_delta
    return token, token_hash, expires_at


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
            options={"verify_signature": True, "verify_exp": True, "verify_aud": False},
        )
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
