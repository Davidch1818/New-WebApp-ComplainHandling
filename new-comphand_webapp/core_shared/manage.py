from __future__ import annotations
"""
CLI management tool for UAM.
Usage:
    python manage.py migrate       - Run all SQL migrations
    python manage.py seed-admin    - Create default admin user (admin/Admin@1234)
    python manage.py seed-all      - Run migrations + seed admin (first-time setup)
"""

import sys
import os
import glob

# Add backend dir to path so imports work
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from core.database import engine_uam as engine, SessionLocal
from core.security import hash_password
from models.uam import User, Role, UserRole

MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")
DEFAULT_ADMIN_USER_ID = "admin"
DEFAULT_ADMIN_PASSWORD = "Admin@1234"
DEFAULT_ADMIN_NAME = "System Administrator"

def run_migrations():
    """Execute all .sql migration files in order."""
    sql_files = sorted(glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql")))
    if not sql_files:
        print("No migration files found.")
        return

    from sqlalchemy import text
    with engine.connect() as conn:
        for filepath in sql_files:
            filename = os.path.basename(filepath)
            print(f"Running: {filename}...")
            with open(filepath, "r") as f:
                sql = f.read()
            with conn.begin():
                # Execute raw SQL, handling multiple statements
                for statement in sql.split(";"):
                    stmt = statement.strip()
                    if stmt:
                        conn.execute(text(stmt))
                print(f" ✓ {filename} applied.")

    print("All migrations applied successfully.")

def seed_admin():
    """Create the default admin user with Super Admin role."""
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing = db.query(User).filter(User.user_id == DEFAULT_ADMIN_USER_ID).first()
        if existing:
            print(f"Admin user '{DEFAULT_ADMIN_USER_ID}' already exists. Skipping.")
            return

        # Create admin user
        admin = User(
            user_id=DEFAULT_ADMIN_USER_ID,
            full_name=DEFAULT_ADMIN_NAME,
            email=None,
            password_hash=hash_password(DEFAULT_ADMIN_PASSWORD),
            must_change_pwd=True, # forced to change on first login
            status="active",
            created_by="system",
            updated_by="system",
        )
        db.add(admin)
        db.flush()

        # Assign Super Admin role
        super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
        if super_admin_role:
            admin.roles.append(super_admin_role)
            print(f" ✓ Assigned 'super_admin' role to '{DEFAULT_ADMIN_USER_ID}'.")
        else:
            print(" ⚠ 'super_admin' role not found. Run migrations first.")

        db.commit()
        print(f" ✓ Admin user '{DEFAULT_ADMIN_USER_ID}' created with temporary password.")
        print(f" ⚠ Password will be forced to change on first login.")

    finally:
        db.close()

def main():
    if len(sys.argv) < 2:
        print("Usage: python manage.py [migrate|seed-admin|seed-all]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "migrate":
        print("Running database migrations...")
        run_migrations()

    elif command == "seed-admin":
        print("Creating default admin user...")
        seed_admin()

    elif command == "seed-all":
        print("=== First-time setup ===")
        print("\n1. Running migrations...")
        run_migrations()
        print("\n2. Creating admin user...")
        seed_admin()
        print("\n=== Setup complete ===")

    else:
        print(f"Unknown command: {command}")
        print("Available commands: migrate, seed-admin, seed-all")
        sys.exit(1)

if __name__ == "__main__":
    main()