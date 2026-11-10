# Nginx Recommendation: Reverse Proxy & Web Server for On-Premise Banking Internal Web

## Role of Nginx in Your Architecture

Nginx is the **single entry point** that ties your entire stack together. It serves two critical functions:

| Function | What It Does |
|:---|:---|
| **Static File Server** | Serves your React production build (`dist/`) directly to the browser |
| **Reverse Proxy** | Forwards `/api/*` requests to your Python backend (Gunicorn + Uvicorn) |

```
┌──────────┐      ┌───────────────────────────────────────┐
│  Browser  │─────▶│              Nginx 1.30.2              │
│           │      │                                       │
│           │      │  GET /            → React static files │
│           │      │  GET /api/*       → Gunicorn:8000      │
│           │      │                                       │
│           │      │  + SSL/TLS termination                 │
│           │      │  + Security headers                    │
│           │      │  + Rate limiting                       │
│           │      │  + Access logging (audit trail)        │
└──────────┘      └───────────────────────────────────────┘
```

---

## Recommended Version & Support Status

### Nginx Open Source (Recommended for Most Deployments)

| Item | Details |
|:---|:---|
| **Recommended Version** | **1.30.2** (Stable) |
| **Released** | May 22, 2026 |
| **Alternative** | **1.31.1** (Mainline — latest features) |
| **License** | 2-clause BSD |
| **Maintenance Status** | ✅ **Actively maintained** |
| **Estimated End-of-Support** | ~April 2027 (when 1.32 stable replaces it) |
| **Official Site** | [nginx.org](https://nginx.org/) |
| **GitHub** | [github.com/nginx/nginx](https://github.com/nginx/nginx) |
| **Download** | [nginx.org/en/download.html](https://nginx.org/en/download.html) |
| **Changelog** | [nginx.org/en/CHANGES](https://nginx.org/en/CHANGES) |
| **Linux Packages** | [nginx.org/en/linux_packages.html](https://nginx.org/en/linux_packages.html) |
| **EOL Tracker** | [endoflife.date/nginx](https://endoflife.date/nginx) |

> [!NOTE]
> Nginx 1.30.2 includes a critical **buffer overflow fix (CVE-2026-9256)** released on May 22, 2026. Always ensure you're on the latest patch of the stable branch.

---

## Understanding Nginx's Branch Model

Nginx uses a **two-branch model** that is different from most software:

| Branch | Current Version | Receives | Use Case |
|:---|:---|:---|:---|
| **Stable** (even: 1.30.x) | **1.30.2** | Security fixes & critical bugs only | ✅ **Recommended for production** |
| **Mainline** (odd: 1.31.x) | 1.31.1 | New features + all bug fixes | Development, testing, early adoption |

### Stable Branch Lifecycle (Annual Rotation)

A stable branch is retired when the next one is released (~every April):

| Stable Branch | Released | End of Life | Status (June 2026) |
|:---|:---|:---|:---|
| **1.26.x** | Apr 2024 | Apr 2025 | ❌ EOL |
| **1.28.x** | Apr 2025 | Apr 14, 2026 | ❌ EOL |
| **1.30.x** | Apr 14, 2026 | **~April 2027** (estimated) | ✅ **Current Stable** |
| **1.32.x** | ~Apr 2027 (projected) | ~Apr 2028 (projected) | 🔮 Future |

> [!IMPORTANT]
> **For banking:** Use the **Stable branch (1.30.x)**. It provides predictable, security-focused updates without the risk of new feature regressions. Subscribe to [nginx.org security advisories](https://nginx.org/en/security_advisories.html) for patch notifications.

---

## Open Source vs. Nginx Plus — Which Do You Need?

| Feature | Nginx Open Source (Free) | Nginx Plus (Paid) |
|:---|:---|:---|
| **Cost** | Free (BSD license) | ~$2,500–$5,000/instance/year |
| **Support** | Community only | 24/7 enterprise SLA from F5 |
| **Reverse Proxy** | ✅ Full | ✅ Full |
| **SSL/TLS Termination** | ✅ Full | ✅ Full |
| **Static File Serving** | ✅ Full | ✅ Full |
| **Load Balancing** | ✅ Basic (round-robin, least-conn, ip-hash) | ✅ Advanced (sticky sessions, slow-start) |
| **Health Checks** | Passive only | ✅ Active health checks |
| **Dynamic Config** | ❌ Requires reload | ✅ API-based, zero-reload |
| **Dashboard / Monitoring** | ❌ Use external tools | ✅ Built-in real-time dashboard |
| **WAF** | ❌ Use ModSecurity (free) | ✅ F5 WAF add-on |

> [!TIP]
> **Recommendation for internal banking web:** **Nginx Open Source is sufficient** for most internal web applications. You only need Nginx Plus if you require:
> - 24/7 vendor SLA (for regulatory/compliance reasons)
> - Active health checks for multi-backend load balancing
> - Zero-downtime dynamic upstream reconfiguration
>
> If your compliance team requires vendor-backed support, consider Nginx Plus or evaluate HAProxy (also enterprise-grade and open source).

---

## Platform Consideration: Linux vs Windows

> [!WARNING]
> **Nginx on Windows is classified as BETA and is NOT recommended for production.**
>
> The Windows version has significant limitations:
> - Uses `select()` instead of `epoll` — severely limits scalability
> - No native Windows service support — requires third-party wrappers (NSSM)
> - Missing modules (XSLT filter, image filter, GeoIP, embedded Perl)
> - Only one worker process handles traffic effectively

### Recommendation for On-Premise Production

| Approach | Recommendation |
|:---|:---|
| **Dedicated Linux server** | ✅ **Best option** — Ubuntu Server LTS or RHEL |
| **Linux VM on Windows host** (Hyper-V) | ✅ Good alternative if Linux server isn't possible |
| **Docker container on Windows** | ✅ Acceptable — runs Linux Nginx in container |
| **Native Nginx on Windows** | ❌ **Not recommended** for production |

---

## Production Installation (Linux)

### Recommended: Use Official Nginx Repository

Do **NOT** use the OS default repository — it often ships outdated versions. Use the official Nginx repo instead:

#### Ubuntu/Debian
```bash
# Install prerequisites
sudo apt install curl gnupg2 ca-certificates lsb-release ubuntu-keyring

# Import official Nginx signing key
curl https://nginx.org/keys/nginx_signing.key | gpg --dearmor \
    | sudo tee /usr/share/keyrings/nginx-archive-keyring.gpg >/dev/null

# Add official stable repository
echo "deb [signed-by=/usr/share/keyrings/nginx-archive-keyring.gpg] \
    http://nginx.org/packages/ubuntu $(lsb_release -cs) nginx" \
    | sudo tee /etc/apt/sources.list.d/nginx.list

# Install
sudo apt update
sudo apt install nginx
```

#### RHEL/CentOS/AlmaLinux
```bash
# Create repo file
sudo tee /etc/yum.repos.d/nginx.repo <<EOF
[nginx-stable]
name=nginx stable repo
baseurl=http://nginx.org/packages/centos/\$releasever/\$basearch/
gpgcheck=1
enabled=1
gpgkey=https://nginx.org/keys/nginx_signing.key
module_hotfixes=true
EOF

# Install
sudo yum install nginx
```

---

## Banking-Grade Nginx Configuration

Below is a production-ready Nginx configuration tailored for your banking internal web architecture:

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;               # Match CPU cores
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
    multi_accept on;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # ─── Logging (Audit Trail) ───
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    'upstream=$upstream_addr '
                    'response_time=$upstream_response_time';

    access_log /var/log/nginx/access.log main;

    # ─── Performance ───
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    gzip            on;
    gzip_types      text/plain text/css application/json
                    application/javascript text/xml;

    # ─── Security: Hide Nginx Version ───
    server_tokens off;

    # ─── Rate Limiting (Anti-Brute-Force) ───
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;

    # ─── Upstream: Python Backend ───
    upstream python_backend {
        server 127.0.0.1:8000;
        # If multiple backend servers:
        # server 10.0.1.10:8000;
        # server 10.0.1.11:8000;
    }

    # ─── Redirect HTTP → HTTPS ───
    server {
        listen 80;
        server_name internal-banking.example.com;
        return 301 https://$host$request_uri;
    }

    # ─── Main HTTPS Server ───
    server {
        listen 443 ssl http2;
        server_name internal-banking.example.com;

        # ─── SSL/TLS (Banking-Grade) ───
        ssl_certificate     /etc/ssl/certs/banking.crt;
        ssl_certificate_key /etc/ssl/private/banking.key;
        ssl_protocols       TLSv1.2 TLSv1.3;
        ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers on;
        ssl_session_cache   shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_stapling        on;
        ssl_stapling_verify on;

        # ─── Security Headers ───
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
        add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self';" always;

        # ─── React Frontend (Static Files) ───
        location / {
            root /var/www/frontend/dist;
            index index.html;
            try_files $uri $uri/ /index.html;   # SPA client-side routing

            # Cache static assets aggressively
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }

        # ─── Python API Backend ───
        location /api/ {
            limit_req zone=api_limit burst=20 nodelay;

            proxy_pass http://python_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 60s;
            proxy_connect_timeout 10s;
        }

        # ─── Login Endpoint (Extra Rate Limiting) ───
        location /api/auth/login {
            limit_req zone=login_limit burst=3 nodelay;

            proxy_pass http://python_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # ─── Block Sensitive Paths ───
        location ~ /\. { deny all; }
        location ~ ~$  { deny all; }
    }
}
```

---

## Security Checklist for Banking

> [!CAUTION]
> **Mandatory security practices for banking on-premise deployment:**

| # | Practice | Implementation |
|:---|:---|:---|
| 1 | **TLS 1.2+ only** | `ssl_protocols TLSv1.2 TLSv1.3;` |
| 2 | **HSTS** | `Strict-Transport-Security` header with `includeSubDomains` |
| 3 | **Hide version** | `server_tokens off;` |
| 4 | **OCSP Stapling** | `ssl_stapling on;` |
| 5 | **Rate limiting** | `limit_req_zone` for API and login endpoints |
| 6 | **Security headers** | CSP, X-Frame-Options, X-Content-Type-Options, etc. |
| 7 | **Non-root user** | Run Nginx worker processes as `nginx` user (not root) |
| 8 | **Firewall** | Allow only ports 80/443; block direct access to port 8000 |
| 9 | **SELinux/AppArmor** | Enable in enforcing mode on production servers |
| 10 | **Centralized logging** | Send access/error logs to SIEM (Splunk, ELK Stack) |
| 11 | **Config testing** | Always run `nginx -t` before reload |
| 12 | **Automated patching** | Subscribe to [nginx.org/en/security_advisories.html](https://nginx.org/en/security_advisories.html) |

---

## Complete Stack Summary

Here's how Nginx fits into your full technology stack:

| Layer | Technology | Version | End of Support |
|:---|:---|:---|:---|
| **Reverse Proxy / Web Server** | **Nginx (Stable)** | **1.30.2** | ~April 2027 |
| **Frontend Framework** | React | 19.2.7 | No formal EOL |
| **Frontend Build Tool** | Node.js LTS | 24.16.0 | April 30, 2028 |
| **Backend Runtime** | Python | 3.12 or 3.13 | Oct 2028 / Oct 2029 |
| **App Server (WSGI)** | Gunicorn | 26.0.0 | No formal EOL |
| **App Server (ASGI)** | Uvicorn | 0.49.0 | No formal EOL |

### Production Request Flow
```
Browser
  │
  ▼
Nginx 1.30.2 (port 443, SSL/TLS)
  │
  ├── GET /              → serves React static files from /var/www/frontend/dist
  ├── GET /assets/*.js   → serves with 1-year cache headers
  │
  └── POST /api/*        → proxy_pass to Gunicorn + Uvicorn (port 8000)
                              │
                              ▼
                          Python Backend (FastAPI / Django)
                              │
                              ▼
                          Database
```

---

## Reference Links

| Resource | URL |
|:---|:---|
| Nginx Official Site | https://nginx.org/ |
| Nginx Download | https://nginx.org/en/download.html |
| Nginx Linux Packages | https://nginx.org/en/linux_packages.html |
| Nginx Changelog | https://nginx.org/en/CHANGES |
| Nginx Security Advisories | https://nginx.org/en/security_advisories.html |
| Nginx GitHub | https://github.com/nginx/nginx |
| Nginx Documentation | https://nginx.org/en/docs/ |
| Nginx EOL Tracker | https://endoflife.date/nginx |
| Nginx Plus (Commercial) | https://www.nginx.com/products/nginx/ |
| Nginx vs Nginx Plus | https://www.nginx.com/products/nginx/compare-models/ |
| F5 (Parent Company) | https://www.f5.com/ |
