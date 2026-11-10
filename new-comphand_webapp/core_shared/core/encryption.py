import os
import binascii
from cryptography.hazmat.primitives.ciphers.aead import AESSIV
from sqlalchemy.types import TypeDecorator, Text
from dotenv import load_dotenv

load_dotenv()


def _get_encryption_keys() -> list[bytes]:
    """
    Load all keys from master_keys.json and sort them.
    The highest numbered key is the active key (first in the list).
    Keys must be 32, 48, or 64 bytes long for AES-SIV (which decodes from 64, 96, 128 hex chars).
    """
    keys = []
    key_vars = []

    keys_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "master_keys.json")

    if os.path.exists(keys_file):
        import json
        try:
            with open(keys_file, "r") as f:
                data = json.load(f)

            for key, val in data.items():
                try:
                    num = int(key)
                    key_vars.append((num, val))
                except ValueError:
                    pass
        except Exception as e:
            print(f"Error loading {keys_file}: {e}")

    key_vars.sort(key=lambda x: x[0], reverse=True)

    for _, key_str in key_vars:
        try:
            # We assume it's hex encoded. A 64 character hex string is 32 bytes.
            key_bytes = binascii.unhexlify(key_str)
            if len(key_bytes) not in (32, 48, 64):
                print(f"Warning: Invalid key length for AESSIV: {len(key_bytes)} bytes. Must be 32, 48, or 64.")
                continue
            keys.append(key_bytes)
        except Exception:
            pass # skip invalid keys

    return keys


# Pre-load keys to avoid re-parsing on every query
_ENCRYPTION_KEYS = _get_encryption_keys()


def encrypt_deterministic(plaintext: str) -> str:
    """Encrypts a string deterministically using AES-SIV and the active key."""
    if not plaintext:
        return plaintext
    if not _ENCRYPTION_KEYS:
        # If no key is set, return plaintext so the app doesn't crash in dev environments
        # without keys, but ideally this should be configured.
        return plaintext

    active_key = _ENCRYPTION_KEYS[0]
    aessiv = AESSIV(active_key)
    # AESSIV requires a list of associated data (can be empty list)
    ciphertext = aessiv.encrypt(plaintext.encode('utf-8'), None)
    # Return as hex string for safe storage in TEXT columns
    return binascii.hexlify(ciphertext).decode('ascii')


def decrypt_deterministic(ciphertext_hex: str) -> str:
    """Decrypts a hex-encoded string trying all available keys."""
    if not ciphertext_hex:
        return ciphertext_hex
    if not _ENCRYPTION_KEYS:
        return ciphertext_hex # Fallback if no keys

    try:
        ciphertext = binascii.unhexlify(ciphertext_hex)
    except binascii.Error:
        # Not a valid hex string, probably plaintext existing data
        return ciphertext_hex

    for key in _ENCRYPTION_KEYS:
        try:
            aessiv = AESSIV(key)
            plaintext = aessiv.decrypt(ciphertext, None)
            return plaintext.decode('utf-8')
        except Exception:
            # Decryption failed with this key (wrong key or invalid data)
            continue

    # If all keys fail, return the original (it might just be plaintext)
    # This allows seamless migration for existing data
    return ciphertext_hex


class EncryptedString(TypeDecorator):
    """
    SQLAlchemy Custom Type for Deterministic Encryption.
    Encrypts value on bind, decrypts on retrieval.
    """
    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        return encrypt_deterministic(str(value))

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        return decrypt_deterministic(value)