# Manual Deployment Guide (UAT & PROD)

This guide explains how to deploy the BMAS Internal Web Application to an On-Premise Linux Server (UAT or PROD) without using Docker.

The application uses **Gunicorn** as the process manager and **Uvicorn** workers to handle asynchronous requests, all supervised by **Systemd**.

## Server Prerequisites
The target server (AlmaLinux 9) must have the following installed:
- Python 3.14
- NGINX 1.30.2 (for reverse proxy and SSL)
- PostgreSQL 17.10 (or network access to an internal PostgreSQL 17.10 DB)

## Step 1: Package the Release
On the Master/Lead developer's machine, navigate to the daily release folder that has been successfully tested.

```bash
cd /bmas-master-codebase/releases/YYYY-MM-DD_v1
tar -czf bmas_release.tar.gz .
```

## Step 2: Transfer and Extract
Transfer the `bmas_release.tar.gz` to the target server (UAT/PROD) via `scp`, `sftp`, or a secure internal method.

On the target server:
```bash
# Create the release directory (using today's date)
RELEASE_NAME="2026-06-11_v1"
sudo mkdir -p /opt/bmas-web/releases/${RELEASE_NAME}

# Extract the code
sudo tar -xzf bmas_release.tar.gz -C /opt/bmas-web/releases/${RELEASE_NAME}

# Update the "current" symlink to point to the new release
sudo ln -sfn /opt/bmas-web/releases/${RELEASE_NAME} /opt/bmas-web/current
```

## Step 3: Setup the Virtual Environment
Navigate to the new release directory and set up the Python virtual environment. This isolates the app's dependencies from the system.

```bash
cd /opt/bmas-web/current
python3 -m venv venv
source venv/bin/activate

# Install the required Python packages (including gunicorn and uvicorn)
pip install -r requirements.txt
deactivate
```

## Step 4: Environment Variables
Ensure the shared `.env` file exists and contains the correct production credentials. It should be located outside the release folders so it isn't overwritten.

```bash
sudo vi /opt/bmas-web/shared/.env
```
Example `.env`:
```ini
DB_HOST=localhost
DB_PASSWORD=SecureProdPassword!
SECRET_KEY=long-random-string
```

## Step 5: Database Migrations
If there are database schema changes, run the migrations using Alembic (if using FastAPI/SQLAlchemy) or Django.
```bash
cd /opt/bmas-web/current
source venv/bin/activate
alembic upgrade head
deactivate
```

## Step 6: Systemd Configuration (One-Time Setup)
Create a Systemd service file so Linux can manage the Gunicorn process, start it on boot, and restart it if it crashes.

```bash
sudo vi /etc/systemd/system/bmas.service
```

Add the following content:
```ini
[Unit]
Description=BMAS Internal Web Application
After=network.target postgresql.service

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/bmas-web/current
EnvironmentFile=/opt/bmas-web/shared/.env

# Gunicorn runs with 4 Uvicorn workers, binding to a Unix socket
ExecStart=/opt/bmas-web/current/venv/bin/gunicorn -w 4 -k uvicorn.workers.UvicornWorker --bind unix:/opt/bmas-web/shared/bmas.sock app.main:app

Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Step 7: Nginx Configuration (One-Time Setup)
Configure Nginx to act as a reverse proxy, forwarding requests to the Gunicorn Unix socket.

```bash
sudo vi /etc/nginx/sites-available/bmas
```

Add the following content:
```nginx
server {
    listen 80;
    server_name uat.bmas.internal;

    # Serve the React Frontend directly
    location / {
        root /opt/bmas-web/current/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Gunicorn
    location /api/ {
        proxy_pass http://unix:/opt/bmas-web/shared/bmas.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/bmas /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 8: Start the Application
Reload Systemd and restart the application to apply the new code.

```bash
sudo systemctl daemon-reload
sudo systemctl restart bmas
sudo systemctl status bmas
```

The application is now deployed and running on the On-Premise server!
