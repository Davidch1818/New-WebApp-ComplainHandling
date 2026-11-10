import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "core_shared"))
from core.database import SessionLocal
from models.uam import Role

def main():
    db = SessionLocal()
    role = db.query(Role).filter(Role.name == "Super_Admin").first()
    if role:
        role.status = "active"
        db.commit()
        print("Super_Admin activated")
    else:
        print("Not found")

if __name__ == "__main__":
    main()
