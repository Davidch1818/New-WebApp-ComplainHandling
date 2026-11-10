# Create PostgreSQL Stored Procedure Scheduler on AlmaLinux 9

**Objective:** Securely schedule the execution of a PostgreSQL stored procedure on an AlmaLinux 9 UAT/PROD server.
**Compliance Requirements (Banking Gauntlet):** Adheres to the Zero-Credential Deployment Rule. Uses Systemd `EnvironmentFile` and in-memory decryption via the Python `cryptography` library (Fernet) to ensure that the encrypted `.env` database password is never exposed in clear-text on disk or via process monitoring (`ps`).

---

## 1. Architectural Overview

Since the database password inside the `.env` file is encrypted (ciphertext), standard `psql` cannot use it natively. Systemd would inject the ciphertext, causing PostgreSQL to reject the connection.

To resolve this securely:
1. Systemd triggers a Python wrapper script.
2. The Python wrapper script reads the encrypted password from the environment.
3. The script decrypts the password in-memory using the Master Key.
4. The script executes `psql` using `subprocess` and securely passes the clear-text password only to the child's environment variables space.

---

## 2. Implementation Steps

### Step 1: Create the Stored Procedure in PostgreSQL
Before configuring the scheduler, ensure the stored procedure exists in your database. Execute the following SQL script in your database client (e.g., DBeaver or pgAdmin) to create it:

```sql
CREATE OR REPLACE PROCEDURE comphand."PROC_UPDTAGING"()
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN

    UPDATE comphand.COMPLAINTS as c
    SET AGING = "comphand"."GET_WEEKDAYS_BETWEEN"(c.RECEIVED_DATE, CURRENT_DATE)
    WHERE c.COMPLETION_DATE IS NULL;

    UPDATE comphand.COMPLAINTS_OTOR as co
    SET AGING = "comphand"."GET_WEEKDAYS_BETWEEN"(co.RECEIVED_DATE, CURRENT_DATE)
    WHERE co.COMPLETION_DATE IS NULL;

    COMMIT;
END;
$BODY$;
ALTER PROCEDURE comphand."PROC_UPDTAGING"()
    OWNER TO bmas_user;
```

### Step 2: Create the Python Executor Script
Create the file `/opt/bmas-web-internal/run_stored_proc.py` if run on the UAT server, or `/opt/bmas-web-internal/run_stored_proc_prod.py` if run on the PROD server. This script performs the in-memory decryption and executes the procedure.

```python
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
```

**Apply restricted execution permissions:**
```bash
# For UAT
sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_stored_proc.py
sudo chmod 700 /opt/bmas-web-internal/run_stored_proc.py

# For PROD
sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_stored_proc_prod.py
sudo chmod 700 /opt/bmas-web-internal/run_stored_proc_prod.py
```

### Step 3: Create the Systemd Service Unit
Run the following command to create the `/etc/systemd/system/pg-stored-proc.service` file. This tells Systemd to call the Python script instead of `psql` directly.

```bash
sudo tee /etc/systemd/system/pg-stored-proc.service > /dev/null << 'EOF'
[Unit]
Description=Execute PostgreSQL Stored Procedure (Encrypted Pass)
After=network.target postgresql.service

[Service]
Type=oneshot
# Inject variables (including encrypted DB_PASSWORD_ENCRYPTED)
EnvironmentFile=/etc/bmas-internal-web/prod.env
# Use uat.env for UAT Server
# Call the Python decryptor wrapper (Use run_stored_proc.py for UAT, run_stored_proc_prod.py for PROD)
ExecStart=/usr/bin/python3 /opt/bmas-web-internal/run_stored_proc.py
User=bmas-app
Group=bmas-app

# Security hardening
ProtectSystem=strict
PrivateTmp=true
EOF
```

### Step 4: Create the Systemd Timer Unit
This unit dictates the execution schedule.

Run the following command to create the `/etc/systemd/system/pg-stored-proc.timer` file:

```bash
sudo tee /etc/systemd/system/pg-stored-proc.timer > /dev/null << 'EOF'
[Unit]
Description=Timer for PostgreSQL Stored Procedure Execution

[Timer]
# Run every day at 02:00 AM server time
OnCalendar=*-*-* 02:00:00
# Ensures the job runs if the server was down during the scheduled time
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

### Step 5: Apply & Verify
Apply the configurations and test the execution without waiting for the timer.

```bash
# Reload systemd to recognize the new files
sudo systemctl daemon-reload

# Enable and start the timer (NOT the service)
sudo systemctl enable --now pg-stored-proc.timer

# Test execution immediately
sudo systemctl start pg-stored-proc.service

# Check logs for success or cryptography errors
sudo journalctl -u pg-stored-proc.service -e
```

---

## 3. Production Server Deployment (Isolated App/DB)

If your PROD architecture isolates the Web/App server from the DB server, the App server will not have the `psql` binary installed. You must use the `_prod.py` script variation which connects securely via `psycopg2` over the network.

1. **Use the PROD Script:** Transfer and use `run_stored_proc_prod.py` instead of the standard wrapper.
2. **Apply Permissions:**
```bash
sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_stored_proc_prod.py
sudo chmod 700 /opt/bmas-web-internal/run_stored_proc_prod.py
```
3. **Update Systemd Service:** In `/etc/systemd/system/pg-stored-proc.service`, update the `ExecStart` line to use the virtual environment's Python (which has `psycopg2` installed) and point to the `_prod` script:
```ini
ExecStart=/opt/bmas-web-internal/venv/bin/python /opt/bmas-web-internal/run_stored_proc_prod.py
```