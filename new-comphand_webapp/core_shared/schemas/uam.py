from __future__ import annotations
"""
Pydantic v2 request/response models for all UAM API endpoints.
These models control serialization - passwords are NEVER included in responses.
"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


# ==============================================================================
# Auth Schemas
# ==============================================================================

class LoginRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=50, examples=["admin"])
    password: str = Field(..., min_length=1, examples=["Admin@1234"])


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class AuthResponse(BaseModel):
    """Returned after successful login."""
    user_id: str
    full_name: str
    must_change_pwd: bool
    message: str


class MeResponse(BaseModel):
    """Returned by GET /api/auth/me - current user profile + permissions."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    full_name: str
    email: str | None
    department: str | None
    status: str
    must_change_pwd: bool
    pwd_days_until_expiry: int | None = None
    permissions: list[str] = [] # list of permission codes
    roles: list[str] = []       # list of role names


# ==============================================================================
# Permission Schemas
# ==============================================================================

class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    name: str
    category: str | None


# ==============================================================================
# Role Schemas
# ==============================================================================

class RoleCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, pattern="^[a-zA-Z0-9_.-]+$")
    description: str | None = Field(None, max_length=255)
    permission_ids: list[UUID] = []


class RoleUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100, pattern="^[a-zA-Z0-9_.-]+$")
    description: str | None = Field(None, max_length=255)
    permission_ids: list[UUID] | None = None


class RoleStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    status: str
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    permissions: list[PermissionOut] = []


class RoleListOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    status: str
    created_at: datetime


# ==============================================================================
# User Schemas
# ==============================================================================

class UserCreateRequest(BaseModel):
    user_id: str = Field(..., min_length=1, max_length=50, pattern="^[a-zA-Z0-9_.-]+$")
    full_name: str = Field(..., min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=100)
    temporary_password: str = Field(..., min_length=8)
    role_ids: list[UUID] = []
    force_change_pwd: bool = True


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=255)
    email: str | None = Field(None, max_length=255)
    department: str | None = Field(None, max_length=100)
    role_ids: list[UUID] | None = None


class UserStatusRequest(BaseModel):
    status: str = Field(..., pattern="^(active|inactive)$")


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)
    force_change_pwd: bool = True


class UserOut(BaseModel):
    """Full user detail (for admin view)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    full_name: str
    email: str | None
    department: str | None
    status: str
    must_change_pwd: bool
    pwd_changed_at: datetime | None
    failed_attempts: int
    locked_at: datetime | None
    is_deleted: bool
    created_by: str | None
    created_at: datetime
    updated_at: datetime
    roles: list[RoleListOut] = []


class UserListOut(BaseModel):
    """Compact user for list views."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: str
    full_name: str
    email: str | None
    department: str | None
    status: str
    must_change_pwd: bool
    created_at: datetime
    roles: list[RoleListOut] = []


# ==============================================================================
# Audit Schemas
# ==============================================================================

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    actor_id: str
    action: str
    target_type: str | None
    target_id: str | None
    detail: dict | None
    ip_address: str | None
    created_at: datetime


class AccessMatrixRow(BaseModel):
    user_id: str
    full_name: str
    status: str
    roles: list[str]
    permissions: list[str]


# ==============================================================================
# Pagination
# ==============================================================================

class PaginatedResponse(BaseModel):
    items: list = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0
