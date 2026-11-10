import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

passwords = ["postgres", "admin", "root", ""]
conn = None
for pwd in passwords:
    try:
        print(f"Trying password: '{pwd}'")
        conn = psycopg2.connect(user="postgres", password=pwd, host="localhost", port="5432")
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        print("Connected as postgres!")
        break
    except Exception as e:
        pass

if not conn:
    print("Could not connect as postgres user with common passwords.")
    exit(1)

cursor = conn.cursor()

# Create user
try:
    cursor.execute("CREATE USER bmas_user WITH PASSWORD 'bmas_pass';")
    print("User bmas_user created.")
except Exception as e:
    print("User might exist, altering password:", e)
    cursor.execute("ALTER USER bmas_user WITH PASSWORD 'bmas_pass';")

# Create database
try:
    cursor.execute("CREATE DATABASE bmas_web_db;")
    print("Database bmas_web_db created.")
except Exception as e:
    print("Database might exist:", e)

# Grant privileges
cursor.execute("GRANT ALL PRIVILEGES ON DATABASE bmas_web_db TO bmas_user;")
try:
    cursor.execute("ALTER DATABASE bmas_web_db OWNER TO bmas_user;")
except Exception as e:
    pass

cursor.close()
conn.close()
print("Setup complete.")