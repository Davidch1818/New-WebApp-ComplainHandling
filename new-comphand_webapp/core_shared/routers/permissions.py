from __future__ import annotations
"""
Permission routes — list all available permissions (menu registry).
Read-only endpoint, no mutations.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.database import get_db
from core.dependencies import require_permission
from models.uam import Permission
from schemas.uam import PermissionOut

router = APIRouter(prefix="/api/uam/permissions", tags=["Permissions"])


@router.get("", response_model=list[PermissionOut],
             dependencies=[require_permission("uam.roles.view")])
def list_permissions(db: Session = Depends(get_db)):
    """List all available permissions grouped by category."""
    perms = db.query(Permission).order_by(Permission.category, Permission.code).all()
    return [PermissionOut.model_validate(p) for p in perms]
