from __future__ import annotations
"""
Database engine and session management for the UAM system.
Uses sync SQLAlchemy with psycopg2 (consistent with existing reconcile code).
Database: bmas_web_db, Schema: uam, comphand, lld
"""

import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

def get_db_password() -> str:
    """
    Returns the database password. Checks for an encrypted password first (UAT/PROD),
    and falls back to the plain text password (Local).
    """

    encrypted_pass = os.getenv("DB_PASSWORD_ENCRYPTED")
    if encrypted_pass:
        MASTER_KEY_PATH = os.getenv("MASTER_KEY_PATH", "/etc/bmas-internal-web/master.key")
        try:
            with open(MASTER_KEY_PATH, "rb") as key_file:
                cipher_suite = Fernet(key_file.read().strip())
                return cipher_suite.decrypt(encrypted_pass.encode('utf-8')).decode('utf-8')
        except FileNotFoundError:
            raise ValueError(f"Encrypted password found but Master key not found at {MASTER_KEY_PATH}")
        except Exception as e:
            raise ValueError(f"Error decrypting password: {e}")

    # Fallback to local unencrypted password if the encrypted one is not provided.
    fallback_pass = os.getenv("DB_PASSWORD")
    if fallback_pass:
        return fallback_pass

    raise ValueError("Neither DB_PASSWORD_ENCRYPTED nor DB_PASSWORD is set.")


DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = get_db_password()
DB_NAME = os.getenv("DB_NAME")

# URL encode the password to safely handle special characters like '@'
encoded_password = urllib.parse.quote_plus(DB_PASSWORD)
DATABASE_URL = f"postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# 1. Base UAM Engine
engine_uam = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True, # verify connections before use
    echo=False,
)

# Ensure all queries from this session target the 'uam' schema by default
@event.listens_for(engine_uam, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO uam, public")
    cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine_uam)


# 2. Comphand Engine (Uses the same DB_USER and password)
engine_comphand = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
)

@event.listens_for(engine_comphand, "connect")
def set_search_path_comphand(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO comphand, public")
    cursor.close()

SessionLocalComphand = sessionmaker(autocommit=False, autoflush=False, bind=engine_comphand)


# 3. LLD Engine (Uses the same DB_USER and password)
engine_lld = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    echo=False,
)

@event.listens_for(engine_lld, "connect")
def set_search_path_lld(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO lld, public")
    cursor.close()

SessionLocalLLD = sessionmaker(autocommit=False, autoflush=False, bind=engine_lld)


Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a database session per request for UAM."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# def get_comphand_db():
#     """FastAPI dependency that provides a database session per request for Comphand."""
#     db = SessionLocalComphand()
#     try:
#         yield db
#     finally:
#         db.close()


# def get_lld_db():
#     """FastAPI dependency that provides a database session per request for LLD."""
#     db = SessionLocalLLD()
#     try:
#         yield db
#     finally:
#         db.close()
