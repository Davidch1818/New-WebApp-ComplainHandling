# Module: Master Data Management

> **CHANGELOG: CLEAN ROOM REVISION**
> - Removed Java/ZK specific references (`compMaster.zul`, `CompMasterVM.java`, `MasterBo.java`).
> - Abstracted system to a standard REST CRUD API architecture.
> - Formalized referential integrity constraints requiring active complaint cross-checks before master data deletion.

## 1. Module Overview
The Master Data Management module acts as the foundational dictionary for the system. It governs the reference entities required to accurately categorize and route customer complaints, including geographic data, channel sources, and the rigid classification codes (Codes 601-605) mapping products to problem types.

## 2. Local Functional Flows & Scenarios
- **Managing Reference Data:**
  - *Action:* The System Administrator navigates to the master settings dashboard in the Next.js frontend and adds a new Bank Branch, a new communication Channel, or an updated Problem Category Code.
  - *Outcome:* The frontend sends a `POST` or `PUT` request to the backend. Once successful, the new reference item is immediately available for selection via `GET` endpoints by CS Agents when registering complaints.

## 3. Local Technical Flows & Data Life Cycle
- **UI Components:** Next.js administrative dashboard views dynamically generating forms based on the data entity being managed.
- **API Endpoints (Examples):**
  - `GET /api/master-data/branches`
  - `POST /api/master-data/branches`
  - `PUT /api/master-data/branches/{id}`
  - `DELETE /api/master-data/branches/{id}`
- **State Management:** 
  - Directly manages tables/entities such as `BRANCH`, `CHANNEL`, `CITY`, `PRODUCT_CODES`, and `PROBLEM_CODES`.
  - **Relational Integrity Constraint:** Enforces strict referential integrity. The API backend must verify if any active or pending complaints reference a master data ID before allowing a deletion. If dependencies exist, the API must return a `409 Conflict` error and block the deletion (or enforce a soft-delete).

## 4. Interface & Dependencies
- **Inbound Dependencies:**
  - Administrator UI inputs (JSON payloads) for configuration updates.
- **Outbound Dependencies:**
  - **Complaint Management Module:** Consumes real-time lookup lists (Branch, Channel, Codes) required for payload validation and form rendering on the frontend.
  - **Reporting & Auditing Module:** Consumes descriptive labels for foreign keys during report generation to convert database IDs into human-readable strings.
