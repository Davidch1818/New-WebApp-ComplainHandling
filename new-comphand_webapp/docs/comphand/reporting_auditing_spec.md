# Module: Reporting & Auditing

> **CHANGELOG: CLEAN ROOM REVISION**
> - Removed references to ZK `.zul` dashboards (`compDashboard.zul`) and Java BO classes (`ComphandBo.java`).
> - Defined the exact structure of the audit log payload (`SYSTEM_LOGS`) and the strict triggering conditions across the API.
> - Abstracted report generation to independent GET endpoints.

## 1. Module Overview
The Reporting & Auditing module provides transparency, tracking, and analytical capabilities. It is responsible for compiling aggregated views of complaint resolutions (Reporting) and strictly recording every database mutation or user action across the system (Auditing).

## 2. Local Functional Flows & Scenarios
- **Generating Complaint Reports (Scenario D):**
  - *Action:* An Administrator or Supervisor requests a report filtered by a specific date range or keyword (e.g., unresolved complaints) on the Next.js frontend.
  - *Outcome:* The frontend calls the Reporting API. The backend aggregates active records, joins them with Master Data for descriptive labels, and exports a detailed JSON summary view or CSV file.
- **System Auditing (Background Process):**
  - *Action:* A CS Agent submits a draft, or a Supervisor approves a record (via the Complaint or Authorization API).
  - *Outcome:* The API backend transparently captures the timestamp, User ID, and the exact action taken, saving it as an immutable log entry in the database.

## 3. Local Technical Flows & Data Life Cycle
- **UI Components:** Implemented via Next.js dashboard charts and data tables.
- **API Endpoints:** 
  - **Reports:** `GET /api/reports/complaints?start_date=2026-01-01&end_date=2026-05-31`
  - **Auditing:** Handled internally via middleware or database triggers; generally not exposed to external `POST` requests to prevent tampering, though `GET /api/audit-logs` may exist for admins.
- **State Management:** 
  - **Auditing Constraint:** The `SYSTEM_LOGS` table is strictly append-only (immutable).
  - **Reporting:** Provides read-only, aggregated views derived from joining `COMPLAINTS` and Master tables.

### Data Contracts: Audit Log Trigger Payload
When an API mutation occurs, the following JSON structure represents the data that must be serialized into the `changed_fields_json` column of the `SYSTEM_LOGS` table:
```json
{
  "action_by": "USR_987",
  "activity_type": "UPDATE",
  "reference_id": "CMP_12345",
  "timestamp": "2026-05-31T16:00:00Z",
  "changes": {
    "settlement_date": {
      "old": "null",
      "new": "2026-05-30T00:00:00Z"
    },
    "amount": {
      "old": 0,
      "new": 500000
    }
  }
}
```

## 4. Interface & Dependencies
- **Inbound Dependencies:**
  - **Complaint Management API:** Triggers internal log functions when drafts are created or modified.
  - **Authorization Workflow API:** Triggers internal log functions when approvals and rejections occur.
  - **Master Data Module:** Interrogated during report generation to fetch human-readable labels to replace database IDs.
- **Outbound Dependencies:**
  - Exports aggregated data payloads to the frontend (Dashboards and exportable data files) for human consumption.
