from core_shared.core.database import SessionLocal
from core_shared.models.uam import User
db = SessionLocal()
users = db.query(User).filter(User.user_id == 'admin').all()
for u in users:
    print(f"ID: {u.id}, status: {u.status}, must_change: {u.must_change_pwd}, deleted: {u.is_deleted}")
