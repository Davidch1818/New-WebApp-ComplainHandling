# Reconciliation System Architecture

This system provides a highly scalable reconciliation engine deployed on an On-Premise Linux environment. It dynamically compares Bank Core transactions against distinct third-party systems.

## 1. Core Architecture
The system uses a partitioned directory structure where shared libraries (Database, File Storage) are utilized by separate program modules.

- **Frontend:** A highly performant Vite + React Single Page Application (SPA) providing a dedicated Dashboard exclusively for the Reconciliation Modules. Styled with custom Vanilla CSS for maximum maintainability.
- **Backend Services:** Independent Python modules (e.g., BiFast Engine, Visa Engine) managed by Gunicorn and Uvicorn workers via Systemd.
- **Database:** A shared PostgreSQL database holding staging and final result tables.
  - *Strategy:* **DEV** runs local PostgreSQL instances, while **UAT/PROD** connect directly to the central on-premise PostgreSQL server by configuring the `.env` variables (`DB_HOST`, `DB_PASSWORD`).
- **Storage:** Local Server Storage (NAS or shared disk) for archiving uploaded raw files and generated Excel reports.

### 1.1 Process Management Strategy
On the Linux server, the Frontend and Backend are managed efficiently:
1. **Frontend Delivery:** The React SPA is built into static files and served directly by Nginx, ensuring high performance.
2. **Backend Concurrency:** Gunicorn acts as the process manager, spawning Uvicorn ASGI workers to handle intensive asynchronous file processing tasks concurrently.
3. **Security Boundaries:** Nginx acts as a reverse proxy, handling SSL termination and routing external traffic, while Gunicorn listens only on internal Unix sockets.

## 2. The Reconciliation Lifecycle
Regardless of which third-party is being reconciled, the system follows a standard 6-step lifecycle:

1. **Upload Phase:** User uploads the Core file and the Third-Party file via the UI. Files are immediately backed up to local secure storage.
2. **Routing:** The system routes the files to the correct module based on the selected third-party type.
3. **Pre-processing:** The specific module parses, cleanses, and inserts the data into the shared staging tables.
4. **Primary Auto-Match:** The module runs its specific matching logic (defined in `docs/modules/`). 
5. **Exception Handling:** Unmatched transactions are flagged and presented to the UI for manual "Sinkron" review.
6. **Reporting:** The module generates the final Excel output containing MATCH, CORE ONLY, and THIRD-PARTY ONLY sheets, uploads it to storage, and provides a download link.

## 3. Third-Party Modules
Because each third-party has completely different matching logic and file formats, their specific rules are documented in isolated module files:

*   [BiFast Rules](modules/bifast.md)
*   [PAC Jalin PLN Rules](modules/pac-jalin-pln.md)
*   [Prima QRIS Rules](modules/prima-qris.md)
*   [Telkom Rules](modules/telkom.md)

## 4. Deployment
For detailed deployment procedures and manual workflow strategies, please refer to:
*   [Developer Workflow](developer-workflow.md)
*   [Manual Deployment Guide](manual-deployment-guide.md)
