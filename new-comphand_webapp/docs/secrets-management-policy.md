# Secrets Management Policy (On-Premise Deployment)

This document outlines the strict Standard Operating Procedure (SOP) for handling production credentials, database passwords, and environment variables across all BMAS Internal Web deployments.

## The "Shared Directory" Strategy

**Rule:** Production `.env` files are **never** to be placed inside the application's source code folders (`/opt/bmas-web/current/` or `/opt/bmas-web/releases/`). 

They must be isolated in a dedicated shared directory on the target Linux server.

### 1. Server Configuration
On the UAT and PROD Linux servers, administrators must create a single, persistent `.env` file at the following path:
```bash
/opt/bmas-web/shared/.env
```

### 2. Permission Lockdown
This file must be locked down immediately upon creation so that only the service runner (e.g., `www-data`) and `root` can read it.
```bash
sudo chown www-data:www-data /opt/bmas-web/shared/.env
sudo chmod 600 /opt/bmas-web/shared/.env
```
*Rationale: If an unauthorized user gains standard SSH access, they cannot read the database passwords.*

### 3. Systemd Injection
The application does not read the `.env` file directly from its working directory. Instead, the Linux `systemd` supervisor is configured to securely inject the file's contents into the application's memory on startup.

In `/etc/systemd/system/bmas.service`:
```ini
[Service]
# ...
WorkingDirectory=/opt/bmas-web/current
EnvironmentFile=/opt/bmas-web/shared/.env
ExecStart=/opt/bmas-web/current/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker ...
```
*Rationale: This completely decouples secret management from the application code.*

## Developer Guidelines

1. **Local Development:** Developers should maintain their own local `.env` files.
2. **Git Ignore:** The `.env` and `.env.*` files are explicitly listed in `.gitignore`. **NEVER force-commit a `.env` file.**
3. **Template:** If adding new environment variables, developers must update the `.env.example` file with dummy values (e.g., `DB_PASS=your_password_here`) to inform the IT Security/DevOps team that a new variable is required in UAT/PROD.
4. **No Hardcoding:** Under no circumstances should passwords, API keys, or security tokens be hardcoded into Python files or React components.
