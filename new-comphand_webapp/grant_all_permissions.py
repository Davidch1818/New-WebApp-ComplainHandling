import os
import sys

# Add backend dir to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))

from core.database import import SessionLocal
from models.uam import Role, Permission, User

db = SessionLocal()

# Find the admin user
admin_user = db.query(User).filter(User.user_id == 'admin').first()
if not admin_user:
    print("Admin user not found.")
    sys.exit(1)

print(f"Admin user found: {admin_user.user_id}")

# Get the role associated with admin
if not admin_user.roles:
    print("Admin user has no roles assigned. Creating a super_admin role and assigning it.")
    role = Role(name="Super_Admin", description="Super Administrator", status="active")
    db.add(role)
    admin_user.roles.append(role)
    db.flush()
else:
    role = admin_user.roles[0]
    print(f"Using role: {role.name}")

# Get all permissions
all_permissions = db.query(Permission).all()
print(f"Found {len(all_permissions)} permissions in DB.")

# Assign all permissions to the role
added_count = 0
for p in all_permissions:
    if p not in role.permissions:
        role.permissions.append(p)
        added_count += 1

role_name = role.name
db.commit()
db.close()
print(f"Successfully added {added_count} new permissions to the '{role_name}' role.")
print("The 'admin' user should now have access to all menus.")