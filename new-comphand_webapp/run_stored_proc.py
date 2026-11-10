import os
import subprocess
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

    # 2. Prepare isolated environment for the psql child process
    child_env = os.environ.copy()
    child_env["PGPASSWORD"] = db_password

    # 3. Securely execute psql via subprocess with explicit connection arguments
    # Note: PGPASSWORD passed via the env dictionary is NOT visible in `ps aux`
    command = [
        "/usr/bin/psql",
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-d", db_name,
        "-c", 'CALL comphand."PROC_UPDTAGING"();'
    ]

    try:
        # Run process, capture output for journalctl logging
        result = subprocess.run(command, env=child_env, check=True, capture_output=True, text=True)
        print("Success:", result.stdout)
    except subprocess.CalledProcessError as e:
        print("Error executing procedure:", e.stderr)
        exit(1)

if __name__ == "__main__":
    main()