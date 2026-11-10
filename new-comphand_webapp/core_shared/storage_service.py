from __future__ import annotations
import os
import shutil
from dotenv import load_dotenv

load_dotenv()

# Configuration: Local Storage
STORAGE_ROOT = os.getenv("STORAGE_ROOT", "/opt/bmas-web/shared/storage")

class StorageService:
    def __init__(self):
        # Ensure the base storage directory exists
        os.makedirs(STORAGE_ROOT, exist_ok=True)

    def upload_file(self, file_path, object_name):
        """Save a file to the local server disk (replaces Huawei OBS)"""
        log_msg = ""
        try:
            target_path = os.path.join(STORAGE_ROOT, object_name)

            # Ensure target directory exists
            os.makedirs(os.path.dirname(target_path), exist_ok=True)

            # Move or copy the file
            shutil.copy2(file_path, target_path)

            log_msg = f"  Successfully saved {object_name} to local storage."
            result = True
        except Exception as e:
            log_msg = f"X Failed to save to local storage: {str(e)}"
            result = False

        print(log_msg)
        with open("reconcile.log", "a") as f:
            f.write(log_msg + "\n")
        return result

storage_service = StorageService()