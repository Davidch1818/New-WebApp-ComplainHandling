import os
import sys
import argparse
from dotenv import load_dotenv

parser = argparse.ArgumentParser(description="Add permissions to DB")
parser.add_argument("--env", type=str, help="Path to .env file", default=".env")
parser.add_argument("--master-key", type=str, help="Path to master key file")
args = parser.parse_args()

if os.path.exists(args.env):
    load_dotenv(args.env, override=True)
    print(f"Loaded environment variables from: {args.env}")
else:
    print(f"Warning: .env file '{args.env}' not found, falling back to default.")

if args.master_key:
    os.environ["MASTER_KEY_PATH"] = args.master_key
    print(f"Set MASTER_KEY_PATH to: {args.master_key}")

# Add backend dir to path so imports work
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))

from core.database import SessionLocal
from models.uam import Permission, Role

db = SessionLocal()

new_permissions = [
    {"code": "reconcile.bifast.upload", "name": "BiFast Upload", "category": "Reconciliation"},
    {"code": "reconcile.bifast.download", "name": "BiFast Download", "category": "Reconciliation"},
    {"code": "reconcile.telkom.upload", "name": "Telkom Upload", "category": "Reconciliation"},
    {"code": "reconcile.telkom.download", "name": "Telkom Download", "category": "Reconciliation"}
]

for p_data in new_permissions:
    p = db.query(Permission).filter(Permission.code == p_data["code"]).first()
    if not p:
        p = Permission(**p_data)
        db.add(p)
        print(f"Added permission: {p_data['code']}")
    else:
        print(f"Permission already exists: {p_data['code']}")

db.commit()

# add to super_admin (handle case sensitivity)
from sqlalchemy import func
super_admin_role = db.query(Role).filter(func.lower(Role.name) == "super_admin").first()
if super_admin_role:
    for p_data in new_permissions:
        p = db.query(Permission).filter(Permission.code == p_data["code"]).first()
        if p and p not in super_admin_role.permissions:
            super_admin_role.permissions.append(p)
            print(f"Added permission {p.code} to super_admin role")
    db.commit()
    print("Permissions added to super_admin role successfully")
else:
    print("super_admin role not found")

db.close()