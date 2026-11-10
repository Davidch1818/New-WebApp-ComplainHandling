from __future__ import annotations
"""
JWT token management and password hashing utilities.
Access tokens: 15 min TTL, stored in httpOnly cookie.
Refresh tokens: 8 hours TTL, stored in httpOnly cookie.
Single active session enforced via active_token_id in users table.
"""

import os
import uuid
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
import bcrypt
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "CHANGE-ME-IN-PRODUCTION-use-a-64-char-random-string")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_HOURS = int(os.getenv("REFRESH_TOKEN_EXPIRE_HOURS", "8"))


def hash_password(plain_password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode('utf-8'), salt).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# --- JWT Token Creation ---
def create_access_token(data: dict) -> str:
    """Create a short-lived access token (15 min default)."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(data: dict) -> tuple[str, str]:
    """
    Create a long-lived refresh token (8 hours default).
    Returns (token_string, jti) where jti is the unique token ID
    used for single-session enforcement and revocation.
    """
    jti = str(uuid.uuid4())
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=REFRESH_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "type": "refresh", "jti": jti})
    token = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return token, jti


# --- JWT Token Validation ---
def decode_token(token: str) -> dict | None:
    """
    Decode and validate a JWT token.
    Returns the payload dict on success, None on any failure.
    Never raises - caller checks for None.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


def decode_access_token(token: str) -> dict | None:
    """Decode an access token. Returns None if invalid or wrong type."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        return None
    return payload


def decode_refresh_token(token: str) -> dict | None:
    """Decode a refresh token. Returns None if invalid or wrong type."""
    payload = decode_token(token)
    if payload is None or payload.get("type") != "refresh":
        return None
    return payload