from __future__ import annotations
"""
SQLAlchemy ORM models for the UAM schema.
All tables live in PostgreSQL schema 'uam' within database 'bmas_web_db'.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Index
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from core.database import Base


def utcnow():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = {"schema": "uam"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255))
    full_name = Column(String(255), nullable=False)
    department = Column(String(100))
    password_hash = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="active") # active | inactive | locked
    must_change_pwd = Column(Boolean, nullable=False, default=True)
    pwd_changed_at = Column(DateTime(timezone=True))
    pwd_min_age_at = Column(DateTime(timezone=True))
    failed_attempts = Column(Integer, nullable=False, default=0)
    locked_at = Column(DateTime(timezone=True))
    active_token_id = Column(String(36)) # JTI of current refresh token (single session)
    is_deleted = Column(Boolean, nullable=False, default=False)
    deleted_at = Column(DateTime(timezone=True))
    created_by = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_by = Column(String(50))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    # Relationships
    roles = relationship("Role", secondary="uam.user_roles", back_populates="users", lazy="joined")
    password_history = relationship("PasswordHistory", back_populates="user", order_by="PasswordHistory.created_at.desc()")


class PasswordHistory(Base):
    __tablename__ = "password_history"
    __table_args__ = {"schema": "uam"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("uam.users.id"), nullable=False, index=True)
    pwd_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    user = relationship("User", back_populates="password_history")


class Role(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "uam"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255))
    status = Column(String(20), nullable=False, default="active") # active | inactive
    created_by = Column(String(50))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
    updated_by = Column(String(50))
    updated_at = Column(DateTime(timezone=True), nullable=False, default=utcnow, onupdate=utcnow)

    # Relationships
    users = relationship("User", secondary="uam.user_roles", back_populates="roles")
    permissions = relationship("Permission", secondary="uam.role_permissions", back_populates="roles", lazy="joined")


class Permission(Base):
    __tablename__ = "permissions"
    __table_args__ = {"schema": "uam"}

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    category = Column(String(100))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)

    roles = relationship("Role", secondary="uam.role_permissions", back_populates="permissions")


class RolePermission(Base):
    __tablename__ = "role_permissions"
    __table_args__ = {"schema": "uam"}

    role_id = Column(UUID(as_uuid=True), ForeignKey("uam.roles.id", ondelete="CASCADE"), primary_key=True)
    permission_id = Column(UUID(as_uuid=True), ForeignKey("uam.permissions.id", ondelete="CASCADE"), primary_key=True)


class UserRole(Base):
    __tablename__ = "user_roles"
    __table_args__ = {"schema": "uam"}

    user_id = Column(UUID(as_uuid=True), ForeignKey("uam.users.id", ondelete="CASCADE"), primary_key=True)
    role_id = Column(UUID(as_uuid=True), ForeignKey("uam.roles.id", ondelete="CASCADE"), primary_key=True)


class AuditLog(Base):
    __tablename__ = "audit_log"
    __table_args__ = (
        Index("idx_audit_log_actor", "actor_id"),
        Index("idx_audit_log_created", "created_at"),
        {"schema": "uam"},
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    actor_id = Column(String(50), nullable=False)
    action = Column(String(50), nullable=False)
    target_type = Column(String(50))
    target_id = Column(String(50))
    detail = Column(JSONB)
    ip_address = Column(String(45))
    created_at = Column(DateTime(timezone=True), nullable=False, default=utcnow)
