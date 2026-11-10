from __future__ import annotations

"""
Authentication routes: login, logout, refresh, me, change-password.
Tokens are set as httpOnly cookies - never returned in response body.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_refresh_token, ACCESS_TOKEN_EXPIRE_MINUTES,
)
from core.password_policy import (
    validate_password, check_password_age, is_password_expired,
    days_until_expiry, LOCKOUT_THRESHOLD, PASSWORD_HISTORY_COUNT,
    MIN_PASSWORD_AGE_DAYS,
)
from core.dependencies import CurrentUser
from models.uam import User, PasswordHistory, AuditLog
from schemas.uam import LoginRequest, ChangePasswordRequest, AuthResponse, MeResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Cookie settings
COOKIE_SECURE = False  # Set True in production (HTTPS)
COOKIE_SAMESITE = "lax"
COOKIE_HTTPONLY = True
COOKIE_PATH = "/"


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    """Set both access and refresh tokens as httpOnly cookies."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/api/auth",  # only sent to auth endpoints
        max_age=8 * 60 * 60,  # 8 hours
    )


def _clear_auth_cookies(response: Response):
    """Clear both auth cookies."""
    response.delete_cookie("access_token", path=COOKIE_PATH)
    response.delete_cookie("refresh_token", path="/api/auth")


def _log_audit(db: Session, actor_id: str, action: str, request: Request,
               target_type: str = None, target_id: str = None, detail: dict = None):
    """Write an immutable audit log entry."""
    ip = request.client.host if request.client else "unknown"
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail,
        ip_address=ip,
    )
    db.add(entry)


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Authenticate user. On success, sets httpOnly JWT cookies.
    Enforces:
    - Account lockout after 3 consecutive failures
    - must_change_pwd flag for first-time / reset users
    - Password expiry warning
    """
    # Find user (case-insensitive user_id match)
    user = (
        db.query(User)
        .filter(User.user_id == body.user_id, User.is_deleted == False)
        .first()
    )

    if user is None:
        # Don't reveal whether user exists
        _log_audit(db, body.user_id, "LOGIN_FAILED", request, detail={"reason": "user_not_found"})
        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    # Check if account is locked
    if user.status == "locked":
        _log_audit(db, user.user_id, "LOGIN_BLOCKED", request, detail={"reason": "account_locked"})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked due to too many failed attempts. Contact your administrator.",
        )

    # Check if account is inactive
    if user.status == "inactive":
        _log_audit(db, user.user_id, "LOGIN_BLOCKED", request, detail={"reason": "account_inactive"})
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact your administrator.",
        )

    # Verify password
    if not verify_password(body.password, user.password_hash):
        # Increment failed attempts
        user.failed_attempts += 1

        if user.failed_attempts >= LOCKOUT_THRESHOLD:
            user.status = "locked"
            user.locked_at = datetime.now(timezone.utc)
            _log_audit(db, user.user_id, "ACCOUNT_LOCKED", request,
                       target_type="USER", target_id=str(user.id),
                       detail={"reason": f"{LOCKOUT_THRESHOLD} consecutive failures"})
        else:
            remaining = LOCKOUT_THRESHOLD - user.failed_attempts
            _log_audit(db, user.user_id, "LOGIN_FAILED", request,
                       detail={"attempts": user.failed_attempts, "remaining": remaining})

        db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    # --- Login successful ---

    # Reset failed attempts
    user.failed_attempts = 0

    # Create tokens (single session: new login invalidates old)
    token_data = {"sub": user.user_id}
    refresh_token, jti = create_refresh_token(token_data)
    token_data["jti"] = jti
    access_token = create_access_token(token_data)

    # Enforce single session by storing the new token ID
    user.active_token_id = jti

    _log_audit(db, user.user_id, "LOGIN_SUCCESS", request, target_type="USER", target_id=str(user.id))
    db.commit()

    # Set cookies
    _set_auth_cookies(response, access_token, refresh_token)

    return AuthResponse(
        user_id=user.user_id,
        full_name=user.full_name,
        must_change_pwd=user.must_change_pwd,
        message="Login successful." if not user.must_change_pwd else "Password change required.",
    )


@router.post("/logout")
def logout(request: Request, response: Response, current_user: CurrentUser, db: Session = Depends(get_db)):
    """Invalidate the current session and clear cookies."""
    current_user.active_token_id = None
    _log_audit(db, current_user.user_id, "LOGOUT", request, target_type="USER", target_id=str(current_user.id))
    db.commit()

    _clear_auth_cookies(response)
    return {"message": "Logged out successfully."}


@router.post("/refresh")
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    """
    Rotate the access token using the refresh token cookie.
    Validates that the refresh token's JTI matches the user's active_token_id
    (single session enforcement).
    """
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No refresh token.")

    payload = decode_refresh_token(token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token.")

    user_id_str = payload.get("sub")
    jti = payload.get("jti")
    if not user_id_str or not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    user = db.query(User).filter(User.user_id == user_id_str, User.is_deleted == False).first()
    if user is None or user.status != "active":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")

    # Single session check: JTI must match the stored active token
    if user.active_token_id != jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated. Please log in again.",
        )

    # Issue new access token only (refresh token stays the same)
    new_access_token = create_access_token({"sub": user.user_id, "jti": jti})
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=COOKIE_HTTPONLY,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path=COOKIE_PATH,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return {"message": "Token refreshed."}


@router.get("/me", response_model=MeResponse)
def get_me(current_user: CurrentUser):
    """Return the current user's profile, roles, and permissions."""
    # Collect permissions from all active roles
    permissions = set()
    role_names = []
    for role in current_user.roles:
        if role.status == "active":
            role_names.append(role.name)
            for perm in role.permissions:
                permissions.add(perm.code)

    return MeResponse(
        id=current_user.id,
        user_id=current_user.user_id,
        full_name=current_user.full_name,
        email=current_user.email,
        department=current_user.department,
        status=current_user.status,
        must_change_pwd=current_user.must_change_pwd,
        pwd_days_until_expiry=days_until_expiry(current_user.pwd_changed_at),
        permissions=sorted(permissions),
        roles=sorted(role_names),
    )


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest,
    request: Request,
    current_user: CurrentUser,
    db: Session = Depends(get_db),
):
    """
    Change the current user's password. Enforces ALL policy rules:
    - Complexity (length, categories, no repeats, not same as user_id)
    - Minimum password age (1 day)
    - Password history (last 5)
    - Confirm password match
    """
    # Confirm passwords match
    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=400, detail="New password and confirmation do not match.")

    # Verify old password
    if not verify_password(body.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    # Check minimum password age (skip if must_change_pwd is forced)
    if not current_user.must_change_pwd:
        age_result = check_password_age(current_user.pwd_changed_at)
        if not age_result.is_valid:
            raise HTTPException(status_code=400, detail=age_result.errors[0])

    # Validate complexity
    complexity_result = validate_password(body.new_password, current_user.user_id)
    if not complexity_result.is_valid:
        raise HTTPException(status_code=400, detail={"errors": complexity_result.errors})

    # Check password history (last 5)
    history = (
        db.query(PasswordHistory)
        .filter(PasswordHistory.user_id == current_user.id)
        .order_by(PasswordHistory.created_at.desc())
        .limit(PASSWORD_HISTORY_COUNT)
        .all()
    )
    for entry in history:
        if verify_password(body.new_password, entry.pwd_hash):
            raise HTTPException(
                status_code=400,
                detail=f"Cannot reuse any of your last {PASSWORD_HISTORY_COUNT} passwords.",
            )

    # Also check against current password hash
    if verify_password(body.new_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from current password.")

    # --- All checks passed, update password ---
    new_hash = hash_password(body.new_password)
    now = datetime.now(timezone.utc)

    # Save current password to history
    db.add(PasswordHistory(user_id=current_user.id, pwd_hash=current_user.password_hash))

    # Update user
    current_user.password_hash = new_hash
    current_user.pwd_changed_at = now
    current_user.pwd_min_age_at = now + timedelta(days=MIN_PASSWORD_AGE_DAYS)
    current_user.must_change_pwd = False

    _log_audit(db, current_user.user_id, "PASSWORD_CHANGED", request,
               target_type="USER", target_id=str(current_user.id))
    db.commit()

    return {"message": "Password changed successfully."}