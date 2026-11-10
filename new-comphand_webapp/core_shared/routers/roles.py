from __future__ import annotations
"""
Role Management routes - CRUD, status toggle, export.
All endpoints require uam.roles.view or uam.roles.manage permissions.
"""
import csv
import io
import math

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import CurrentUser, require_permission
from models.uam import Role, Permission, UserRole, AuditLog
from schemas.uam import (
    RoleCreateRequest, RoleUpdateRequest, RoleStatusRequest,
    RoleOut, RoleListOut, PaginatedResponse,
)

router = APIRouter(prefix="/api/uam/roles", tags=["Role Management"])


def _log_audit(db, actor_id, action, request, target_type=None, target_id=None, detail=None):
    ip = request.client.host if request.client else "unknown"
    db.add(AuditLog(
        actor_id=actor_id, action=action, target_type=target_type,
        target_id=target_id, detail=detail, ip_address=ip,
    ))


@router.get("", response_model=PaginatedResponse,
            dependencies=[require_permission("uam.roles.view")])
def list_roles(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: str | None = Query(None, pattern="^(active|inactive)$"),
    db: Session = Depends(get_db),
):
    """List all roles with pagination."""
    query = db.query(Role)
    if status:
        query = query.filter(Role.status == status)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    roles = query.order_by(Role.name).offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=[RoleListOut.model_validate(r) for r in roles],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.post("", response_model=RoleOut,
             dependencies=[require_permission("uam.roles.manage")])
def create_role(body: RoleCreateRequest, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Create a new role with optional permission assignments."""
    existing = db.query(Role).filter(Role.name == body.name).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Role '{body.name}' already exists.")

    role = Role(
        name=body.name,
        description=body.description,
        created_by=current_user.user_id,
        updated_by=current_user.user_id,
    )
    db.add(role)
    db.flush()

    if body.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(body.permission_ids)).all()
        role.permissions = perms

    _log_audit(db, current_user.user_id, "CREATE_ROLE", request,
               target_type="ROLE", target_id=str(role.id),
               detail={"name": body.name})
    db.commit()
    db.refresh(role)
    return RoleOut.model_validate(role)


@router.get("/{role_uuid}", response_model=RoleOut,
            dependencies=[require_permission("uam.roles.view")])
def get_role(role_uuid: str, db: Session = Depends(get_db)):
    """Get role details including assigned permissions."""
    role = db.query(Role).filter(Role.id == role_uuid).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    return RoleOut.model_validate(role)


@router.put("/{role_uuid}", response_model=RoleOut,
            dependencies=[require_permission("uam.roles.manage")])
def update_role(role_uuid: str, body: RoleUpdateRequest, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Update role name, description, and/or permissions."""
    role = db.query(Role).filter(Role.id == role_uuid).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if body.name is not None:
        # Check for duplicate name
        dup = db.query(Role).filter(Role.name == body.name, Role.id != role.id).first()
        if dup:
            raise HTTPException(status_code=409, detail=f"Role name '{body.name}' is already taken.")
        role.name = body.name

    if body.description is not None:
        role.description = body.description

    if body.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(body.permission_ids)).all()
        role.permissions = perms

    role.updated_by = current_user.user_id

    _log_audit(db, current_user.user_id, "UPDATE_ROLE", request,
               target_type="ROLE", target_id=str(role.id))
    db.commit()
    db.refresh(role)
    return RoleOut.model_validate(role)


@router.delete("/{role_uuid}",
               dependencies=[require_permission("uam.roles.manage")])
def delete_role(role_uuid: str, request: Request,
                current_user: CurrentUser, db: Session = Depends(get_db)):
    """Delete a role. Blocked if any users are still assigned."""
    role = db.query(Role).filter(Role.id == role_uuid).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    # Check for assigned users
    assigned_count = db.query(UserRole).filter(UserRole.role_id == role.id).count()
    if assigned_count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete role '{role.name}': {assigned_count} user(s) still assigned. "
                   "Remove all user assignments first.",
        )

    _log_audit(db, current_user.user_id, "DELETE_ROLE", request,
               target_type="ROLE", target_id=str(role.id),
               detail={"name": role.name})
    db.delete(role)
    db.commit()
    return {"message": f"Role '{role.name}' has been deleted."}


@router.patch("/{role_uuid}/status",
              dependencies=[require_permission("uam.roles.manage")])
def update_role_status(role_uuid: str, body: RoleStatusRequest, request: Request,
                       current_user: CurrentUser, db: Session = Depends(get_db)):
    """Toggle role status (active/inactive)."""
    role = db.query(Role).filter(Role.id == role_uuid).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")

    if role.name.lower() == "super_admin" and body.status == "inactive":
        raise HTTPException(status_code=403, detail="Cannot deactivate the super_admin role.")

    old_status = role.status
    role.status = body.status
    role.updated_by = current_user.user_id

    _log_audit(db, current_user.user_id, "UPDATE_ROLE_STATUS", request,
               target_type="ROLE", target_id=str(role.id),
               detail={"old_status": old_status, "new_status": body.status})
    db.commit()
    return {"message": f"Role status changed from '{old_status}' to '{body.status}'."}


@router.get("/export",
            dependencies=[require_permission("uam.roles.view")])
def export_roles(db: Session = Depends(get_db)):
    """Export all roles with their permissions as CSV."""
    roles = db.query(Role).order_by(Role.name).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["role_name", "description", "status", "permissions", "created_at"])

    for role in roles:
        perm_codes = ", ".join(p.code for p in role.permissions)
        writer.writerow([role.name, role.description or "", role.status, perm_codes,
                         role.created_at.isoformat()])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=roles_export.csv"},
    )