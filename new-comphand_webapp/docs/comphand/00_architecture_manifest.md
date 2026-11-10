# Master Architecture Manifest

> **AGENT INSTRUCTION:** This is the root manifest. You MUST read and analyze this file first during every session to understand the system context before modifying any code or reading sub-modules.

## Table of Contents
- [system-architecture.md](#system-architecturemd)
- [data_architecture.md](#data_architecturemd)
- [master_data_spec.md](#master_data_specmd)
- [complaint_management_spec.md](#complaint_management_specmd)
- [authorization_workflow_spec.md](#authorization_workflow_specmd)
- [reporting_auditing_spec.md](#reporting_auditing_specmd)

## Source Code Location

All backend business logic and endpoints for this module reside in **`programs/comphand/`**.
Core shared utilities and the UAM integration reside in **`core_shared/`**.

## Module Summaries

### [system-architecture.md](./system-architecture.md)
**Domain:** System-Wide Overview  
**Functional Purpose:** Provides the high-level executive summary, user personas, and end-to-end scenarios for the Customer Complaint Handling System. It outlines the Maker-Checker workflow, defining how users interact with the system from initial draft submission to final supervisor approval.  
**Key Technical Interfaces:** Defines the Next.js Frontend and Python API separation, detailing frontend-to-backend REST API interaction sequence diagrams and the strict `maker_id != checker_id` authorization constraint.

### [data_architecture.md](./data_architecture.md)
**Domain:** Database Schema and Persistence  
**Functional Purpose:** Establishes the foundational data models, defining the core relational database schema, tables, and foreign-key relationships. It dictates the configuration architecture, establishing how connection strings and rigid workflow constants are managed externally.  
**Key Technical Interfaces:** Outlines the exact structures for `COMPLAINTS`, `COMPLAINTS_STAGING`, and `SYSTEM_LOGS` entities, along with the expected JSON configuration structure needed to run the backend environments.

### [master_data_spec.md](./master_data_spec.md)
**Domain:** Reference Data Management  
**Functional Purpose:** Acts as the foundational dictionary for the system, governing geographical, channel, and categorization codes necessary to properly classify complaints. It describes the administrative flows for adding and managing referential data.  
**Key Technical Interfaces:** Defines standard CRUD REST endpoints (e.g., `GET /api/master-data/branches`) and strict relational integrity constraints that prevent deletion of data actively referenced by pending or active complaints.

### [complaint_management_spec.md](./complaint_management_spec.md)
**Domain:** Complaint Lifecycle and Intake  
**Functional Purpose:** Serves as the core operational unit for capturing, editing, and routing customer complaints. It dictates how Customer Service agents bundle user details, dates, classifications, and supporting file attachments into pending staging queues.  
**Key Technical Interfaces:** Details the `multipart/form-data` JSON endpoints (`POST /api/complaints/draft`) and enforces explicit server-side validation rules such as strict `application/pdf` checking, date validation constraints, and physical file-existence verification.

### [authorization_workflow_spec.md](./authorization_workflow_spec.md)
**Domain:** Maker-Checker Security  
**Functional Purpose:** Enforces the Maker-Checker authorization boundary, acting as the system gatekeeper before any mutated data reaches the primary databases. It specifies how supervisors interact with pending queues to approve or reject proposed changes.  
**Key Technical Interfaces:** Documents the `POST /api/authorization/approve` endpoints and the required atomic database transaction boundary necessary when migrating data from the staging database into the primary database.

### [reporting_auditing_spec.md](./reporting_auditing_spec.md)
**Domain:** Observability and Analytics  
**Functional Purpose:** Guarantees absolute transparency and traceability by aggregating complaints for administrative reports and securely logging every database mutation. It details the background processes that track user interactions and field-level modifications.  
**Key Technical Interfaces:** Defines the read-only reporting `GET` API contracts and outlines the strict immutable JSON payload (`changed_fields_json`) that must be appended to the `SYSTEM_LOGS` table whenever any system state changes.

## Dependency Graph / Reading Order

To fully grasp the technical constraints and architectural intent of the system, AI agents and engineers should traverse the modules in the following hierarchical order:

1. **[`system-architecture.md`](./system-architecture.md)**: Read first to grasp the high-level intent, user personas, and frontend-to-backend boundaries.
2. **[`data_architecture.md`](./data_architecture.md)**: Read second to understand the database schemas, entity relationships, and configuration schemas before attempting to map any endpoints.
3. **[`master_data_spec.md`](./master_data_spec.md)**: Read third to comprehend how foundational classification dictionaries are managed and enforced.
4. **[`complaint_management_spec.md`](./complaint_management_spec.md)**: Read fourth to see how complaints are submitted into the system, serialized as JSON, and constrained by validation rules.
5. **[`authorization_workflow_spec.md`](./authorization_workflow_spec.md)**: Read fifth to learn how pending complaints from step 4 are safely transacted and approved into the active database.
6. **[`reporting_auditing_spec.md`](./reporting_auditing_spec.md)**: Read last to understand the strict logging requirements and reporting views that span the entire lifecycle of the data.
