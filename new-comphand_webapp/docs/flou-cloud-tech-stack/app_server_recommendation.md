# App Server Recommendation: Gunicorn & Uvicorn for On-Premise Banking Internal Web

## Short Answer

**Yes, you need an application server.** Python's built-in development servers (e.g., `flask run`, `uvicorn main:app --reload`) are **not production-ready**. For an on-premise deployment, you need a proper WSGI/ASGI server to handle concurrency, process management, and reliability.

Which one (or both) depends on your Python web framework:

| Your Framework | Protocol | App Server Needed |
|:---|:---|:---|
| **Django / Flask** (sync) | WSGI | **Gunicorn** alone |
| **FastAPI / Starlette** (async) | ASGI | **Gunicorn + Uvicorn workers** (recommended) or Uvicorn standalone |
| **Django** with async views | ASGI | **Gunicorn + Uvicorn workers** |

---

## Recommended Versions & Support Status

### Gunicorn

| Item | Details |
|:---|:---|
| **Latest Version** | **26.0.0** |
| **Released** | May 5, 2026 |
| **Python Requirement** | Python ≥ 3.10 |
| **License** | MIT |
| **Maintenance Status** | ✅ **Actively maintained** – healthy release cadence |
| **End-of-Support** | ⚠️ No formal EOL schedule (community-driven, continuously updated) |
| **PyPI** | [pypi.org/project/gunicorn](https://pypi.org/project/gunicorn/) |
| **Official Site** | [gunicorn.org](https://gunicorn.org/) |
| **GitHub** | [github.com/benoitc/gunicorn](https://github.com/benoitc/gunicorn) |
| **Changelog** | [docs.gunicorn.org/en/latest/news.html](https://docs.gunicorn.org/en/latest/news.html) |

> [!NOTE]
> Gunicorn follows a community-driven open-source development model. There is **no formal end-of-life date** — it receives continuous updates. To ensure security, always pin and track the latest stable release.

#### Key Highlights in 26.0.0
- Native ASGI worker support (stable)
- HTTP/2 beta support
- Strict HTTP/1.1 validation (RFC 9112/9110) — important for banking security hardening
- `eventlet` worker class **removed** — use `gevent`, `gthread`, or `tornado` instead

---

### Uvicorn

| Item | Details |
|:---|:---|
| **Latest Version** | **0.49.0** |
| **Released** | June 3, 2026 |
| **Python Requirement** | Python ≥ 3.10 (supports 3.10, 3.11, 3.12, 3.13, 3.14) |
| **License** | BSD-3-Clause |
| **Maintenance Status** | ✅ **Actively maintained** – healthy release cadence |
| **End-of-Support** | ⚠️ No formal EOL schedule (community-driven, continuously updated) |
| **PyPI** | [pypi.org/project/uvicorn](https://pypi.org/project/uvicorn/) |
| **Official Site** | [uvicorn.dev](https://www.uvicorn.org/) |
| **GitHub** | [github.com/Kludex/uvicorn](https://github.com/Kludex/uvicorn) |
| **Changelog** | [uvicorn.dev/release-notes](https://uvicorn.dev/release-notes) |

> [!NOTE]
> Like Gunicorn, Uvicorn has **no formal end-of-life date**. It is an active open-source project under continuous development. Track the latest version for security patches.

---

## Python Version Compatibility & EOL

Since both Gunicorn 26.x and Uvicorn 0.49.x require **Python ≥ 3.10**, here are the Python end-of-life dates to factor into your planning:

| Python Version | End of Life | Status (as of June 2026) |
|:---|:---|:---|
| **3.10** | **October 31, 2026** | ⚠️ Security-only — **plan migration soon** |
| **3.11** | **October 31, 2027** | ✅ Security-only |
| **3.12** | **October 31, 2028** | ✅ Active bug-fix |
| **3.13** | **October 31, 2029** | ✅ Active bug-fix |
| **3.14** | **October 31, 2030** | ✅ Active (newest) |

> [!IMPORTANT]
> **Recommendation for banking:** Use **Python 3.14** for new projects to ensure long-term support through 2030.
>
> Reference: [Python Developer's Guide — Versions](https://devguide.python.org/versions/)

---

## Recommended Architecture for On-Premise Banking

Since you're deploying on **bare-metal/VM servers** (not container orchestration like Kubernetes), the recommended production stack is:

```
┌─────────────┐     ┌──────────────────────────────┐     ┌──────────────┐
│   Client     │────▶│   Nginx (Reverse Proxy)       │────▶│  Gunicorn     │
│  (Browser)   │     │   - SSL/TLS Termination       │     │  + Uvicorn    │
│              │     │   - Static Files              │     │    Workers    │
│              │     │   - Rate Limiting              │     │              │
│              │     │   - Request Buffering          │     │  (Your App)  │
└─────────────┘     └──────────────────────────────┘     └──────────────┘
```

### For ASGI Apps (FastAPI / async Django):

```bash
gunicorn -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000 main:app
```

- `-w 4` — Number of workers (rule of thumb: `2 × CPU cores + 1`)
- `-k uvicorn.workers.UvicornWorker` — Use Uvicorn's async worker class
- This gives you **Gunicorn's process management** + **Uvicorn's async performance**

### For WSGI Apps (Flask / sync Django):

```bash
gunicorn -w 4 -b 0.0.0.0:8000 myapp.wsgi:application
```

- Gunicorn alone is sufficient; Uvicorn is not needed

---

## Why Not Just Uvicorn Standalone?

| Concern | Uvicorn Standalone | Gunicorn + Uvicorn Workers |
|:---|:---|:---|
| **Process Crash Recovery** | ❌ App goes offline | ✅ Auto-restarts crashed workers |
| **Multi-core Utilization** | ❌ Single process | ✅ Spawns workers across CPU cores |
| **Graceful Restarts** | ❌ Requires manual handling | ✅ Built-in (HUP signal) |
| **Health Monitoring** | ❌ None | ✅ Worker heartbeat monitoring |
| **Production Battle-tested** | Limited | ✅ 15+ years in production |

> [!WARNING]
> For a **banking environment**, running Uvicorn standalone on a bare server is **not recommended**. A single process crash would take down your entire application. Always use Gunicorn as the process manager for production reliability.

---

## Banking-Specific Considerations

> [!CAUTION]
> **Security hardening for banking:**
> - Always place Nginx (or HAProxy) in front as a reverse proxy for SSL/TLS termination
> - Never expose Gunicorn/Uvicorn directly to the network
> - Use `--forwarded-allow-ips` to restrict trusted proxy IPs
> - Enable access logging for audit trails
> - Gunicorn 26.0.0's RFC 9112/9110 compliance adds protection against HTTP request smuggling attacks

### Recommended `requirements.txt` Pinning

```
gunicorn==26.0.0
uvicorn[standard]==0.49.0
```

Pin exact versions for reproducible deployments and audit compliance.

---

## Summary of Recommendations

| Component | Recommended Version | Install Command |
|:---|:---|:---|
| **Python** | 3.14 | — |
| **Gunicorn** | 26.0.0 | `pip install gunicorn==26.0.0` |
| **Uvicorn** | 0.49.0 (if using ASGI) | `pip install uvicorn[standard]==0.49.0` |
| **Nginx** | Latest stable | OS package manager |

---

## Reference Links

| Resource | URL |
|:---|:---|
| Gunicorn PyPI | https://pypi.org/project/gunicorn/ |
| Gunicorn Docs | https://docs.gunicorn.org/en/stable/ |
| Gunicorn GitHub | https://github.com/benoitc/gunicorn |
| Uvicorn PyPI | https://pypi.org/project/uvicorn/ |
| Uvicorn Docs | https://www.uvicorn.org/ |
| Uvicorn GitHub | https://github.com/Kludex/uvicorn |
| Uvicorn Changelog | https://uvicorn.dev/release-notes |
| Python EOL Schedule | https://devguide.python.org/versions/ |
| FastAPI Deployment Guide | https://fastapi.tiangolo.com/deployment/ |
| Django Deployment Checklist | https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/ |
