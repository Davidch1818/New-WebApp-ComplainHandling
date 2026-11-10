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