# PostgreSQL Recommendation: Database for On-Premise Banking Internal Web

## Why PostgreSQL for Banking?

PostgreSQL is the **most widely adopted open-source relational database** in the financial industry. It is trusted by major banks and fintech companies for its:

- **ACID compliance** — Full transactional integrity (critical for financial data)
- **Row-Level Security (RLS)** — Enforce access control at the database level
- **Extensibility** — `pgcrypto` for field-level encryption, `pgAudit` for compliance logging
- **5-year official support** — Predictable, published EOL dates (unlike many open-source tools)
- **No license cost** — PostgreSQL License (liberal, similar to MIT/BSD)

---

## Recommended Version & Support Status

### PostgreSQL Version Summary

| Item | Details |
|:---|:---|
| **Recommended Version** | **PostgreSQL 17.10** (for conservative/proven stability) |
| **Alternative** | **PostgreSQL 18.4** (latest major, best performance) |
| **Latest Patch Released** | May 14, 2026 (17.10) / May 11, 2026 (18.4) |
| **License** | PostgreSQL License (free, open source) |
| **Maintenance Status** | ✅ Both actively maintained |
| **Official Site** | [postgresql.org](https://www.postgresql.org/) |
| **GitHub** | [github.com/postgres/postgres](https://github.com/postgres/postgres) |
| **Download** | [postgresql.org/download](https://www.postgresql.org/download/) |
| **Release Notes** | [postgresql.org/docs/release](https://www.postgresql.org/docs/release/) |
| **Security Info** | [postgresql.org/support/security](https://www.postgresql.org/support/security/) |
| **EOL Tracker** | [endoflife.date/postgresql](https://endoflife.date/postgresql) |

---

## Version Lifecycle (Official 5-Year Support)

PostgreSQL has **formal, published end-of-life dates** — each major version receives exactly **5 years of support** with quarterly security/bug fix releases:

| Version | Initial Release | Latest Patch | End of Life | Status (June 2026) |
|:---|:---|:---|:---|:---|
| **PostgreSQL 13** | Sep 2020 | 13.20 | Nov 13, 2025 | ❌ **EOL** |
| **PostgreSQL 14** | Sep 2021 | 14.18 | **Nov 12, 2026** | ⚠️ **EOL in 5 months — plan migration** |
| **PostgreSQL 15** | Oct 2022 | 15.14 | **Nov 11, 2027** | ✅ Supported |
| **PostgreSQL 16** | Sep 2023 | 16.10 | **Nov 9, 2028** | ✅ Supported |
| **PostgreSQL 17** | Sep 2024 | **17.10** | **Nov 8, 2029** | ✅ **Recommended (proven)** |
| **PostgreSQL 18** | Sep 2025 | **18.4** | **Nov 14, 2030** | ✅ **Recommended (latest)** |

> [!WARNING]
> **PostgreSQL 14 reaches End-of-Life on November 12, 2026.** If you're currently running PG 14, begin planning your migration now. After this date, no security patches will be released.

> [!IMPORTANT]
> **Recommendation for new banking projects:**
> - **PostgreSQL 17** — Proven, stable, widely adopted; supported until **November 2029**
> - **PostgreSQL 18** — Latest features (Async I/O, UUIDv7); supported until **November 2030**
>
> Either is an excellent choice. Choose PG 17 if your team values a longer track record; choose PG 18 if you want the latest performance and features.

---

## PostgreSQL 17 vs 18 — Key Differences

| Feature Area | PostgreSQL 17 | PostgreSQL 18 |
|:---|:---|:---|
| **I/O Subsystem** | Synchronous (traditional) | ✅ **Asynchronous I/O (AIO)** — up to 3× faster reads |
| **Indexing** | Standard B-tree | ✅ **Skip Scan** for multi-column indexes |
| **Data Integrity** | Checksums opt-in | ✅ **Checksums enabled by default** |
| **UUID Generation** | UUIDv4 (random) | ✅ **Native UUIDv7** (timestamp-ordered, index-friendly) |
| **Major Upgrades** | Stats lost after `pg_upgrade` | ✅ **Retains optimizer statistics** across upgrades |
| **Generated Columns** | Stored only | ✅ **Virtual generated columns** (computed at query time) |
| **Authentication** | Standard | ✅ **OAuth 2.0 support** |
| **EOL** | November 8, 2029 | November 14, 2030 |

> [!TIP]
> **For banking:** PostgreSQL 18's **data checksums by default** is particularly valuable — it enables proactive detection of silent data corruption at the storage layer, which is critical for financial data integrity.

---

## Python Integration — Recommended Drivers & ORMs

Since your backend is Python, here's the recommended database connectivity stack:

| Component | Recommendation | Notes |
|:---|:---|:---|
| **Primary Driver** | **psycopg (v3)** | Modern replacement for psycopg2; native async support |
| **High-Performance** | **asyncpg** | Fastest option for extreme high-concurrency endpoints |
| **ORM (General)** | **SQLAlchemy 2.0+** | Industry standard; full async engine support |
| **ORM (FastAPI)** | **SQLModel** | Built on SQLAlchemy + Pydantic; ideal for FastAPI |
| **Legacy Driver** | psycopg2 | ⚠️ Maintenance mode — avoid for new projects |

### Installation

```bash
# For Django
pip install psycopg[binary]    # psycopg v3

# For FastAPI + SQLAlchemy
pip install sqlalchemy[asyncio] psycopg[binary]

# For FastAPI + SQLModel
pip install sqlmodel psycopg[binary]

# For highest performance (specific endpoints)
pip install asyncpg
```

### Connection Example (FastAPI + SQLAlchemy Async)

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Using psycopg v3 async driver
DATABASE_URL = "postgresql+psycopg://user:password@localhost:5432/bmas_web_db"

engine = create_async_engine(DATABASE_URL, echo=False, pool_size=20, max_overflow=10)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
```

---

## Platform Consideration: Linux vs Windows

> [!WARNING]
> **PostgreSQL on Windows is NOT recommended for production banking workloads.**
>
> PostgreSQL uses a **process-per-connection model** optimized for Unix/Linux. On Windows:
> - Process forking is significantly slower
> - Background OS processes (Windows Update, antivirus) cause unpredictable latency spikes
> - Most production tools (pgBackRest, Patroni, repmgr) are Linux-first
> - NTFS is less efficient than Linux filesystems for database I/O patterns

| Platform | Recommendation |
|:---|:---|
| **Linux (RHEL / Ubuntu Server)** | ✅ **Strongly recommended** for production |
| **Linux VM on Windows host** | ✅ Good alternative if Windows host is mandatory |
| **Docker on Windows** | ✅ Acceptable for dev/staging |
| **Native Windows** | ❌ **Not recommended** for production banking |

---

## Banking-Grade Security Configuration

### 1. Authentication (`pg_hba.conf`)

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# Reject all trust connections
# local   all            all                                    trust    # NEVER USE THIS

# Local connections (Unix socket) — SCRAM-SHA-256
local   all            all                                     scram-sha-256

# Application server — SSL required + SCRAM-SHA-256
hostssl bmas_web_db     app_user        10.0.1.0/24             scram-sha-256

# Admin access — certificate-based (mTLS)
hostssl all            admin_user      10.0.0.5/32             cert

# Reject everything else
host    all            all             0.0.0.0/0               reject
```

### 2. Server Configuration (`postgresql.conf`)

```conf
# ─── Connection & SSL ───
listen_addresses = '10.0.1.50'          # Bind to specific IP, NOT '*'
port = 5432
max_connections = 200

ssl = on
ssl_cert_file = '/etc/ssl/certs/pg_server.crt'
ssl_key_file = '/etc/ssl/private/pg_server.key'
ssl_min_protocol_version = 'TLSv1.2'

# ─── Authentication ───
password_encryption = 'scram-sha-256'

# ─── Auditing (pgAudit) ───
shared_preload_libraries = 'pgaudit'
pgaudit.log = 'ddl, write, role'        # Log DDL, INSERT/UPDATE/DELETE, role changes
pgaudit.log_catalog = off

# ─── Logging ───
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_connections = on
log_disconnections = on
log_statement = 'ddl'                    # Log all DDL statements
log_line_prefix = '%m [%p] %u@%d '

# ─── Performance ───
shared_buffers = '4GB'                   # ~25% of system RAM
effective_cache_size = '12GB'            # ~75% of system RAM
work_mem = '64MB'
maintenance_work_mem = '512MB'
wal_buffers = '64MB'

# ─── Data Integrity ───
# PG 17: data_checksums = on  (set during initdb)
# PG 18: enabled by default
fsync = on                               # NEVER disable in banking
full_page_writes = on
```

### 3. Security Checklist

| # | Practice | Implementation |
|:---|:---|:---|
| 1 | **Force SCRAM-SHA-256** | `password_encryption = 'scram-sha-256'` |
| 2 | **SSL/TLS required** | `hostssl` only in `pg_hba.conf`; `ssl = on` |
| 3 | **Least privilege** | Dedicated `app_user` with minimal permissions; never use `postgres` superuser for apps |
| 4 | **Audit logging** | Enable `pgAudit` for DDL, DML, and role operations |
| 5 | **Network isolation** | Bind to specific IP; firewall blocks port 5432 from untrusted networks |
| 6 | **Data checksums** | Enable at `initdb` (PG 17) or default (PG 18) |
| 7 | **Field-level encryption** | Use `pgcrypto` for sensitive columns (PII, account numbers) |
| 8 | **Row-Level Security** | Enable RLS policies for multi-tenant or role-based data access |
| 9 | **Non-root process** | Run as dedicated `postgres` OS user with `700` permissions on data directory |
| 10 | **Patch quarterly** | Subscribe to [postgresql.org/support/security](https://www.postgresql.org/support/security/) |

---

## High Availability & Backup (Banking Requirements)

### Recommended HA Architecture

```
                    ┌────────────────────┐
                    │   HAProxy / PgBouncer  │  ← Connection pooling & routing
                    └────────┬───────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
     ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
     │  PostgreSQL   │ │  PostgreSQL   │ │  PostgreSQL   │
     │  Primary      │ │  Replica 1    │ │  Replica 2    │
     │  (Read/Write) │ │  (Read-Only)  │ │  (Read-Only)  │
     └──────────────┘ └──────────────┘ └──────────────┘
              │
              ▼
     ┌──────────────────────┐
     │  Patroni              │  ← Automatic failover management
     │  + etcd/Consul        │
     └──────────────────────┘
```

### Recommended Tools

| Purpose | Tool | Notes |
|:---|:---|:---|
| **Automatic Failover** | **Patroni** | Consensus-based HA; industry standard |
| **Connection Pooling** | **PgBouncer** | Reduces connection overhead; essential for high-concurrency |
| **Backup & Recovery** | **pgBackRest** | Incremental backups, parallel processing, PITR |
| **Monitoring** | **pg_stat_statements** + Prometheus/Grafana | Query performance tracking |

### Backup Strategy (Banking Best Practice)

```bash
# Full backup (weekly)
pgbackrest --stanza=banking --type=full backup

# Incremental backup (daily)
pgbackrest --stanza=banking --type=incr backup

# WAL archiving (continuous — enables Point-in-Time Recovery)
archive_mode = on
archive_command = 'pgbackrest --stanza=banking archive-push %p'
```

> [!CAUTION]
> **For banking:** Test your recovery procedures quarterly. Automate PITR (Point-in-Time Recovery) tests in a staging environment to validate your RPO/RTO targets. A backup that hasn't been tested is not a backup.

---

## Complete Stack Summary (Updated)

Your full on-premise banking technology stack:

| Layer | Technology | Version | End of Support |
|:---|:---|:---|:---|
| **Reverse Proxy** | Nginx (Stable) | 1.30.2 | ~April 2027 |
| **Frontend** | React | 19.2.7 | No formal EOL |
| **Build Tool** | Node.js LTS | 24.16.0 | April 30, 2028 |
| **Backend Runtime** | Python | 3.12 or 3.13 | Oct 2028 / Oct 2029 |
| **App Server (WSGI)** | Gunicorn | 26.0.0 | No formal EOL |
| **App Server (ASGI)** | Uvicorn | 0.49.0 | No formal EOL |
| **Database** | **PostgreSQL** | **17.10 or 18.4** | **Nov 2029 / Nov 2030** |
| **DB Driver (Python)** | psycopg v3 | Latest | No formal EOL |
| **ORM** | SQLAlchemy 2.0+ | Latest | No formal EOL |

### Full Request Flow

```
Browser
  │
  ▼
Nginx 1.30.2 (port 443, SSL/TLS)
  │
  ├── GET /              → React static files (dist/)
  │
  └── POST /api/*        → Gunicorn + Uvicorn (port 8000)
                              │
                              ▼
                          Python Backend
                          (FastAPI / Django)
                              │
                              ▼ psycopg v3 / asyncpg
                          PostgreSQL 17.10 / 18.4
                          (port 5432, SSL, SCRAM-SHA-256)
```

---

## Reference Links

| Resource | URL |
|:---|:---|
| PostgreSQL Official Site | https://www.postgresql.org/ |
| PostgreSQL Download | https://www.postgresql.org/download/ |
| PostgreSQL Documentation | https://www.postgresql.org/docs/ |
| PostgreSQL Release Notes | https://www.postgresql.org/docs/release/ |
| PostgreSQL Security Advisories | https://www.postgresql.org/support/security/ |
| PostgreSQL Versioning Policy | https://www.postgresql.org/support/versioning/ |
| PostgreSQL EOL Tracker | https://endoflife.date/postgresql |
| PostgreSQL GitHub | https://github.com/postgres/postgres |
| pgAudit (Audit Extension) | https://www.pgaudit.org/ |
| pgBackRest (Backup Tool) | https://pgbackrest.org/ |
| Patroni (HA Manager) | https://github.com/patroni/patroni |
| PgBouncer (Connection Pooler) | https://www.pgbouncer.org/ |
| psycopg v3 (Python Driver) | https://www.psycopg.org/psycopg3/docs/ |
| asyncpg (Python Driver) | https://github.com/MagicStack/asyncpg |
| SQLAlchemy | https://www.sqlalchemy.org/ |
| SQLModel (FastAPI ORM) | https://sqlmodel.tiangolo.com/ |
