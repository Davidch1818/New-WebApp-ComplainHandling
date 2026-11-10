from __future__ import annotations
import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

import sys
import os

# Put core_shared on PYTHONPATH directly
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from core.database import get_db
from core.dependencies import get_current_user
from models.uam import User, Role, Permission

@pytest.fixture
def mock_db_session():
    """Returns a MagicMock for the SQLAlchemy Session."""
    session = MagicMock()
    
    def side_effect_refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = uuid.uuid4()
        if not getattr(obj, "created_at", None):
            obj.created_at = datetime.now(timezone.utc)
        if not getattr(obj, "updated_at", None):
            obj.updated_at = datetime.now(timezone.utc)
        if isinstance(obj, Role) and not getattr(obj, "status", None):
            obj.status = "active"
        if isinstance(obj, User):
            if not getattr(obj, "status", None):
                obj.status = "active"
            if not getattr(obj, "failed_attempts", None):
                obj.failed_attempts = 0
            if getattr(obj, "is_deleted", None) is None:
                obj.is_deleted = False
            if getattr(obj, "must_change_pwd", None) is None:
                obj.must_change_pwd = False
                
    session.refresh.side_effect = side_effect_refresh
    return session

@pytest.fixture
def mock_user():
    """Returns a mock User with full permissions."""
    user = User(
        id=uuid.uuid4(),
        user_id="test_admin",
        full_name="Test Admin",
        status="active",
        is_deleted=False
    )
    mock_role = MagicMock()
    mock_role.status = "active"
    
    codes = [
        "uam.roles.view", "uam.roles.manage",
        "uam.users.view", "uam.users.manage",
        "uam.audit.view", "uam.audit.export"
    ]
    mock_role.permissions = [MagicMock(code=code) for code in codes]
    
    user.roles = [mock_role]
    return user

@pytest.fixture
def client(mock_db_session, mock_user):
    """Returns a TestClient with dependencies overridden."""
    def override_get_db():
        yield mock_db_session
        
    def override_get_current_user():
        return mock_user
        
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as c:
        yield c
        
    app.dependency_overrides.clear()
