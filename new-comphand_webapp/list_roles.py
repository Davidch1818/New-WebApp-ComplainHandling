import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))

from core.database import SessionLocal
from models.uam import Role, User


def main():
    db = SessionLocal()
    roles = db.query(Role).all()
    print("ROLES:")
    for r in roles:
        print(f" - {r.name}")

    print("\nUSERS AND ROLES:")
    users = db.query(User).all()
    for u in users:
        role_names = [r.name for r in u.roles]
        print(f" - {u.user_id}: {role_names}")


if __name__ == "__main__":
    main()