from __future__ import annotations
import pytest
from datetime import datetime, timedelta, timezone
from core.password_policy import (
    validate_password, check_password_age, is_password_expired, days_until_expiry
)

def test_validate_password_success():
    result = validate_password("Admin@1234", "john_doe")
    assert result.is_valid is True
    assert len(result.errors) == 0

def test_validate_password_length():
    result = validate_password("Short1!", "john_doe")
    assert result.is_valid is False
    assert any("at least 8 characters" in err for err in result.errors)

def test_validate_password_not_user_id():
    result = validate_password("John_Doe", "john_doe")
    assert result.is_valid is False
    assert any("not be the same as the User ID" in err for err in result.errors)

def test_validate_password_consecutive_chars():
    result = validate_password("Aaa@1234", "john_doe")
    assert result.is_valid is False
    assert any("consecutive identical characters" in err for err in result.errors)

def test_validate_password_categories():
    result = validate_password("alllowercase123", "john_doe")
    assert result.is_valid is False
    assert any("categories" in err for err in result.errors)

def test_check_password_age_too_recent():
    now = datetime.now(timezone.utc)
    # Changed 1 hour ago (less than 1 day)
    recent = now - timedelta(hours=1)
    result = check_password_age(recent)
    assert result.is_valid is False
    assert any("too recently" in err for err in result.errors)

def test_check_password_age_allowed():
    now = datetime.now(timezone.utc)
    # Changed 2 days ago
    allowed = now - timedelta(days=2)
    result = check_password_age(allowed)
    assert result.is_valid is True

def test_is_password_expired():
    now = datetime.now(timezone.utc)
    expired = now - timedelta(days=91)
    assert is_password_expired(expired) is True
    assert is_password_expired(None) is True
    
    valid = now - timedelta(days=30)
    assert is_password_expired(valid) is False

def test_days_until_expiry():
    now = datetime.now(timezone.utc)
    # Changed 30 days ago, should expire in 60 days
    changed_at = now - timedelta(days=30)
    days = days_until_expiry(changed_at)
    assert days == 60
