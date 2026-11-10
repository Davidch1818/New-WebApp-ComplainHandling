import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))

from core_shared.core.database import SessionLocal
from core_shared.models.uam import User
db = SessionLocal()
users = db.query(User).all()
print(f"Total users: {len(users)}")
for u in users:
    print(f"{u.user_id}: status={u.status}, must_change={u.must_change_pwd}, is_deleted={u.is_deleted}")
