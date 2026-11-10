from __future__ import annotations
"""
User Management routes - CRUD, bulk upload, export.
All endpoints require uam.users.view or uam.users.manage permissions.
"""

import csv
import io
import math
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_

from core.database import get_db
from core.security import hash_password
from core.password_policy import validate_password
from core.dependencies import CurrentUser, require_permission
from models.uam import User, UserRole, Role, PasswordHistory, AuditLog
from schemas.uam import (
    UserCreateRequest, UserUpdateRequest, UserStatusRequest,
    ResetPasswordRequest, UserOut, UserListOut, PaginatedResponse,
)

router = APIRouter(prefix="/api/uam/users", tags=["User Management"])

SOFT_DELETE_COOLDOWN_DAYS = 90


def _log_audit(db, actor_id, action, request, target_type=None, target_id=None, detail=None):
    ip = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        actor_id=actor_id, action=action, target_type=target_type,
        target_id=target_id, detail=detail, ip_address=ip,
    ))


def _check_admin_role_access(current_user: User, target_user: User):
    is_current_admin = any(r.name.lower() == "admin" for r in current_user.roles)
    is_target_admin = any(r.name.lower() == "admin" for r in target_user.roles)
    if is_current_admin and is_target_admin and current_user.id != target_user.id:
        raise HTTPException(status_code=403, detail="Cannot modify or view another admin user.")


@router.get("", response_model=PaginatedResponse,
            dependencies=[require_permission("uam.users.view")])
def list_users(
    current_user: CurrentUser,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, pattern="^(active|inactive|locked)$"),
    search: str | None = Query(None, max_length=100),
    db: Session = Depends(get_db),
):
    """List users with pagination, optional status filter and search."""
    query = db.query(User).filter(User.is_deleted == False)

    if current_user.user_id != "admin":
        query = query.filter(User.user_id != "admin")

    is_current_user_admin_role = any(r.name.lower() == "admin" for r in current_user.roles)
    if is_current_user_admin_role:
        query = query.filter(
            or_(
                User.id == current_user.id,
                ~User.roles.any(Role.name.ilike("admin"))
            )
        )

    if status:
        query = query.filter(User.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(User.user_id.ilike(pattern), User.full_name.ilike(pattern), User.email.ilike(pattern))
        )

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[UserListOut.model_validate(u) for u in users],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.post("", response_model=UserOut,
             dependencies=[require_permission("uam.users.manage")])
def create_user(body: UserCreateRequest, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Create a new user with must_change_pwd=True."""
    # Check if user_id already exists (including soft-deleted within cooldown)
    existing = db.query(User).filter(User.user_id == body.user_id).first()
    if existing:
        if existing.is_deleted:
            # Check cooldown
            if existing.deleted_at:
                cooldown_end = existing.deleted_at + timedelta(days=SOFT_DELETE_COOLDOWN_DAYS)
                if datetime.now(timezone.utc) < cooldown_end:
                    days_left = (cooldown_end - datetime.now(timezone.utc)).days
                    raise HTTPException(
                        status_code=409,
                        detail=f"User ID '{body.user_id}' was recently deleted. "
                               f"It can be reused after {days_left} days.",
                    )
            # Cooldown passed - allow reuse by hard-deleting the old record
            db.delete(existing)
            db.flush()
        else:
            raise HTTPException(status_code=409, detail=f"User ID '{body.user_id}' already exists.")

    # Validate temporary password complexity
    result = validate_password(body.temporary_password, body.user_id)
    if not result.is_valid:
        raise HTTPException(status_code=400, detail={"errors": result.errors})

    user = User(
        user_id=body.user_id,
        full_name=body.full_name,
        email=body.email,
        department=body.department,
        password_hash=hash_password(body.temporary_password),
        must_change_pwd=body.force_change_pwd,
        created_by=current_user.user_id,
        updated_by=current_user.user_id,
    )
    db.add(user)
    db.flush()  # get user.id

    # Assign roles
    if body.role_ids:
        roles = db.query(Role).filter(Role.id.in_(body.role_ids)).all()
        if body.user_id != "admin" and any(r.name.lower() == "super_admin" for r in roles):
            raise HTTPException(status_code=403, detail="The super_admin role can only be assigned to the admin user.")
        user.roles = roles

    _log_audit(db, current_user.user_id, "CREATE_USER", request,
               target_type="USER", target_id=str(user.id),
               detail={"user_id": body.user_id})
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/{user_uuid}", response_model=UserOut,
            dependencies=[require_permission("uam.users.view")])
def get_user(user_uuid: str, current_user: CurrentUser, db: Session = Depends(get_db)):
    """Get user details including assigned roles."""
    user = db.query(User).filter(User.id == user_uuid, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.user_id == "admin" and current_user.user_id != "admin":
        raise HTTPException(status_code=403, detail="Access denied.")

    _check_admin_role_access(current_user, user)

    return UserOut.model_validate(user)


@router.put("/{user_uuid}", response_model=UserOut,
            dependencies=[require_permission("uam.users.manage")])
def update_user(user_uuid: str, body: UserUpdateRequest, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Update user profile and/or role assignments."""
    user = db.query(User).filter(User.id == user_uuid, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.user_id == "admin" and current_user.user_id != "admin":
        raise HTTPException(status_code=403, detail="Cannot edit the admin user.")

    _check_admin_role_access(current_user, user)

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.email is not None:
        user.email = body.email
    if body.department is not None:
        user.department = body.department
    if body.role_ids is not None:
        roles = db.query(Role).filter(Role.id.in_(body.role_ids)).all()
        if user.user_id != "admin" and any(r.name.lower() == "super_admin" for r in roles):
            raise HTTPException(status_code=403, detail="The super_admin role can only be assigned to the admin user.")
        user.roles = roles

    user.updated_by = current_user.user_id

    _log_audit(db, current_user.user_id, "UPDATE_USER", request,
               target_type="USER", target_id=str(user.id))
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/{user_uuid}",
               dependencies=[require_permission("uam.users.manage")])
def delete_user(user_uuid: str, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Soft-delete a user. The user_id is reusable after 90 days."""
    user = db.query(User).filter(User.id == user_uuid, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.user_id == "admin" and current_user.user_id != "admin":
        raise HTTPException(status_code=403, detail="Cannot delete the admin user.")

    _check_admin_role_access(current_user, user)

    if user.user_id == current_user.user_id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")

    user.is_deleted = True
    user.deleted_at = datetime.now(timezone.utc)
    user.status = "inactive"
    user.active_token_id = None  # invalidate session

    _log_audit(db, current_user.user_id, "DELETE_USER", request,
               target_type="USER", target_id=str(user.id),
               detail={"user_id": user.user_id})
    db.commit()
    return {"message": f"User '{user.user_id}' has been deleted."}


@router.patch("/{user_uuid}/status",
              dependencies=[require_permission("uam.users.manage")])
def update_user_status(user_uuid: str, body: UserStatusRequest, request: Request,
                       current_user: CurrentUser, db: Session = Depends(get_db)):
    """Toggle user status (active/inactive). Unlocking resets failed_attempts."""
    user = db.query(User).filter(User.id == user_uuid, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.user_id == "admin" and current_user.user_id != "admin":
        raise HTTPException(status_code=403, detail="Cannot change status of the admin user.")

    _check_admin_role_access(current_user, user)

    is_super_admin = any(r.name.lower() == "super_admin" for r in user.roles)
    if is_super_admin and body.status == "inactive":
        raise HTTPException(status_code=403, detail="Cannot deactivate a user with the super_admin role.")

    old_status = user.status
    user.status = body.status
    user.updated_by = current_user.user_id

    # If reactivating a locked account, reset failed attempts
    if old_status == "locked" and body.status == "active":
        user.failed_attempts = 0
        user.locked_at = None

    _log_audit(db, current_user.user_id, "UPDATE_USER_STATUS", request,
               target_type="USER", target_id=str(user.id),
               detail={"old_status": old_status, "new_status": body.status})
    db.commit()
    return {"message": f"User status changed from '{old_status}' to '{body.status}'."}


@router.post("/{user_uuid}/reset-password",
             dependencies=[require_permission("uam.users.manage")])
def reset_password(user_uuid: str, body: ResetPasswordRequest, request: Request,
                   current_user: CurrentUser, db: Session = Depends(get_db)):
    """Admin resets a user's password. Sets must_change_pwd=True."""
    user = db.query(User).filter(User.id == user_uuid, User.is_deleted == False).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.user_id == "admin" and current_user.user_id != "admin":
        raise HTTPException(status_code=403, detail="Cannot reset password of the admin user.")

    _check_admin_role_access(current_user, user)

    # Validate new password complexity
    result = validate_password(body.new_password, user.user_id)
    if not result.is_valid:
        raise HTTPException(status_code=400, detail={"errors": result.errors})

    # Save current password to history
    db.add(PasswordHistory(user_id=user.id, pwd_hash=user.password_hash))

    user.password_hash = hash_password(body.new_password)
    user.must_change_pwd = body.force_change_pwd
    user.pwd_changed_at = datetime.now(timezone.utc)
    user.failed_attempts = 0
    if user.status == "locked":
        user.status = "active"
        user.locked_at = None
    user.active_token_id = None  # force re-login
    user.updated_by = current_user.user_id

    _log_audit(db, current_user.user_id, "RESET_PASSWORD", request,
               target_type="USER", target_id=str(user.id))
    db.commit()
    return {"message": f"Password reset for user '{user.user_id}'. They must change it on next login."}


@router.post("/bulk",
             dependencies=[require_permission("uam.users.manage")])
def bulk_create_users(request: Request,
                      current_user: CurrentUser,
                      file: UploadFile = File(...),
                      db: Session = Depends(get_db)):
    """
    Bulk create/update users via CSV upload.
    CSV columns: user_id, full_name, email, department, temporary_password
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a CSV.")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    errors = []

    for i, row in enumerate(reader, start=2):  # row 1 is header
        user_id = row.get("user_id", "").strip()
        if not user_id:
            errors.append(f"Row {i}: missing user_id")
            continue

        existing = db.query(User).filter(User.user_id == user_id, User.is_deleted == False).first()
        if existing:
            errors.append(f"Row {i}: user_id '{user_id}' already exists, skipped.")
            continue

        temp_pwd = row.get("temporary_password", "").strip()
        pwd_result = validate_password(temp_pwd, user_id) if temp_pwd else None
        if not temp_pwd or (pwd_result and not pwd_result.is_valid):
            err_msgs = pwd_result.errors if pwd_result else ["missing password"]
            errors.append(f"Row {i}: {'; '.join(err_msgs)}")
            continue

        user = User(
            user_id=user_id,
            full_name=row.get("full_name", "").strip() or user_id,
            email=row.get("email", "").strip() or None,
            department=row.get("department", "").strip() or None,
            password_hash=hash_password(temp_pwd),
            must_change_pwd=True,
            created_by=current_user.user_id,
            updated_by=current_user.user_id,
        )
        db.add(user)
        created += 1

    if created > 0:
        _log_audit(db, current_user.user_id, "BULK_CREATE_USERS", request,
                   detail={"created": created, "errors": len(errors)})
        db.commit()

    return {"message": f"Bulk upload complete. Created: {created}, Errors: {len(errors)}", "errors": errors}


@router.get("/export",
            dependencies=[require_permission("uam.users.view")])
def export_users(current_user: CurrentUser, db: Session = Depends(get_db)):
    """Export all active users as CSV."""
    query = db.query(User).filter(User.is_deleted == False)
    if current_user.user_id != "admin":
        query = query.filter(User.user_id != "admin")

    is_current_user_admin_role = any(r.name.lower() == "admin" for r in current_user.roles)
    if is_current_user_admin_role:
        query = query.filter(
            or_(
                User.id == current_user.id,
                ~User.roles.any(Role.name.ilike("admin"))
            )
        )

    users = query.order_by(User.user_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["user_id", "full_name", "email", "department", "status",
                     "must_change_pwd", "created_at", "roles"])

    for user in users:
        role_names = ", ".join(r.name for r in user.roles if r.status == "active")
        writer.writerow([
            user.user_id, user.full_name, user.email or "", user.department or "",
            user.status, user.must_change_pwd, user.created_at.isoformat(), role_names,
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=users_export.csv"},
    )
