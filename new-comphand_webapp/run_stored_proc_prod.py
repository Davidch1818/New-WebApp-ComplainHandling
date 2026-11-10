import os
import psycopg2
from cryptography.fernet import Fernet

def get_decrypted_password() -> str:
    # Ensure this matches your IT Infra key path
    MASTER_KEY_PATH = "/etc/bmas-internal-web/master.key"
    encrypted_db_pass = os.getenv("DB_PASSWORD_ENCRYPTED")

    if not encrypted_db_pass:
        raise ValueError("DB_PASSWORD_ENCRYPTED environment variable is missing.")

    with open(MASTER_KEY_PATH, "rb") as key_file:
        cipher_suite = Fernet(key_file.read())

    # Decrypt in-memory
    return cipher_suite.decrypt(encrypted_db_pass.encode('utf-8')).decode('utf-8')

def main():
    # 1. Get decrypted password and other connection details
    db_password = get_decrypted_password()

    # Map your application's .env variables
    db_host = os.getenv("DB_HOST")
    db_port = os.getenv("DB_PORT")
    db_user = os.getenv("DB_USER")
    db_name = os.getenv("DB_NAME")

    # Ensure no hardcoded values; fail fast if missing from .env
    missing_vars = [
        var for var, val in zip(
            ["DB_HOST", "DB_PORT", "DB_USER", "DB_NAME"],
            [db_host, db_port, db_user, db_name]
        ) if not val
    ]

    if missing_vars:
        raise ValueError(f"Missing required environment variables in the environment file: {', '.join(missing_vars)}")

    # 2. Securely execute the stored procedure via psycopg2 directly (No psql binary needed)
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_password,
            dbname=db_name
        )
        # Stored procedures / sequence resets must be run in autocommit mode
        conn.autocommit = True

        with conn.cursor() as cur:
            cur.execute('CALL comphand."PROC_UPDTAGING"();')

        print("Success: PostgreSQL Aging Update Stored Procedure executed successfully.")
        conn.close()
    except Exception as e:
        print(f"Error executing procedure: {e}")
        exit(1)

if __name__ == "__main__":
    main()