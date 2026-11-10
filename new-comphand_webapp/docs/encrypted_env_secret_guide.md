# Developer Guide: Encrypted Environment Variables (Secrets Management)

**Target Audience:** Backend Developers, IT Security, IT Infrastructure
**Objective:** Securely handle Production Service Account (PID) passwords input directly by IT Security. Ensure that passwords are never stored in clear text within configuration files (e.g., `.env`) or exposed to OS-level environment snooping.

---

## 1. Architectural Concept

Because our on-premise architecture does not utilize external secret managers (like HashiCorp Vault), we will implement **Encrypted Environment Variables** using Python's `cryptography` library (Fernet symmetric encryption).

### How it integrates with `systemd` securely:
1. **The `.env` File:** The password is saved as ciphertext (encrypted string) in the `.env` file.
2. **Systemd `EnvironmentFile`:** When systemd starts our application, it reads the `.env` file. Systemd treats the encrypted string purely as text and injects it into the application's environment.
3. **Double Security:** By injecting *encrypted* text, we protect the system against "Environment Snooping". If a user with high privileges inspects the process environment (e.g., via `cat /proc/PID/environ`), they will only see the encrypted gibberish, not the real password.
4. **In-Memory Decryption:** The Python application reads a separate, highly restricted Master Key file to decrypt the password *only in RAM* during application startup. The clear-text password is never written to disk.

---

## 2. Implementation Steps for Developers

Developers need to build two components to support this workflow.

**Prerequisite:** Ensure the cryptography library is included in your `requirements.txt` or `uv.lock`.
```bash
pip install cryptography
```

### Component A: The IT Sec Input Script (`set_secret.py`)
Create a standalone script that IT Security will run on the PROD server to key in the new password. This script uses `getpass` to hide keystrokes, encrypts the input, and appends it to the `.env` file.

```python
import os
import getpass
from cryptography.fernet import Fernet

def main():
    MASTER_KEY_PATH = os.getenv("MASTER_KEY_PATH", "/etc/bmas-internal-web/master.key")
    APP_ENV = os.getenv("APP_ENV", "prod") # Change to 'uat' for UAT server
    ENV_FILE_PATH = os.getenv("ENV_FILE_PATH", f"/etc/bmas-internal-web/{APP_ENV}.env")

    # 1. Load the Master Key
    try:
        with open(MASTER_KEY_PATH, "rb") as key_file:
            cipher_suite = Fernet(key_file.read().strip())
    except FileNotFoundError:
        print(f"Error: Master key not found at {MASTER_KEY_PATH}")
        print("Note: You can override the path by setting the MASTER_KEY_PATH environment variable.")
        return
    except Exception as e:
        print(f"Error reading master key: {e}")
        return

    # 2. Securely prompt IT Sec for the password
    clear_password = getpass.getpass("IT Sec, Please enter Service Account Password (for bmas_user): ")

    # 3. Encrypt the password
    encrypted_password = cipher_suite.encrypt(clear_password.encode('utf-8'))
    encrypted_str = encrypted_password.decode('utf-8')

    # 4. Update the .env file
    env_content = []
    key_found = False

    try:
        with open(ENV_FILE_PATH, "r") as env_file:
            for line in env_file:
                if line.strip().startswith("DB_PASSWORD_ENCRYPTED=") or line.strip().startswith("export DB_PASSWORD_ENCRYPTED="):
                    env_content.append(f"DB_PASSWORD_ENCRYPTED={encrypted_str}\n")
                    key_found = True
                else:
                    env_content.append(line)
    except FileNotFoundError:
        pass

    if not key_found:
        if env_content and not env_content[-1].endswith("\n"):
            env_content[-1] += "\n"
        env_content.append(f"DB_PASSWORD_ENCRYPTED={encrypted_str}\n")

    with open(ENV_FILE_PATH, "w") as env_file:
        env_file.writelines(env_content)

    print(f"Success: Password encrypted and saved securely to {ENV_FILE_PATH} as DB_PASSWORD_ENCRYPTED!")

if __name__ == "__main__":
    main()
```

### Component B: Backend Application Decryption
Modify the database connection logic in your FastAPI/Django application to decrypt the password at startup.

```python
import os
from cryptography.fernet import Fernet

def get_db_password() -> str:
    MASTER_KEY_PATH = "/etc/bmas-internal-web/master.key"

    # 1. Get the encrypted string from the environment (injected by systemd)
    encrypted_db_pass = os.getenv("DB_PASSWORD_ENCRYPTED")
    if not encrypted_db_pass:
        raise ValueError("DB_PASSWORD_ENCRYPTED environment variable is not set.")

    # 2. Load the Master Key
    with open(MASTER_KEY_PATH, "rb") as key_file:
        cipher_suite = Fernet(key_file.read())

    # 3. Decrypt the password in-memory
    real_db_password = cipher_suite.decrypt(encrypted_db_pass.encode('utf-8')).decode('utf-8')

    return real_db_password

# Use get_db_password() when configuring your SQLAlchemy or Django database connection
```

---

## 3. Operational Workflow (Production Setup)

For this to be secure, IT Infrastructure must set up the OS permissions correctly before IT Sec keys in the password.

1. **Create Secure Directory (IT Infra):**
   Create the folder for storing the master key and environment files.
   ```bash
   sudo mkdir -p /etc/bmas-internal-web
   sudo chown deploy_user:www-data /etc/bmas-internal-web
   sudo chmod 750 /etc/bmas-internal-web
   ```

2. **Generate Master Key (IT Infra):**
   Generate a secure Fernet key and save it to the server.
   ```bash
   python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" | sudo tee /etc/bmas-internal-web/master.key > /dev/null
   ```

3. **Create Environment Files (IT Infra):**
   Create the target `.env` files so the script can append to them.
   ```bash
   sudo touch /etc/bmas-internal-web/prod.env
   sudo touch /etc/bmas-internal-web/uat.env
   ```

4. **Restrict Permissions (IT Infra):**
   Ensure ONLY the application user (`deploy_user`) can read the key and `.env` files.
   ```bash
   sudo chown deploy_user:www-data /etc/bmas-internal-web/master.key
   sudo chmod 400 /etc/bmas-internal-web/master.key
   sudo chown deploy_user:www-data /etc/bmas-internal-web/*.env
   sudo chmod 640 /etc/bmas-internal-web/*.env
   ```

5. **Lock File Immutability (IT Infra):**
   Prevent accidental or malicious modifications by the `root` user using the immutable flag.
   ```bash
   sudo chattr +i /etc/bmas-internal-web/master.key
   ```
   *(Note: To edit or rotate this key in the future, you must first remove the flag with `sudo chattr -i`)*

6. **Key-in Password (IT Sec):**
   IT Sec logs into the server, executes `cd /opt/bmas-web-internal` (or where your app resides).
   IT Sec executes the script by explicitly declaring the environment:
   For PROD: `APP_ENV=prod python3 set_secret.py`
   For UAT: `APP_ENV=uat python3 set_secret.py`
   Then types the new password.

7. **Restart Application (IT Infra):**
   ```bash
   sudo systemctl restart bmas-internal-web
   ```
   The application will now connect to the database using the newly encrypted credentials.