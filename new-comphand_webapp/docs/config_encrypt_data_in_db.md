# Master Key Rotation Procedure

This document outlines the step-by-step process for securely rotating the AES-SIV Master Encryption Key used for encrypting sensitive fields in the application (like `customer_name`, `atm_card_number`, etc. in the Complaints system).

The encryption system is designed to allow **Zero-Downtime Key Rotation**. It supports having multiple keys loaded at the same time. It will always use the **highest numbered key** to encrypt new data, but it will try **all available keys** to decrypt existing data.

## Step 1: Generate a New Key
First, generate a new secure 32-byte (64-character hex) encryption key.
You can run this Python command on any machine to generate one:
```bash
python -c "import os, binascii; print(binascii.hexlify(os.urandom(32)).decode('ascii'))"
```

## Step 2: Add the New Key to master_keys.json
Open `master_keys.json` in the root of the project. **Do not delete the old key yet!**
If your current key is `"1"`, you should add the new key as `"2"`.

```json
{
  "1": "your_old_64_char_hex_key",
  "2": "your_new_64_char_hex_key"
}
```

Once this is saved and the backend application is restarted, the system will immediately start encrypting any *new* user data using key `"2"`, old data remains encrypted with `"1"`, but the application can still seamlessly read it.

## Step 3: Run the Data Migration Script (Re-Encryption)
To rotate the existing data in the database from the old key to the new key, run the migration script:

```bash
# In the project root directory:
python encrypt_existing_data.py
```

### What this script does:
1. It reads every record from the database. Because key `"1"` is still in `master_keys.json`, the system successfully decrypts the old data.
2. It immediately writes the data back to the database. Because `"2"` is the highest numbered key, the system encrypts the data using the new key before saving it.
3. This process effectively re-encrypts the entire database with the new key.

## Step 4: Remove the Old Key (Optional but Recommended)
Once the `encrypt_existing_data.py` script has successfully completed for all tables, **100% of your data is now encrypted with key "2"**.

You no longer need the old key. For optimal security, you should now safely delete key `"1"` from `master_keys.json`:

```json
{
  "2": "your_new_64_char_hex_key"
}
```

After deleting the old key, restart the application to clear the old key from memory.

---

> [!WARNING]
> **Data Loss Prevention**
> Never delete an old encryption key from your environment before you have successfully run the data migration script (`encrypt_existing_data.py`). If you delete a key that was used to encrypt data, that data will be permanently unreadable.