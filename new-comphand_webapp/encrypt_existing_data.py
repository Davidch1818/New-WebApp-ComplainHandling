import os
import sys

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm.attributes import flag_modified

# Ensure the core shared directory is in the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'core_shared'))

from core.encryption import encrypt_deterministic
from models.comphand import Complaint, ComplaintOtor
from dotenv import load_dotenv

load_dotenv()

def migrate_data():
    db_user = os.getenv("DB_USER")
    db_pass = os.getenv("DB_PASSWORD")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "bmas_web_db")

    if not db_pass:
        print("Error: DB_PASSWORD environment variable not set.")
        return

    db_url = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"

    print(f"Connecting to database {db_host}:{db_port}/{db_name}...")
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()

    try:
        # Migrate complaints
        print("Migrating comphand.complaints...")
        complaints = session.query(Complaint).all()
        count = 0
        for c in complaints:
            # The model's EncryptedString automatically decrypts when we read it (if it's encrypted)
            # Or it returns the plaintext (if it's not encrypted yet).
            # To encrypt existing plaintext, we simply re-assign the fields.
            # SQLAlchemy will trigger process_bind_param on save.

            # Since SQLAlchemy tracks changes, we need to manually flag it as modified
            # or just re-assign.
            c.customer_name = str(c.customer_name) if c.customer_name else None
            c.atm_card_number = str(c.atm_card_number) if c.atm_card_number else None
            c.address = str(c.address) if c.address else None
            flag_modified(c, "customer_name")
            flag_modified(c, "atm_card_number")
            flag_modified(c, "address")
            count += 1

        session.commit()
        print(f"Successfully migrated {count} complaints.")

        # Migrate complaints_otor
        print("Migrating comphand.complaints_otor...")
        complaints_otor = session.query(ComplaintOtor).all()
        count_otor = 0
        for co in complaints_otor:
            co.customer_name = str(co.customer_name) if co.customer_name else None
            co.atm_card_number = str(co.atm_card_number) if co.atm_card_number else None
            co.address = str(co.address) if co.address else None
            flag_modified(co, "customer_name")
            flag_modified(co, "atm_card_number")
            flag_modified(co, "address")
            count_otor += 1

        session.commit()
        print(f"Successfully migrated {count_otor} complaints_otor records.")

        print("Migration complete!")

    except Exception as e:
        session.rollback()
        print(f"Error during migration: {e}")
    finally:
        session.close()

if __name__ == "__main__":
    # Check if keys exist
    import json
    keys_file = "master_keys.json"
    if not os.path.exists(keys_file):
        print(f"WARNING: {keys_file} not found. Cannot encrypt data.")
    else:
        try:
            with open(keys_file, "r") as f:
                data = json.load(f)
            if not data:
                print(f"WARNING: {keys_file} is empty. Cannot encrypt data.")
            else:
                migrate_data()
        except Exception as e:
            print(f"Error reading {keys_file}: {e}")