# Create Monthly PostgreSQL Counter Reset Scheduler

**Objective:** Securely schedule a monthly reset of PostgreSQL sequences (`counter_CC` and `counter_CS`) back to `1` on an AlmaLinux 9 server.
**Compliance Requirements (Banking Gauntlet):** Adheres to the Zero-Credential Deployment Rule. Uses Systemd `EnvironmentFile` and in-memory decryption via the Python `cryptography` library (Fernet) to ensure that the encrypted `.env` database password is never exposed in clear-text.

---

## 1. Architectural Overview

To adhere to security policies, we reuse the existing secure wrapper architecture:
1. Systemd triggers a timer on the 1st of every month at midnight.
2. The timer triggers a Systemd service.
3. The service executes a Python wrapper script.
4. The Python wrapper reads the encrypted DB password from the `.env` file, decrypts it in-memory using the master key.
5. The wrapper securely executes `psql` to call the sequence reset procedure.

---

## 2. Implementation Steps

### Step 1: Create the Stored Procedure in PostgreSQL

Execute the following SQL script in your database client (e.g., DBeaver or pgAdmin). Adjust the schema `comphand` if your sequences reside in a different schema.

```sql
CREATE OR REPLACE PROCEDURE comphand."PROC_RESET_MONTHLY_COUNTERS"()
LANGUAGE 'plpgsql'
AS $BODY$
BEGIN
    -- Reset the sequences back to 1
    ALTER SEQUENCE comphand."counter_CC" RESTART WITH 1;
    ALTER SEQUENCE comphand."counter_CS" RESTART WITH 1;

    COMMIT;
END;
$BODY$;

-- Ensure the correct user owns the procedure so it has permission to alter the sequences
ALTER PROCEDURE comphand."PROC_RESET_MONTHLY_COUNTERS"()
    OWNER TO bmas_user;
```

> **DBA Note:** The user executing this procedure (e.g., `bmas_user`) must be the owner of the sequences or a superuser to successfully alter them.

### Step 2: Create the Python Executor Script

Create a new Python wrapper script specifically for this job: `/opt/bmas-web-internal/run_reset_counters.py` if run on the UAT server, or `/opt/bmas-web-internal/run_reset_counters_prod.py` if run on the PROD server.

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
    command = [
        "/usr/bin/psql",
        "-h", db_host,
        "-p", db_port,
        "-U", db_user,
        "-d", db_name,
        "-c", 'CALL comphand."PROC_RESET_MONTHLY_COUNTERS"();'
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

---

**Apply restricted execution permissions:**
```bash
# For UAT
sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_reset_counters.py
sudo chmod 700 /opt/bmas-web-internal/run_reset_counters.py

# For PROD
sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_reset_counters_prod.py
sudo chmod 700 /opt/bmas-web-internal/run_reset_counters_prod.py
```

### Step 3: Create the Systemd Service Unit

Create the service file `/etc/systemd/system/pg-reset-counters.service` to trigger the Python script.

```bash
sudo tee /etc/systemd/system/pg-reset-counters.service > /dev/null << 'EOF'
[Unit]
Description=Execute PostgreSQL Monthly Counter Reset
After=network.target postgresql.service

[Service]
Type=oneshot
# Inject variables (including encrypted DB_PASSWORD_ENCRYPTED)
EnvironmentFile=/etc/bmas-internal-web/prod.env
# Note: Change the above to /etc/bmas-internal-web/uat.env for UAT Server
# Call the Python decryptor wrapper (Use run_reset_counters.py for UAT, run_reset_counters_prod.py for PROD)
ExecStart=/usr/bin/python3 /opt/bmas-web-internal/run_reset_counters.py
User=bmas-app
Group=bmas-app

# Security hardening
ProtectSystem=strict
PrivateTmp=true
EOF
```

### Step 4: Create the Systemd Timer Unit (The Monthly Scheduler)

Create the timer file `/etc/systemd/system/pg-reset-counters.timer`. The `OnCalendar` syntax specifically triggers on the **1st day of every month at midnight**.

```bash
sudo tee /etc/systemd/system/pg-reset-counters.timer > /dev/null << 'EOF'
[Unit]
Description=Timer for Monthly PostgreSQL Counter Reset

[Timer]
# Run on the 1st day of every month at 00:00:00 (Midnight)
OnCalendar=*-*-01 00:00:00
# Ensures the job runs if the server was offline at midnight on the 1st
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

### Step 5: Apply & Verify

Reload Systemd, enable the timer, and verify the configuration.

```bash
# Reload systemd to recognize the new service and timer files
sudo systemctl daemon-reload

# Enable and start the timer (This schedules it for the future)
sudo systemctl enable --now pg-reset-counters.timer

# Test the execution immediately to ensure there are no permission or script errors
sudo systemctl start pg-reset-counters.service

# Check logs for success
sudo journalctl -u pg-reset-counters.service -e
```

---

## 3. Production Server Deployment (Isolated App/DB)

If your PROD architecture isolates the Web/App server from the DB server, the App server will not have the `psql` binary installed. You must use the `_prod.py` script variation which connects securely via `psycopg2` over the network.

1. **Use the PROD Script:** Transfer and use `run_reset_counters_prod.py` instead of the standard wrapper.
2. **Apply Permissions:**
   ```bash
   sudo chown bmas-app:bmas-app /opt/bmas-web-internal/run_reset_counters_prod.py
   sudo chmod 700 /opt/bmas-web-internal/run_reset_counters_prod.py
   ```
3. **Update Systemd Service:** In `/etc/systemd/system/pg-reset-counters.service`, update the `ExecStart` line to use the virtual environment's Python (which has `psycopg2` installed) and point to the `_prod` script:
   ```ini
   ExecStart=/opt/bmas-web-internal/venv/bin/python /opt/bmas-web-internal/run_reset_counters_prod.py
   ```