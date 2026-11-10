# Module: Authorization Workflow

> **CHANGELOG: CLEAN ROOM REVISION**
> - Replaced ZK UI views (`compOtor.zul`) and Java classes (`CompHandVM.java`, `ComphandBo.java`) with generic API endpoints (e.g., `POST /api/authorization/approve`).
> - Clarified the transactional boundary: what exactly happens if the migration from the staging table to the active table fails.
> - Formally explicitly documented the `checker_id != maker_id` constraint.

## 1. Module Overview
The Authorization Workflow module enforces the strict Maker-Checker validation principle. It guarantees that no data mutation (Insert, Update, Delete) to a complaint takes effect without explicit approval from a designated Supervisor or Authorizer. It acts as the gatekeeper for the primary complaint database.

## 2. Local Functional Flows & Scenarios
- **Approving a Complaint (Scenario B):**
  - *Action:* The Supervisor (Checker) logs into the frontend application, reviews the queue of pending requests (new complaints or modifications) via the API. The Checker validates the uploaded PDF documents and clicks "Approve".
  - *Outcome:* The frontend sends a `POST` request to the backend. The pending record is finalized, transitioning into an active state in the main database.
- **Rejecting a Complaint Update (Scenario C):**
  - *Action:* The Supervisor identifies incomplete information in a pending request and clicks "Reject" on the frontend.
  - *Outcome:* The backend discards the draft request or flags it as returned, and the original active record in the main database remains unchanged.

## 3. Local Technical Flows & Data Life Cycle
- **UI Components:** Implemented as Next.js views and authorization dashboards rendering data fetched from the API.
- **API Endpoints:**
  - `GET /api/authorization/pending`: Fetches list of pending operations.
  - `POST /api/authorization/approve`: Accepts a payload `{ "request_id": "uuid", "action": "ADD|EDIT|DELETE" }`
  - `POST /api/authorization/reject`: Accepts a payload `{ "request_id": "uuid", "reason": "string" }`
- **Transactional State Management:** 
  - **Validation Constraint:** The backend must strictly validate `checker_id != maker_id` (`USER_INPUT != USER_OTOR`). A Maker cannot be their own Checker. Attempting to do so must return a `403 Forbidden`.
  - **Atomic Transaction Boundary:** 
    - The migration of data from the temporary staging table (`COMPLAINTS_STAGING`) into the active primary table (`COMPLAINTS`) must be wrapped in an atomic database transaction.
    - If the insertion to `COMPLAINTS` or the subsequent insertion into the `SYSTEM_LOGS` table fails, the transaction must rollback entirely, and the record must remain in `COMPLAINTS_STAGING`. The API should return a `500 Internal Server Error` in this scenario.

### Local Flowchart
```mermaid
flowchart TD
    E[(Staging Queue / COMPLAINTS_STAGING)] --> F[Supervisor Reviews Request]
    F --> G{Decision (approve/reject)}
    G -- Approve --> H{Atomic DB Transaction}
    H -- Success --> I[(Migrate to Main DB)]
    H -- Failure --> J[Rollback Transaction]
    G -- Reject --> K[Flag as Rejected / Discard]
    I --> L[Notify Auditing Module]
    K --> L
```

## 4. Interface & Dependencies
- **Inbound Dependencies:**
  - **Complaint Management Module:** Receives pending JSON data payloads requesting mutation to the primary database.
- **Outbound Dependencies:**
  - **Complaint Management Module:** Commits approved payloads into the `COMPLAINTS` core tables.
  - **Reporting & Auditing Module:** Sends authorization events (Approvals/Rejections), timestamp, and Checker IDs to the system logs.
