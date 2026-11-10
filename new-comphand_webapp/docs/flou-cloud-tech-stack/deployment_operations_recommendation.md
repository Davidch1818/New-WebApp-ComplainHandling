# Deployment & Operations: Manual Deploy Without Version Control

## Your Situation

| Constraint | Impact |
|:---|:---|
| ❌ No version control (Git) | No automated history tracking, diffs, or rollbacks via VCS |
| ❌ No CI/CD pipeline | Build and deploy manually via SSH/terminal |
| ❌ Cost & environment limitations | Must minimize tooling overhead |
| ✅ On-premise server | Full control of the deployment environment |

---

## Do You Need Docker?

### Short Answer: **No. Docker is NOT recommended for your situation.**

Docker solves the "it works on my machine" problem — but it introduces its own complexity. Given your constraints, Docker would **add overhead without sufficient benefit**:

| Factor | Docker | Bare Metal (Recommended) |
|:---|:---|:---|
| **Learning curve** | High — Dockerfile, images, networking, volumes | Low — standard Linux administration |
| **Debugging** | Harder — logs inside containers, extra abstraction layer | Easier — `journalctl`, direct file access |
| **Deployment** | Need Docker engine installed, image registry or manual transfer | Copy files + restart service |
| **Rollback** | Image versioning (needs registry) | Symlink swap (instant) |
| **Extra infra needed** | Docker Engine, possibly a private registry | Nothing extra |
| **Resource overhead** | Minimal but exists | Zero overhead |
| **Team skill required** | Docker + Linux | Linux only |

> [!IMPORTANT]
> **Recommendation:** Deploy directly on Linux (bare metal or VM) using **Python virtual environments + systemd**. This is simpler, more transparent, and easier to debug for a small team without DevOps expertise.
>
> **When Docker WOULD make sense:** If you later need to run multiple isolated services on the same server, or if your team grows and you adopt CI/CD. At that point, reconsider Docker.

---

## Additional Tech Stack You Need to Provision

Here is everything you need **beyond** the core stack (Nginx, React, Python, Gunicorn/Uvicorn, PostgreSQL) to operate in production:

### Must-Have (Essential)

| # | Tool | Purpose | Already on Linux? | Install |
|:---|:---|:---|:---|:---|
| 1 | **systemd** | Process manager — auto-start/restart your Python app | ✅ Built-in | N/A |
| 2 | **Python venv** | Isolate Python dependencies per project | ✅ Built-in | `python3 -m venv` |
| 3 | **uv** (optional, modern) | Faster alternative to pip + venv | ❌ | `curl -LsSf https://astral.sh/uv/install.sh \| sh` |
| 4 | **Alembic** | Database schema migration tool (for FastAPI/SQLAlchemy) | ❌ | `pip install alembic` |
| 5 | **pg_dump / pg_restore** | PostgreSQL backup & restore | ✅ With PostgreSQL | Installed with `postgresql-client` |
| 6 | **UFW / firewalld** | Firewall — block all ports except 80/443 | ✅ Built-in | `apt install ufw` or `dnf install firewalld` |
| 7 | **certbot** or internal CA certs | SSL/TLS certificates | ❌ | `apt install certbot` or use internal CA |
| 8 | **rsync / scp** | Transfer build artifacts to production server | ✅ Built-in | N/A |
| 9 | **tar / zip** | Package source code and build artifacts | ✅ Built-in | N/A |
| 10 | **cron** | Schedule automated backups | ✅ Built-in | N/A |

### Should-Have (Highly Recommended)

| # | Tool | Purpose | Install |
|:---|:---|:---|:---|
| 11 | **Netdata** | Real-time server monitoring (CPU, RAM, disk, network) | One-line installer |
| 12 | **logrotate** | Prevent log files from filling disk | ✅ Usually pre-installed |
| 13 | **pgBackRest** | Enterprise-grade PostgreSQL backup with PITR | `apt install pgbackrest` |
| 14 | **htop** | Interactive process viewer | `apt install htop` |
| 15 | **fail2ban** | Block brute-force SSH/login attempts | `apt install fail2ban` |

### Nice-to-Have (If budget/time allows)

| # | Tool | Purpose | Install |
|:---|:---|:---|:---|
| 16 | **Prometheus + Grafana** | Advanced monitoring & dashboards | Multiple packages |
| 17 | **pgAudit** | PostgreSQL audit logging for compliance | PostgreSQL extension |
| 18 | **Ansible** | Automate server setup (even without CI/CD) | `pip install ansible` |

> [!NOTE]
> **You do NOT need to provision:**
> - ❌ Docker Engine
> - ❌ Docker Compose
> - ❌ Container registry
> - ❌ Kubernetes
> - ❌ Jenkins / GitLab CI
> - ❌ PM2 (that's for Node.js; use systemd instead)

---

## Production Server Directory Structure

Use a consistent, well-organized directory layout on your production Linux server:

```
/opt/banking-app/
├── releases/
│   ├── 2026-06-10_v1.0/          ← Each deployment is a dated folder
│   │   ├── backend/
│   │   │   ├── venv/              ← Python virtual environment
│   │   │   ├── app/               ← Python source code
│   │   │   ├── alembic/           ← Database migrations
│   │   │   └── requirements.txt   ← Pinned dependencies
│   │   └── frontend/
│   │       └── dist/              ← React production build output
│   │
│   ├── 2026-06-15_v1.1/          ← Next deployment
│   │   ├── backend/
│   │   └── frontend/
│   │
│   └── 2026-06-20_v1.2/          ← Keep last 3-5 releases for rollback
│       ├── backend/
│       └── frontend/
│
├── current -> releases/2026-06-20_v1.2   ← SYMLINK to active release
│
├── shared/
│   ├── .env                       ← Environment variables (DB password, secrets)
│   ├── ssl/                       ← SSL certificates
│   └── logs/                      ← Application logs
│
└── backups/
    ├── db/                        ← PostgreSQL dumps
    └── config/                    ← Nginx/systemd config backups
```

### Why This Structure?

| Benefit | How |
|:---|:---|
| **Instant rollback** | Change symlink: `ln -sfn releases/2026-06-15_v1.1 current` |
| **Audit trail** | Each release folder is dated — you know exactly what was deployed when |
| **Secrets separation** | `.env` lives in `shared/`, never inside the release folder |
| **Clean history** | Keep last 3–5 releases, delete older ones to save disk space |

---

## Manual Deployment Workflow (Step-by-Step)

### One-Time Server Setup

```bash
# 1. Create directory structure
sudo mkdir -p /opt/banking-app/{releases,shared,backups/db,backups/config}
sudo chown -R deploy_user:www-data /opt/banking-app

# 2. Create shared .env file (secrets)
cat > /opt/banking-app/shared/.env << 'EOF'
DATABASE_URL=postgresql+psycopg://app_user:SECURE_PASSWORD@localhost:5432/bmas_web_db
SECRET_KEY=your-random-secret-key-here
DEBUG=false
EOF
chmod 600 /opt/banking-app/shared/.env

# 3. Set up systemd service (one-time)
sudo tee /etc/systemd/system/banking-app.service << 'EOF'
[Unit]
Description=Banking Internal Web Application
After=network.target postgresql.service

[Service]
User=deploy_user
Group=www-data
WorkingDirectory=/opt/banking-app/current/backend
EnvironmentFile=/opt/banking-app/shared/.env
ExecStart=/opt/banking-app/current/backend/venv/bin/gunicorn \
    -w 4 \
    -k uvicorn.workers.UvicornWorker \
    --bind unix:/opt/banking-app/shared/banking-app.sock \
    --access-logfile /opt/banking-app/shared/logs/access.log \
    --error-logfile /opt/banking-app/shared/logs/error.log \
    app.main:app
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable banking-app

# 4. Set up Nginx (one-time) — point to shared socket
# See nginx_recommendation.md for full config
# Key line:  proxy_pass http://unix:/opt/banking-app/shared/banking-app.sock;

# 5. Set up automated daily backups via cron
(crontab -l 2>/dev/null; echo "0 2 * * * pg_dump -Fc bmas_web_db > /opt/banking-app/backups/db/bmas_web_db_\$(date +\%Y\%m\%d).dump") | crontab -
```

### Each Deployment (Repeatable Process)

On your **development/build machine** (where Node.js is installed):

```bash
# ── Step 1: Build React Frontend ──
cd /path/to/frontend-project
npm ci                          # Install exact dependencies from lock file
npm run build                   # Output → dist/ folder

# ── Step 2: Package Everything ──
RELEASE_NAME="$(date +%Y-%m-%d)_v1.2"
mkdir -p release-package/frontend
mkdir -p release-package/backend
cp -r dist/ release-package/frontend/
cp -r /path/to/backend-project/* release-package/backend/
tar -czf "${RELEASE_NAME}.tar.gz" -C release-package .
```

On the **production server** (via SSH):

```bash
RELEASE_NAME="2026-06-20_v1.2"

# ── Step 3: Upload & Extract ──
# (Use scp/rsync to transfer the tar.gz to the server)
mkdir -p /opt/banking-app/releases/${RELEASE_NAME}
tar -xzf ${RELEASE_NAME}.tar.gz -C /opt/banking-app/releases/${RELEASE_NAME}

# ── Step 4: Set Up Python Environment ──
cd /opt/banking-app/releases/${RELEASE_NAME}/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# ── Step 5: Link Shared .env ──
ln -sf /opt/banking-app/shared/.env /opt/banking-app/releases/${RELEASE_NAME}/backend/.env

# ── Step 6: Backup Database (BEFORE migration) ──
pg_dump -Fc bmas_web_db > /opt/banking-app/backups/db/pre_deploy_${RELEASE_NAME}.dump

# ── Step 7: Run Database Migrations ──
cd /opt/banking-app/releases/${RELEASE_NAME}/backend
source venv/bin/activate
alembic upgrade head            # Or: python manage.py migrate (Django)
deactivate

# ── Step 8: Switch to New Release (Atomic) ──
ln -sfn /opt/banking-app/releases/${RELEASE_NAME} /opt/banking-app/current

# ── Step 9: Restart Application ──
sudo systemctl restart banking-app
sudo systemctl reload nginx     # Only if Nginx config changed

# ── Step 10: Verify ──
sudo systemctl status banking-app
curl -s -o /dev/null -w "%{http_code}" https://internal-banking.example.com/api/health
# Should return 200
```

### Rollback (If Deployment Fails)

```bash
# ── Instant rollback to previous release ──
ln -sfn /opt/banking-app/releases/2026-06-15_v1.1 /opt/banking-app/current
sudo systemctl restart banking-app

# ── If database migration needs rollback ──
# Option A: Roll forward (preferred — create a fix migration)
alembic upgrade head   # with new fix migration

# Option B: Restore from backup (emergency only)
pg_restore -c -d bmas_web_db /opt/banking-app/backups/db/pre_deploy_2026-06-20_v1.2.dump
```

---

## Monitoring: What to Install

For a small team without dedicated DevOps, **Netdata** is the simplest, most effective monitoring tool:

```bash
# One-line install
curl https://get.netdata.cloud/kickstart.sh > /tmp/netdata-kickstart.sh && sh /tmp/netdata-kickstart.sh
```

It gives you real-time dashboards for:
- CPU, RAM, disk, network usage
- Nginx connections and response times
- PostgreSQL query performance
- Python process health
- Alert notifications (email, Slack)

> [!TIP]
> Access Netdata at `http://your-server:19999`. For security, block port 19999 from external access and use an SSH tunnel or Nginx proxy with authentication to access it.

---

## Source Code Management Without Git

> [!WARNING]
> **Not having version control is a significant risk**, especially for banking. Even without GitHub/GitLab, consider these minimum-effort alternatives:

| Approach | Effort | What You Get |
|:---|:---|:---|
| **Keep release archives** | ✅ Zero effort | Each `tar.gz` on the server IS your version history |
| **Shared network drive** | Low | Copy dated source folders to a shared NAS |
| **Local Git (no server)** | Low | `git init` on each developer's machine — free, no server needed |
| **Gitea (self-hosted)** | Medium | Lightweight, self-hosted Git server — runs on minimal resources |

> [!IMPORTANT]
> **Strong recommendation:** Even without a hosted Git service, developers should use **`git init` locally** on their machines. It costs nothing, needs no server, and provides:
> - Full change history (`git log`)
> - Ability to see exactly what changed (`git diff`)
> - Safety net before major changes (`git stash`, branches)
>
> Git is a **local tool first** — it does NOT require GitHub, GitLab, or any server.

---

## Automated Backup Schedule

Set up these cron jobs for automated protection:

```bash
# Edit crontab
crontab -e

# ── Daily: Database backup (2:00 AM) ──
0 2 * * * pg_dump -Fc bmas_web_db > /opt/banking-app/backups/db/daily_$(date +\%Y\%m\%d).dump

# ── Weekly: Full config backup (Sunday 3:00 AM) ──
0 3 * * 0 tar -czf /opt/banking-app/backups/config/config_$(date +\%Y\%m\%d).tar.gz /etc/nginx /etc/systemd/system/banking-app.service /opt/banking-app/shared/.env

# ── Daily: Clean old backups (keep last 30 days) ──
0 4 * * * find /opt/banking-app/backups/db -name "*.dump" -mtime +30 -delete

# ── Daily: Clean old releases (keep last 5) ──
0 4 * * * cd /opt/banking-app/releases && ls -t | tail -n +6 | xargs rm -rf
```

---

## Consolidated Full Stack Checklist

Everything you need to provision for your on-premise banking internal web:

| Category | Component | Version | Need to Install? | Purpose |
|:---|:---|:---|:---|:---|
| **OS** | Linux (Ubuntu Server LTS or RHEL) | Latest LTS | ✅ Base OS | Server foundation |
| **Reverse Proxy** | Nginx (Stable) | 1.30.2 | ✅ Install | SSL, static files, reverse proxy |
| **Frontend** | React | 19.2.7 | ✅ Build machine only | UI framework |
| **Build Tool** | Node.js LTS | 24.16.0 | ✅ Build machine only | Build React → static files |
| **Backend Runtime** | Python | 3.12 or 3.13 | ✅ Install | Application runtime |
| **App Server** | Gunicorn + Uvicorn | 26.0.0 / 0.49.0 | ✅ pip install | Serve Python app |
| **Database** | PostgreSQL | 17.10 or 18.4 | ✅ Install | Data storage |
| **DB Driver** | psycopg v3 | Latest | ✅ pip install | Python ↔ PostgreSQL |
| **ORM** | SQLAlchemy 2.0+ | Latest | ✅ pip install | Database abstraction |
| **DB Migrations** | Alembic | Latest | ✅ pip install | Schema version control |
| **Process Manager** | systemd | Built-in | ❌ Already there | Auto-start/restart app |
| **Firewall** | UFW / firewalld | Built-in | ❌ Already there | Block unauthorized ports |
| **Backup** | pg_dump + cron | Built-in | ❌ Already there | Automated DB backups |
| **Monitoring** | Netdata | Latest | ✅ Install | Real-time server health |
| **Security** | fail2ban | Latest | ✅ Install | Block brute-force attacks |
| **File Transfer** | rsync / scp | Built-in | ❌ Already there | Deploy files to server |
| | | | | |
| **NOT NEEDED** | ~~Docker~~ | — | ❌ Skip | Unnecessary complexity |
| **NOT NEEDED** | ~~Kubernetes~~ | — | ❌ Skip | Overkill |
| **NOT NEEDED** | ~~Jenkins / GitLab CI~~ | — | ❌ Skip | No CI/CD pipeline |
| **NOT NEEDED** | ~~PM2~~ | — | ❌ Skip | Use systemd instead |
| **NOT NEEDED** | ~~Container Registry~~ | — | ❌ Skip | No Docker = no registry |

---

## Reference Links

| Resource | URL |
|:---|:---|
| systemd Service Files | https://www.freedesktop.org/software/systemd/man/systemd.service.html |
| Gunicorn Deployment Docs | https://docs.gunicorn.org/en/stable/deploy.html |
| Alembic (DB Migration) | https://alembic.sqlalchemy.org/ |
| Netdata (Monitoring) | https://www.netdata.cloud/ |
| fail2ban | https://www.fail2ban.org/ |
| pgBackRest (Backup) | https://pgbackrest.org/ |
| uv (Python Package Manager) | https://astral.sh/uv/ |
| Gitea (Self-Hosted Git) | https://gitea.io/ |
| rsync Manual | https://linux.die.net/man/1/rsync |
| PostgreSQL pg_dump Docs | https://www.postgresql.org/docs/current/app-pgdump.html |
