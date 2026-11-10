from __future__ import annotations
import pytest
import uuid
from unittest.mock import MagicMock
from datetime import datetime, timezone

from models.uam import User, Role

def test_list_users(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    mock_query.filter.return_value = mock_query # filter(User.is_deleted == False)
    mock_query.count.return_value = 1
    
    mock_user = User(
        id=uuid.uuid4(),
        user_id="test_user",
        full_name="Test User",
        email="test@example.com",
        status="active",
        must_change_pwd=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_user]
    
    response = client.get("/api/uam/users?page=1&page_size=10")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["user_id"] == "test_user"

def test_create_user_success(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    # Simulate user doesn't exist
    mock_query.filter.return_value.first.return_value = None
    
    payload = {
        "user_id": "new_user",
        "full_name": "New User",
        "email": "new@example.com",
        "department": "IT",
        "temporary_password": "Valid@Password123", # valid complex password
        "force_change_pwd": True,
        "role_ids": []
    }
    
    response = client.post("/api/uam/users", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "new_user"
    assert data["full_name"] == "New User"
    assert data["must_change_pwd"] is True
    
    mock_db_session.add.assert_called()
    mock_db_session.commit.assert_called()

def test_create_user_invalid_userid(client, mock_db_session):
    payload = {
        "user_id": "invalid user id", # Space not allowed
        "full_name": "Invalid",
        "temporary_password": "Valid@Password123"
    }
    
    response = client.post("/api/uam/users", json=payload)
    
    # Should fail pydantic schema validation
    assert response.status_code == 422
    data = response.json()
    assert any("pattern" in str(err) for err in data["detail"])
    mock_db_session.add.assert_not_called()

def test_create_user_invalid_password(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value.first.return_value = None
    
    payload = {
        "user_id": "valid_user",
        "full_name": "Valid User",
        "temporary_password": "password123", # Too simple
        "role_ids": []
    }
    
    response = client.post("/api/uam/users", json=payload)
    
    # Should fail business logic validation (400)
    assert response.status_code == 400
    data = response.json()
    assert "errors" in data["detail"]
    mock_db_session.add.assert_not_called()

def test_update_user_success(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_user = User(id=existing_id, user_id="old_user", full_name="Old Name", status="active", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    mock_query.filter.return_value.first.return_value = existing_user
    
    payload = {
        "full_name": "New Name",
        "department": "HR"
    }
    
    response = client.put(f"/api/uam/users/{existing_id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "New Name"
    assert data["department"] == "HR"
    mock_db_session.commit.assert_called()

def test_reset_password_success(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_user = User(
        id=existing_id, 
        user_id="target_user", 
        password_hash="old_hash",
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_query.filter.return_value.first.return_value = existing_user
    
    payload = {
        "new_password": "Valid@NewPassword123",
        "force_change_pwd": True
    }
    
    response = client.post(f"/api/uam/users/{existing_id}/reset-password", json=payload)
    
    assert response.status_code == 200
    assert "Password reset" in response.json()["message"]
    
    assert existing_user.must_change_pwd is True
    # PasswordHistory should be added
    mock_db_session.add.assert_called()
    mock_db_session.commit.assert_called()

def test_update_user_status(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_user = User(id=existing_id, user_id="status_user", status="locked", failed_attempts=3, created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    mock_query.filter.return_value.first.return_value = existing_user
    
    payload = {
        "status": "active"
    }
    
    response = client.patch(f"/api/uam/users/{existing_id}/status", json=payload)
    
    assert response.status_code == 200
    assert existing_user.status == "active"
    assert existing_user.failed_attempts == 0 # Unlocking resets attempts
    mock_db_session.commit.assert_called()
