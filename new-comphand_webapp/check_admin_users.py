import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))

from core.database import SessionLocal
from models.uam import Role, User

def main():
    db = SessionLocal()

    super_admin_role = db.query(Role).filter(Role.name == "super_admin").first()
    if not super_admin_role:
        super_admin_role = db.query(Role).filter(Role.name == "Super_Admin").first()

    if not super_admin_role:
        print("Super admin role not found.")
        return

    for username in ["admin", "admin1"]:
        user = db.query(User).filter(User.user_id == username).first()
        if user:
            print(f"User {username} found.")
            has_role = False
            for r in user.roles:
                print(f" - Has role: {r.name}")
                if r.name in ["super_admin", "Super_Admin"]:
                    has_role = True

            if not has_role:
                print(f" -> Reassigning super_admin role to {username}.")
                user.roles.append(super_admin_role)
                db.commit()
                print("     Assigned successfully.")
        else:
            print(f"User {username} not found in DB.")

if __name__ == "__main__":
    main()