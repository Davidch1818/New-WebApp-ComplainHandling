from __future__ import annotations
import pytest
import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import MagicMock

from models.uam import User, PasswordHistory
from core.security import hash_password

def test_login_success(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    # Mock user exists
    pwd_hash = hash_password("Valid@1234")
    existing_user = User(
        id=uuid.uuid4(),
        user_id="john_doe",
        full_name="John Doe",
        status="active",
        is_deleted=False,
        password_hash=pwd_hash,
        failed_attempts=2, # Will be reset to 0
        must_change_pwd=False
    )
    mock_query.filter.return_value.first.return_value = existing_user
    
    response = client.post("/api/auth/login", json={
        "user_id": "john_doe",
        "password": "Valid@1234"
    })
    
    assert response.status_code == 200
    assert existing_user.failed_attempts == 0
    assert "access_token" in response.cookies
    
    # Audit log should be written
    mock_db_session.add.assert_called()
    mock_db_session.commit.assert_called()

def test_login_invalid_credentials(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    pwd_hash = hash_password("Valid@1234")
    existing_user = User(
        id=uuid.uuid4(),
        user_id="john_doe",
        full_name="John Doe",
        status="active",
        is_deleted=False,
        password_hash=pwd_hash,
        failed_attempts=0
    )
    mock_query.filter.return_value.first.return_value = existing_user
    
    response = client.post("/api/auth/login", json={
        "user_id": "john_doe",
        "password": "WrongPassword123!"
    })
    
    assert response.status_code == 401
    assert existing_user.failed_attempts == 1
    mock_db_session.commit.assert_called()

def test_login_account_lockout(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    pwd_hash = hash_password("Valid@1234")
    existing_user = User(
        id=uuid.uuid4(),
        user_id="john_doe",
        full_name="John Doe",
        status="active",
        is_deleted=False,
        password_hash=pwd_hash,
        failed_attempts=2 # One more failure triggers lockout
    )
    mock_query.filter.return_value.first.return_value = existing_user
    
    response = client.post("/api/auth/login", json={
        "user_id": "john_doe",
        "password": "WrongPassword123!"
    })
    
    assert response.status_code == 401
    assert existing_user.failed_attempts == 3
    assert existing_user.status == "locked"
    assert existing_user.locked_at is not None

def test_login_inactive_user(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_user = User(
        id=uuid.uuid4(),
        user_id="john_doe",
        full_name="John Doe",
        status="inactive",
        is_deleted=False
    )
    mock_query.filter.return_value.first.return_value = existing_user
    
    response = client.post("/api/auth/login", json={
        "user_id": "john_doe",
        "password": "Valid@1234" # Doesn't matter if valid
    })
    
    assert response.status_code == 403
    assert "inactive" in response.json()["detail"]

def test_change_password_success(client, mock_db_session, mock_user):
    # mock_user is provided by conftest override for get_current_user
    mock_user.password_hash = hash_password("Old@Password123")
    mock_user.must_change_pwd = False
    mock_user.pwd_changed_at = datetime.now(timezone.utc) - timedelta(days=2) # Allowed min age
    
    # Mock history query
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    
    response = client.post("/api/auth/change-password", json={
        "old_password": "Old@Password123",
        "new_password": "New@Password456",
        "confirm_password": "New@Password456"
    })
    
    assert response.status_code == 200
    assert mock_user.must_change_pwd is False
    mock_db_session.commit.assert_called()

def test_change_password_history_violation(client, mock_db_session, mock_user):
    mock_user.password_hash = hash_password("Old@Password123")
    mock_user.must_change_pwd = False
    mock_user.pwd_changed_at = datetime.now(timezone.utc) - timedelta(days=2)
    
    # Mock history query to return the new password hash
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    history_entry = PasswordHistory(pwd_hash=hash_password("New@Password456"))
    mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = [history_entry]
    
    response = client.post("/api/auth/change-password", json={
        "old_password": "Old@Password123",
        "new_password": "New@Password456",
        "confirm_password": "New@Password456"
    })
    
    assert response.status_code == 400
    assert "reuse" in response.json()["detail"]

def test_change_password_minimum_age_violation(client, mock_db_session, mock_user):
    mock_user.password_hash = hash_password("Old@Password123")
    mock_user.must_change_pwd = False
    # Changed 1 hour ago
    mock_user.pwd_changed_at = datetime.now(timezone.utc) - timedelta(hours=1)
    
    response = client.post("/api/auth/change-password", json={
        "old_password": "Old@Password123",
        "new_password": "New@Password456",
        "confirm_password": "New@Password456"
    })
    
    assert response.status_code == 400
    assert "too recently" in response.json()["detail"]

def test_change_password_complexity_violation(client, mock_db_session, mock_user):
    mock_user.password_hash = hash_password("Old@Password123")
    mock_user.must_change_pwd = False
    mock_user.pwd_changed_at = datetime.now(timezone.utc) - timedelta(days=2)
    
    response = client.post("/api/auth/change-password", json={
        "old_password": "Old@Password123",
        "new_password": "password123", # Fails complexity
        "confirm_password": "password123"
    })
    
    assert response.status_code == 400
    assert "errors" in response.json()["detail"]

def test_force_change_password_flow(client, mock_db_session, mock_user):
    # During force change, the user must be able to change it even if pwd_changed_at is recent
    mock_user.password_hash = hash_password("Old@Password123")
    mock_user.must_change_pwd = True
    mock_user.pwd_changed_at = datetime.now(timezone.utc) - timedelta(hours=1) # Recent
    
    # Mock history empty
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
    
    response = client.post("/api/auth/change-password", json={
        "old_password": "Old@Password123",
        "new_password": "New@Password456",
        "confirm_password": "New@Password456"
    })
    
    # Should bypass minimum age and succeed
    assert response.status_code == 200
    assert mock_user.must_change_pwd is False
    mock_db_session.commit.assert_called()
