from __future__ import annotations

"""
FastAPI dependencies for authentication and authorization.
Used via Depends() in route handlers.
"""

from functools import wraps
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.database import get_db
from core.security import decode_access_token
from models.uam import User


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """
    Extract and validate the access token from the httpOnly cookie.
    Returns the full User ORM object with roles/permissions eagerly loaded.
    Raises 401 if token is missing, invalid, or user not found.
    """

    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token. Please log in again.",
        )

    user_id_str = payload.get("sub")
    jti = payload.get("jti")
    if not user_id_str or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )

    user = (
        db.query(User)
        .filter(User.user_id == user_id_str, User.is_deleted == False)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or has been deleted.",
        )

    if user.active_token_id != jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been invalidated by a login from another device.",
        )

    if user.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is locked. Contact your administrator.",
        )

    if user.status == "inactive":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact your administrator.",
        )

    return user


# Type alias for cleaner route signatures
CurrentUser = Annotated[User, Depends(get_current_user)]


def require_permission(*required_codes: str):
    """
    Dependency factory that checks if the current user has ALL of the
    specified permission codes via their assigned roles.

    Usage:
        @router.get("/users", dependencies=[Depends(require_permission("uam.users.view"))])
    """

    def dependency(current_user: CurrentUser) -> User:
        # Collect all permission codes from the user's active roles
        user_permissions = set()
        for role in current_user.roles:
            if role.status == "active":
                for perm in role.permissions:
                    user_permissions.add(perm.code)

        # Check all required codes are present
        missing = set(required_codes) - user_permissions
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Missing: {', '.join(sorted(missing))}",
            )

        return current_user

    return Depends(dependency)


def require_any_permission(*required_codes: str):
    """
    Similar to require_permission but requires ANY ONE of the specified codes.

    Usage:
        @router.get("/audit", dependencies=[Depends(require_any_permission("uam.audit.view", "uam.audit.export"))])
    """

    def dependency(current_user: CurrentUser) -> User:
        user_permissions = set()
        for role in current_user.roles:
            if role.status == "active":
                for perm in role.permissions:
                    user_permissions.add(perm.code)

        if not user_permissions.intersection(set(required_codes)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions for this resource.",
            )

        return current_user

    return Depends(dependency)
