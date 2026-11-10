from core_shared.core.database import SessionLocal
from core_shared.models.uam import Role

db = SessionLocal()
role = db.query(Role).filter(Role.name == "Super_Admin").first()
if role:
    role.name = "super_admin"
    db.commit()
    print("Renamed 'Super_Admin' to 'super_admin' in DB.")
else:
    print("No 'Super_Admin' role found.")
