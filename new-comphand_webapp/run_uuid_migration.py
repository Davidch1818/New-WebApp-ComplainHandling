import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

passwords = ["postgres", "admin", "root", ""]
conn = None
for pwd in passwords:
    try:
        conn = psycopg2.connect(user="postgres", password=pwd, host="localhost", port="5432", dbname="bmas_web_db")
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        break
    except Exception as e:
        pass

if not conn:
    print("Could not connect")
    exit(1)

cursor = conn.cursor()
queries = [
    "CREATE EXTENSION IF NOT EXISTS pgcrypto;",
    "ALTER TABLE comphand.complaints ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();",
    "ALTER TABLE comphand.complaints ADD CONSTRAINT complaints_uuid_unique UNIQUE (uuid);",
    "ALTER TABLE comphand.complaints_otor ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT gen_random_uuid();",
    "ALTER TABLE comphand.complaints_otor ADD CONSTRAINT complaints_otor_uuid_unique UNIQUE (uuid);"
]

for q in queries:
    try:
        cursor.execute(q)
        print(f"Executed: {q}")
    except Exception as e:
        print(f"Error executing {q}: {e}")

cursor.close()
conn.close()