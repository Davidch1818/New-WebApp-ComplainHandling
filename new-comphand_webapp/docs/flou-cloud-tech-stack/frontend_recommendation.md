# Frontend Recommendation: React & Node.js for On-Premise Banking Internal Web

## Key Clarification: The Role of Node.js in Your Frontend

Before diving into versions, it's critical to understand **how** Node.js relates to your React frontend, because it's different from how Python/Gunicorn relate to your backend:

| Phase | Node.js Needed? | Why |
|:---|:---|:---|
| **Development** | ✅ Yes | Running dev server, hot-reload, linting, testing |
| **Build** | ✅ Yes | Compiling React → optimized static files (HTML/CSS/JS) |
| **Production Runtime** | ❌ **No*** | React builds into **static files** served by Nginx — no Node.js runtime needed |

> [!IMPORTANT]
> **For a "pure web app" (SPA) served on-premise, Node.js is a build-time dependency only.** Your production server does NOT need Node.js installed. You build the React app on your CI/CD pipeline, and deploy the resulting static `dist/` folder to Nginx.
>
> \* *Exception: If you use Next.js with Server-Side Rendering (SSR), you WILL need Node.js at runtime. For a pure client-side React SPA, you do not.*

---

## Recommended Versions & Support Status

### React

| Item | Details |
|:---|:---|
| **Latest Version** | **19.2.7** |
| **Released** | June 1, 2026 |
| **Node.js Requirement** | Node.js ≥ 18 (for build tooling) |
| **License** | MIT |
| **Maintenance Status** | ✅ **Actively maintained** by Meta (Facebook) |
| **End-of-Support** | ⚠️ No formal EOL schedule (see lifecycle note below) |
| **npm** | [npmjs.com/package/react](https://www.npmjs.com/package/react) |
| **Official Site** | [react.dev](https://react.dev/) |
| **GitHub** | [github.com/facebook/react](https://github.com/facebook/react) |
| **Changelog** | [github.com/facebook/react/releases](https://github.com/facebook/react/releases) |

#### React Version Lifecycle

React does **not** follow a traditional EOL schedule like Node.js or Python. Instead:

| Version | Status (June 2026) | Support Level |
|:---|:---|:---|
| **React 19.x** | ✅ **Current / Active** | All updates: features, bug fixes, security |
| **React 18.x** | ⚠️ Security-only | Critical security patches backported if needed |
| **React 17.x & older** | ⚠️ Security-only | Critical security patches only |

> [!NOTE]
> **For new banking projects in 2026, use React 19.x.** It includes the React Compiler (automatic performance optimization), built-in form Actions, and hardened TypeScript types — all beneficial for enterprise apps.

#### Key Features in React 19 (Enterprise Relevant)
- **React Compiler** — Automatically optimizes re-renders (replaces manual `useMemo`/`useCallback`)
- **Server Components** — Reduce bundle size by moving logic server-side
- **Built-in Actions & `useActionState`** — Simplified form handling (reduces boilerplate)
- **Improved TypeScript support** — Better type safety for large codebases

---

### Node.js

| Item | Details |
|:---|:---|
| **Recommended Version** | **24.16.0 LTS** ("Krypton") |
| **Alternative** | **22.22.3 LTS** ("Jod") |
| **License** | MIT |
| **Official Site** | [nodejs.org](https://nodejs.org/) |
| **GitHub** | [github.com/nodejs/node](https://github.com/nodejs/node) |
| **Release Schedule** | [nodejs.org/en/about/previous-releases](https://nodejs.org/en/about/previous-releases) |
| **EOL Tracker** | [endoflife.date/nodejs](https://endoflife.date/nodejs) |

#### Node.js LTS Lifecycle (with Formal EOL Dates)

Unlike React, Node.js has a **strict, published release schedule** with hard EOL dates:

| Version | Codename | Status (June 2026) | End of Life | Recommendation |
|:---|:---|:---|:---|:---|
| **Node.js 20** | Iron | ❌ **EOL (April 30, 2026)** | April 30, 2026 | ⛔ Do NOT use — no longer supported |
| **Node.js 22** | Jod | ✅ Maintenance LTS | **April 30, 2027** | ✅ Safe for existing projects |
| **Node.js 24** | Krypton | ✅ **Active LTS** | **April 30, 2028** | ✅ **Recommended for new projects** |

> [!WARNING]
> **Node.js 20 reached End-of-Life on April 30, 2026.** If your development/CI machines still use Node.js 20, migrate immediately. It no longer receives security patches.

> [!IMPORTANT]
> **Recommendation for banking:** Use **Node.js 24 LTS** for new projects (supported until April 2028). If you have existing tooling on Node.js 22, it's safe until April 2027, but plan migration to 24.

---

## Production Architecture: On-Premise Banking Frontend

Since your solution is a **pure web app on-premise** (not SSR/Next.js), here is the recommended architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        BUILD PIPELINE (CI/CD)                          │
│                                                                        │
│   Developer → Git Push → CI Server (Node.js 24 installed)             │
│                              │                                         │
│                         npm ci && npm run build                        │
│                              │                                         │
│                         dist/ folder (static HTML/CSS/JS)             │
│                              │                                         │
│                         Deploy to Nginx server                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     PRODUCTION SERVER (No Node.js needed)              │
│                                                                        │
│  ┌──────────┐      ┌──────────────────┐      ┌───────────────────┐    │
│  │  Client   │─────▶│  Nginx            │─────▶│  Python Backend    │   │
│  │ (Browser) │      │  - SSL/TLS        │      │  (Gunicorn +       │   │
│  │           │      │  - Serve static   │      │   Uvicorn Workers) │   │
│  │           │      │    React build    │      │                    │   │
│  │           │      │  - Proxy /api/*   │      │  (FastAPI/Django)  │   │
│  └──────────┘      └──────────────────┘      └───────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Nginx Configuration for React SPA + Python API

```nginx
server {
    listen 443 ssl;
    server_name internal-banking.example.com;

    # SSL/TLS Configuration
    ssl_certificate     /etc/ssl/certs/banking.crt;
    ssl_certificate_key /etc/ssl/private/banking.key;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # Serve React static files
    location / {
        root /var/www/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;  # Required for SPA client-side routing

        # Cache static assets aggressively
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Proxy API requests to Python backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';" always;
}
```

---

## Build Tooling Recommendation

For a new React project in 2026, the recommended build tool is **Vite** (not Create React App, which is deprecated):

| Tool | Status | Recommendation |
|:---|:---|:---|
| **Create React App (CRA)** | ❌ Deprecated | Do not use for new projects |
| **Vite** | ✅ Recommended | Fast build, active maintenance, industry standard |
| **Next.js** | ✅ If you need SSR | Adds complexity; requires Node.js at runtime |

### Quick Start (Vite + React 19)

```bash
# On your development machine (Node.js 24 installed)
npm create vite@latest banking-frontend -- --template react-ts
cd banking-frontend
npm install
npm run dev     # Development
npm run build   # Production build → outputs to dist/
```

### Recommended `package.json` Pinning

```json
{
  "dependencies": {
    "react": "^19.2.7",
    "react-dom": "^19.2.7"
  },
  "devDependencies": {
    "vite": "^6.x",
    "typescript": "^5.x"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```

---

## Banking-Specific Security Considerations

> [!CAUTION]
> **Critical security practices for banking frontend:**

### 1. Dependency Security
- Run `npm audit` on every build to detect known vulnerabilities
- Use `npm ci` (not `npm install`) in CI/CD for deterministic, reproducible builds
- Consider tools like **Snyk** or **Socket** for deep dependency scanning
- Pin exact versions in `package-lock.json` and commit it to version control

### 2. Content Security Policy (CSP)
- Implement strict CSP headers via Nginx (shown above)
- Disallow `eval()` and inline scripts to prevent XSS attacks
- Whitelist only trusted domains for external resources

### 3. Authentication & Session
- Store auth tokens in **HTTP-only, Secure, SameSite=Strict cookies** (not localStorage)
- Implement **CSRF protection** on all state-changing API calls
- Use **short-lived access tokens** with refresh token rotation

### 4. Build Artifacts
- Never deploy `node_modules/` to production
- Strip source maps in production builds (or host them privately for debugging)
- Verify build integrity with checksums before deployment

---

## Summary of Recommendations

| Component | Recommended Version | Install / Download | End of Life |
|:---|:---|:---|:---|
| **React** | **19.2.7** | `npm install react@19.2.7` | No formal EOL (continuously updated) |
| **Node.js** (build only) | **24.16.0 LTS** | [nodejs.org](https://nodejs.org/) | April 30, 2028 |
| **Vite** (build tool) | Latest 6.x | `npm create vite@latest` | No formal EOL |
| **Nginx** (production) | Latest stable | OS package manager | N/A |

> [!TIP]
> **Key takeaway:** Node.js is only needed on your **CI/CD build server and developer machines**, not on your production web server. In production, Nginx serves the static React build output and proxies API calls to your Python backend (Gunicorn + Uvicorn). This is the simplest, most secure, and most performant architecture for an on-premise banking internal web application.

---

## Reference Links

| Resource | URL |
|:---|:---|
| React Official | https://react.dev/ |
| React npm | https://www.npmjs.com/package/react |
| React GitHub | https://github.com/facebook/react |
| React Releases | https://github.com/facebook/react/releases |
| React 19 Upgrade Guide | https://react.dev/blog/2024/12/05/react-19 |
| Node.js Official | https://nodejs.org/ |
| Node.js Release Schedule | https://nodejs.org/en/about/previous-releases |
| Node.js EOL Tracker | https://endoflife.date/nodejs |
| Node.js GitHub | https://github.com/nodejs/node |
| Vite Official | https://vite.dev/ |
| Vite GitHub | https://github.com/vitejs/vite |
| React EOL Tracker | https://endoflife.date/react |
| Nginx Official | https://nginx.org/ |
