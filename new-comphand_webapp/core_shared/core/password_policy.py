from __future__ import annotations
"""
Password policy enforcement per security-requirements.md.

Rules:
1. Minimum 8 characters
2. Not identical to user_id (case-insensitive)
3. No 3+ consecutive identical characters (e.g., 'aaa', '111')
4. Must contain chars from >= 3 of 4 categories:
   - English uppercase (A-Z)
   - English lowercase (a-z)
   - Digits (0-9)
   - Special characters (*, /, @, #, %, &, etc.)
5. Not in last 5 password history (checked externally)
6. Minimum password age: 1 day since last change
7. Maximum password age: 90 days
"""
import re
import math
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass


# --- Configuration Constants ---
MIN_PASSWORD_LENGTH = 8
MAX_CONSECUTIVE_REPEAT = 3  # 3+ identical chars in a row is rejected
MIN_CATEGORY_COUNT = 3      # must have chars from at least 3 of 4 categories
PASSWORD_HISTORY_COUNT = 5   # remember last 5 passwords
MIN_PASSWORD_AGE_DAYS = 1    # cannot change within 1 day
MAX_PASSWORD_AGE_DAYS = 90   # must change after 90 days
LOCKOUT_THRESHOLD = 3        # lock after 3 consecutive failed attempts


@dataclass
class PolicyResult:
    """Result of a password policy check."""
    is_valid: bool
    errors: list[str]


def validate_password(password: str, user_id: str) -> PolicyResult:
    """
    Validate a password against all complexity rules.
    Does NOT check history or age — those require DB access and are
    checked separately in the auth router.

    Returns a PolicyResult with is_valid=True if all rules pass,
    or is_valid=False with a list of specific error messages.
    """
    errors = []

    # Rule 1: Minimum length
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long.")

    # Rule 2: Not identical to user_id (case-insensitive)
    if password.lower() == user_id.lower():
        errors.append("Password must not be the same as the User ID.")

    # Rule 3: No long consecutive repeating characters
    consecutive_pattern = re.compile(r"(.)\1{" + str(MAX_CONSECUTIVE_REPEAT - 1) + r",}", re.IGNORECASE)
    if consecutive_pattern.search(password):
        errors.append(
            f"Password must not contain {MAX_CONSECUTIVE_REPEAT} or more consecutive identical characters."
        )

    # Rule 4: Character category diversity (at least 3 of 4)
    categories_met = 0
    if re.search(r"[A-Z]", password):
        categories_met += 1
    if re.search(r"[a-z]", password):
        categories_met += 1
    if re.search(r"[0-9]", password):
        categories_met += 1
    if re.search(r"[^A-Za-z0-9]", password):  # special characters
        categories_met += 1

    if categories_met < MIN_CATEGORY_COUNT:
        errors.append(
            f"Password must contain characters from at least {MIN_CATEGORY_COUNT} of these categories: "
            "uppercase (A-Z), lowercase (a-z), digits (0-9), special characters."
        )

    return PolicyResult(is_valid=len(errors) == 0, errors=errors)


def check_password_age(pwd_changed_at: datetime | None) -> PolicyResult:
    """
    Check minimum password age (1 day).
    Returns error if the user changed their password less than 1 day ago.
    """
    if pwd_changed_at is None:
        # Never changed — no minimum age restriction
        return PolicyResult(is_valid=True, errors=[])

    # Ensure timezone-aware comparison
    now = datetime.now(timezone.utc)
    if pwd_changed_at.tzinfo is None:
        pwd_changed_at = pwd_changed_at.replace(tzinfo=timezone.utc)

    min_age_deadline = pwd_changed_at + timedelta(days=MIN_PASSWORD_AGE_DAYS)
    if now < min_age_deadline:
        hours_remaining = int((min_age_deadline - now).total_seconds() / 3600)
        errors = [
            f"Password was changed too recently. "
            f"You must wait at least {MIN_PASSWORD_AGE_DAYS} day(s) before changing again. "
            f"(~{hours_remaining} hours remaining)"
        ]
        return PolicyResult(is_valid=False, errors=errors)

    return PolicyResult(is_valid=True, errors=[])


def is_password_expired(pwd_changed_at: datetime | None) -> bool:
    """Check if password has exceeded the maximum age (90 days)."""
    if pwd_changed_at is None:
        return True  # never set = treat as expired

    now = datetime.now(timezone.utc)
    if pwd_changed_at.tzinfo is None:
        pwd_changed_at = pwd_changed_at.replace(tzinfo=timezone.utc)

    return now > pwd_changed_at + timedelta(days=MAX_PASSWORD_AGE_DAYS)


def days_until_expiry(pwd_changed_at: datetime | None) -> int:
    """Return number of days until password expires. Negative if already expired."""
    if pwd_changed_at is None:
        return -1

    now = datetime.now(timezone.utc)
    if pwd_changed_at.tzinfo is None:
        pwd_changed_at = pwd_changed_at.replace(tzinfo=timezone.utc)

    expiry = pwd_changed_at + timedelta(days=MAX_PASSWORD_AGE_DAYS)
    return math.ceil((expiry - now).total_seconds() / 86400.0)
