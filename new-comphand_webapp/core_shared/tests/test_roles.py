from __future__ import annotations
import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock
from models.uam import Role

def test_list_roles(client, mock_db_session):
    # Setup mock return value for the query
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    # query.count()
    mock_query.count.return_value = 1
    
    # query.order_by().offset().limit().all()
    mock_role = Role(
        id=uuid.uuid4(),
        name="Test_Role",
        description="A test role",
        status="active",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    mock_query.order_by.return_value.offset.return_value.limit.return_value.all.return_value = [mock_role]
    
    response = client.get("/api/uam/roles?page=1&page_size=10")
    
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "Test_Role"

def test_create_role_success(client, mock_db_session):
    # Setup mock to simulate that the role does not already exist
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    mock_query.filter.return_value.first.return_value = None
    
    payload = {
        "name": "Operator_1",
        "description": "Operator Level 1",
        "permission_ids": []
    }
    
    response = client.post("/api/uam/roles", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Operator_1"
    assert data["description"] == "Operator Level 1"
    
    # Verify DB add and commit were called
    mock_db_session.add.assert_called()
    mock_db_session.commit.assert_called()

def test_create_role_invalid_name(client, mock_db_session):
    # Test our regex validation constraint (no spaces allowed)
    payload = {
        "name": "Invalid Role Name",
        "description": "This should fail validation"
    }
    
    response = client.post("/api/uam/roles", json=payload)
    
    # FastAPI/Pydantic returns 422 Unprocessable Entity on validation failure
    assert response.status_code == 422
    data = response.json()
    assert any("pattern" in str(err) for err in data["detail"])
    
    # Verify DB was NOT called
    mock_db_session.add.assert_not_called()

def test_update_role_success(client, mock_db_session):
    # Setup mock for existing role
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_role = Role(id=existing_id, name="Old_Name", description="Old desc", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc), status="active")
    
    # For updating, we do two queries: one for finding the role, one for finding duplicates
    # We can use side_effect to return different values
    mock_query.filter.return_value.first.side_effect = [existing_role, None]
    
    payload = {
        "name": "New_Name",
        "description": "New desc"
    }
    
    response = client.put(f"/api/uam/roles/{existing_id}", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New_Name"
    assert data["description"] == "New desc"
    mock_db_session.commit.assert_called()

def test_update_role_status(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_role = Role(id=existing_id, name="Status_Role", status="active", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    mock_query.filter.return_value.first.return_value = existing_role
    
    payload = {
        "status": "inactive"
    }
    
    response = client.patch(f"/api/uam/roles/{existing_id}/status", json=payload)
    
    assert response.status_code == 200
    assert response.json() == {"message": "Role status changed from 'active' to 'inactive'."}
    assert existing_role.status == "inactive"
    mock_db_session.commit.assert_called()

def test_delete_role_success(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_role = Role(id=existing_id, name="Delete_Me", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    mock_query.filter.return_value.first.return_value = existing_role
    
    # Second query is checking for UserRole assignments. Return count = 0
    mock_query.filter.return_value.count.return_value = 0
    
    response = client.delete(f"/api/uam/roles/{existing_id}")
    
    assert response.status_code == 200
    mock_db_session.delete.assert_called_once_with(existing_role)
    mock_db_session.commit.assert_called()

def test_delete_role_prevented_when_users_assigned(client, mock_db_session):
    mock_query = MagicMock()
    mock_db_session.query.return_value = mock_query
    
    existing_id = uuid.uuid4()
    existing_role = Role(id=existing_id, name="Cannot_Delete", created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
    mock_query.filter.return_value.first.return_value = existing_role
    
    # Simulate that 2 users are assigned to this role
    mock_query.filter.return_value.count.return_value = 2
    
    response = client.delete(f"/api/uam/roles/{existing_id}")
    
    assert response.status_code == 409
    assert "user(s) still assigned" in response.json()["detail"]
    mock_db_session.delete.assert_not_called()
