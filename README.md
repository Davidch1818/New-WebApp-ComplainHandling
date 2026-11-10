# New Internal Web

An internal corporate portal utilizing a scalable, microservices-based architecture deployed on an On-Premise Linux environment. It encompasses User Access Management (UAM), Customer Handling, and 4 Reconciliation Engines.

## Tech Stack
* **Frontend**: Vite + React SPA, Vanilla CSS, React Router (Single Internal Portal)
* **Backend**: Python Microservices, PostgreSQL (Shared Database), Local NAS (Storage)
* **Security (SAST)**: Bandit (Python Foundation Standard), npm audit (Node.js Foundation Standard)
* **Deployment**: Systemd (Gunicorn/Uvicorn), Nginx

## Documentation

* 🏛️ **[System Architecture](new-comphand_webapp/docs/architecture.md)**: Core design, microservices setup, and CI/CD lifecycle.
* 🗄️ **[Database Schema Registry](new-comphand_webapp/docs/db-schema-registry.md)**: PostgreSQL staging and exception tables for all modules.
