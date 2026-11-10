import os
import sys

# Add backend dir to path so imports work (traverse one level up since this is in scripts/)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "core_shared"))

from core.database import SessionLocal
from models.uam import Role, Permission, User

db = SessionLocal()

permissions_to_add = [
    {'code': 'comphand.list', 'name': 'List Complain', 'category': 'Operations'},
    {'code': 'comphand.manage', 'name': 'List Complain (Manage)', 'category': 'Operations'},
    {'code': 'comphand.submit', 'name': 'Submit Complaint', 'category': 'Operations'},
    {'code': 'comphand.queue', 'name': 'Ticket Queue', 'category': 'Operations'},
    {'code': 'comphand.detail', 'name': 'Complaint Detail', 'category': 'Operations'},
    {'code': 'comphand.master', 'name': 'Master Detail Management', 'category': 'Operations'},
    {'code': 'comphand.approval', 'name': 'Approval Queue', 'category': 'Operations'},
    # Added consolidated permissions
    {'code': 'comphand.audit_log', 'name': 'Activity Log', 'category': 'Operations'},
    {'code': 'comphand.resolution_report', 'name': 'Resolution Report', 'category': 'Complaint Handling'},
    {'code': 'comphand.report', 'name': 'Handling Report', 'category': 'Operations'},
    {'code': 'comphand.approval_master', 'name': 'Approval Master Data', 'category': 'Complaint Handling'},
]

added = 0
for p_data in permissions_to_add:
    existing = db.query(Permission).filter(Permission.code == p_data['code']).first()
    if not existing:
        new_perm = Permission(code=p_data['code'], name=p_data['name'], category=p_data['category'])
        db.add(new_perm)
        added += 1
        print(f"Added permission: {p_data['code']}")
    else:
        print(f"Permission already exists: {p_data['code']}")

db.commit()
db.close()
print(f"Finished adding {added} permissions.")
