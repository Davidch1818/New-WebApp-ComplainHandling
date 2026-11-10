from __future__ import annotations

"""
Audit routes - access matrix report and audit log.
"""

import csv
import io
import math
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import require_permission, require_any_permission
from models.uam import User, AuditLog
from schemas.uam import AuditLogOut, AccessMatrixRow, PaginatedResponse

router = APIRouter(prefix="/api/uam/audit", tags=["Audit & Compliance"])


@router.get("/access-matrix", response_model=list[AccessMatrixRow],
            dependencies=[require_any_permission("uam.audit.view", "uam.audit.export")])
def get_access_matrix(db: Session = Depends(get_db)):
    """
    Generate the Current Access Matrix Report.
    Lists all Users -> their Roles -> corresponding Permissions.
    Required by IT Security audit (User ID/Role/Function).
    """
    users = (
        db.query(User)
        .filter(User.is_deleted == False)
        .order_by(User.user_id)
        .all()
    )

    result = []
    for user in users:
        role_names = []
        all_permissions = set()
        for role in user.roles:
            if role.status == "active":
                role_names.append(role.name)
                for perm in role.permissions:
                    all_permissions.add(perm.code)

        result.append(AccessMatrixRow(
            user_id=user.user_id,
            full_name=user.full_name,
            status=user.status,
            roles=sorted(role_names),
            permissions=sorted(all_permissions),
        ))

    return result


@router.get("/access-matrix/export",
            dependencies=[require_permission("uam.audit.export")])
def export_access_matrix(db: Session = Depends(get_db)):
    """Export the access matrix as CSV."""
    users = (
        db.query(User)
        .filter(User.is_deleted == False)
        .order_by(User.user_id)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["user_id", "full_name", "status", "roles", "permissions"])

    for user in users:
        role_names = []
        all_permissions = set()
        for role in user.roles:
            if role.status == "active":
                role_names.append(role.name)
                for perm in role.permissions:
                    all_permissions.add(perm.code)

        writer.writerow([
            user.user_id,
            user.full_name,
            user.status,
            ", ".join(sorted(role_names)),
            ", ".join(sorted(all_permissions)),
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=access_matrix.csv"},
    )


@router.get("/log", response_model=PaginatedResponse,
            dependencies=[require_permission("uam.audit.view")])
def get_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    actor_id: str | None = Query(None),
    action: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    """Query audit log with optional filters."""
    query = db.query(AuditLog)

    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from.replace(hour=0, minute=0, second=0, microsecond=0))
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to.replace(hour=23, minute=59, second=59, microsecond=999999))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    logs = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        items=[AuditLogOut.model_validate(log) for log in logs],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )
