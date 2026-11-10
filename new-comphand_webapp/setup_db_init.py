"""
Setup awal database PostgreSQL untuk BMAS Internal Web.
Jalankan script ini menggunakan superuser postgres.
Secara otomatis membaca konfigurasi DB dari file .env (DB_USER, DB_PASSWORD, DB_NAME, DB_PORT, DB_HOST).

Usage:
    python setup_db_init.py --pg-pass <password_postgres> [--pg-port 5432]
"""
import argparse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Pastikan root direktori dan core_shared ada di sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "core_shared"))

# Load konfigurasi .env
load_dotenv(BASE_DIR / ".env")

TARGET_DB_USER = os.getenv("DB_USER", "bmas_user")
TARGET_DB_PASSWORD = os.getenv("DB_PASSWORD", "bmas_pass")
TARGET_DB_NAME = os.getenv("DB_NAME", "bmas_web_db")
DEFAULT_DB_PORT = int(os.getenv("DB_PORT", "5432"))
DEFAULT_DB_HOST = os.getenv("DB_HOST", "localhost")


def get_engine_url(user, password, host, port, dbname):
    try:
        import psycopg2
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"
    except ImportError:
        return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"


def run(pg_pass: str, pg_host: str = DEFAULT_DB_HOST, pg_port: int = DEFAULT_DB_PORT):
    print(f"[INFO] Inisialisasi DB Target: '{TARGET_DB_NAME}' dengan User: '{TARGET_DB_USER}'")
    
    root_url = get_engine_url("postgres", pg_pass, pg_host, pg_port, "postgres")
    engine = create_engine(root_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        # 1. Buat / update target DB user
        user_exists = conn.execute(
            text(f"SELECT 1 FROM pg_roles WHERE rolname = :username"),
            {"username": TARGET_DB_USER}
        ).fetchone()

        if not user_exists:
            conn.execute(text(f"CREATE USER \"{TARGET_DB_USER}\" WITH PASSWORD :pwd"), {"pwd": TARGET_DB_PASSWORD})
            print(f"[OK] User '{TARGET_DB_USER}' dibuat.")
        else:
            conn.execute(text(f"ALTER USER \"{TARGET_DB_USER}\" WITH PASSWORD :pwd"), {"pwd": TARGET_DB_PASSWORD})
            print(f"[INFO] User '{TARGET_DB_USER}' sudah ada -- password disinkronkan.")

        # 2. Buat target database jika belum ada
        db_exists = conn.execute(
            text(f"SELECT 1 FROM pg_database WHERE datname = :dbname"),
            {"dbname": TARGET_DB_NAME}
        ).fetchone()

        if not db_exists:
            conn.execute(text(f"CREATE DATABASE \"{TARGET_DB_NAME}\" OWNER \"{TARGET_DB_USER}\""))
            print(f"[OK] Database '{TARGET_DB_NAME}' dibuat.")
        else:
            print(f"[INFO] Database '{TARGET_DB_NAME}' sudah ada.")

        # 3. Grant privileges database
        conn.execute(text(f"GRANT ALL PRIVILEGES ON DATABASE \"{TARGET_DB_NAME}\" TO \"{TARGET_DB_USER}\""))
        print(f"[OK] Privileges diberikan ke '{TARGET_DB_USER}'.")

    engine.dispose()

    # 4. Connect ke target database untuk create schemas & migrations
    app_url = get_engine_url(TARGET_DB_USER, TARGET_DB_PASSWORD, pg_host, pg_port, TARGET_DB_NAME)
    app_engine = create_engine(app_url, isolation_level="AUTOCOMMIT")

    with app_engine.connect() as conn:
        # Buat schemas
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS uam AUTHORIZATION \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS comphand AUTHORIZATION \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS lld AUTHORIZATION \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"GRANT ALL ON SCHEMA public TO \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"GRANT ALL ON SCHEMA uam TO \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"GRANT ALL ON SCHEMA comphand TO \"{TARGET_DB_USER}\";"))
        conn.execute(text(f"GRANT ALL ON SCHEMA lld TO \"{TARGET_DB_USER}\";"))
        print("[OK] Schemas 'uam', 'comphand', 'lld' siap.")

        # 5. Jalankan migration SQL secara berurutan
        # --- 5a. UAM Schema ---
        uam_tables_exist = conn.execute(
            text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'uam' AND table_name = 'users'")
        ).fetchone()

        if not uam_tables_exist:
            uam_migrations = [
                BASE_DIR / "core_shared" / "migrations" / "001_uam_schema.sql",
                BASE_DIR / "core_shared" / "migrations" / "002_seed_data.sql",
            ]
            for mig in uam_migrations:
                if mig.exists():
                    print(f"[RUN] Menjalankan migration: {mig.name}")
                    sql_content = mig.read_text(encoding="utf-8")
                    conn.execute(text(sql_content))
            print("[OK] Migration UAM dan Seed Data selesai.")
        else:
            print("[INFO] Tabel UAM sudah ada.")

        # --- 5b. Comphand Schema (003) ---
        comphand_tables_exist = conn.execute(
            text("SELECT 1 FROM information_schema.tables WHERE table_schema = 'comphand' AND table_name = 'complaints'")
        ).fetchone()

        if not comphand_tables_exist:
            comphand_mig = BASE_DIR / "core_shared" / "migrations" / "003_comphand_schema.sql"
            if comphand_mig.exists():
                print(f"[RUN] Menjalankan migration: {comphand_mig.name}")
                sql_content = comphand_mig.read_text(encoding="utf-8")
                conn.execute(text(sql_content))
                print("[OK] Migration Comphand Schema selesai.")
        else:
            print("[INFO] Tabel Comphand sudah ada.")

        # --- 5c. Encrypt comphand fields (004) ---
        comphand_encrypted = conn.execute(
            text("""
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'comphand'
                  AND table_name = 'complaints'
                  AND column_name = 'customer_name'
                  AND data_type = 'text'
            """)
        ).fetchone()

        if not comphand_encrypted:
            encrypt_mig = BASE_DIR / "core_shared" / "migrations" / "004_encrypt_comphand_fields.sql"
            if encrypt_mig.exists():
                print(f"[RUN] Menjalankan migration: {encrypt_mig.name}")
                sql_content = encrypt_mig.read_text(encoding="utf-8")
                conn.execute(text(sql_content))
                print("[OK] Migration Encrypt Comphand Fields selesai.")
        else:
            print("[INFO] Kolom Comphand sudah bertipe TEXT (encrypt-ready).")

        # --- 5d. Migrasi public -> comphand (005) ---
        migrate_mig = BASE_DIR / "core_shared" / "migrations" / "005_migrate_public_to_comphand.sql"
        if migrate_mig.exists():
            print(f"[RUN] Menjalankan migration: {migrate_mig.name}")
            sql_content = migrate_mig.read_text(encoding="utf-8")
            conn.execute(text(sql_content))
            print("[OK] Migration public -> comphand selesai.")

    app_engine.dispose()

    # 6. Set env vars runtime
    os.environ["DB_HOST"] = pg_host
    os.environ["DB_PORT"] = str(pg_port)
    os.environ["DB_USER"] = TARGET_DB_USER
    os.environ["DB_PASSWORD"] = TARGET_DB_PASSWORD
    os.environ["DB_NAME"] = TARGET_DB_NAME

    # 7. Inisialisasi model ORM Comphand & UAM
    try:
        from core_shared.core.database import Base, engine_comphand
        import core_shared.models.uam
        import core_shared.models.comphand
        Base.metadata.create_all(engine_comphand)
        print("[OK] Tabel-tabel ORM Comphand & UAM sinkron.")
    except Exception as e:
        print(f"[WARN] Inisialisasi ORM: {e}")

    # 8. Inisialisasi tabel Reconcile (BiFast & Core)
    try:
        from programs.reconcile.reconcile_engine import ensure_schema
        ensure_schema()
        print("[OK] Tabel Reconcile Engine dibuat.")
    except Exception as e:
        print(f"[WARN] Reconcile schema: {e}")

    # 9. Pastikan user super admin (admin) tersedia
    try:
        from core_shared.core.database import SessionLocal
        from core_shared.models.uam import User, Role
        from core_shared.core.security import hash_password

        db = SessionLocal()
        admin = db.query(User).filter(User.user_id == "admin").first()
        if not admin:
            admin = User(
                user_id="admin",
                full_name="Super Administrator",
                email="admin@bmas.internal",
                department="IT Security",
                password_hash=hash_password("Admin@1234"),
                status="active",
                must_change_pwd=False
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)

            super_role = db.query(Role).filter(Role.name.in_(["super_admin", "Super_Admin"])).first()
            if super_role:
                admin.roles.append(super_role)
                db.commit()
            print("[OK] User 'admin' default dibuat (Password: Admin@1234).")
        else:
            print("[INFO] User 'admin' sudah ada.")
        db.close()
    except Exception as e:
        print(f"[WARN] Seed admin user: {e}")

    print("\n[DONE] Setup database selesai! Database siap digunakan.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="BMAS DB Init Setup")
    parser.add_argument("--pg-pass", required=True, help="Password superuser postgres")
    parser.add_argument("--pg-host", default=DEFAULT_DB_HOST)
    parser.add_argument("--pg-port", type=int, default=DEFAULT_DB_PORT)
    args = parser.parse_args()
    run(args.pg_pass, args.pg_host, args.pg_port)
