# Clean Room Audit & Rewrite Plan

This document outlines the strategy for conducting the "Clean Room" audit of the `/docs` directory to prepare for a Next.js (Frontend) and Python (Backend) migration.

## Goal
To rewrite the legacy architectural documentation so that a future team can implement the new system using ONLY the markdown files, with zero access to the Java/ZK/Oracle legacy source code. We must ensure 100% functional parity by extracting implicit business rules, constraints, and data contracts while removing legacy terminology.

## Proposed Strategy & Changes

### 1. Abstract the Implementation, Keep the Functionality
We will eliminate all references to legacy technology. The functional intent will be rewritten in a technology-agnostic manner.
- **Remove:** ZK Framework, `.zul` files, Hibernate, Java ViewModels (`CompHandVM.java`, `ComphandBoImpl.java`), JAX-WS Web Services.
- **Replace with:** Universal architectural concepts such as "Frontend UI Components", "API Endpoints (REST/GraphQL)", "JSON Payloads", "Database Transactions", and "Service Layer Logic".

### 2. Identify Hidden Logic & Clarify Business Rules
We will extract implicit logic found in the Java codebase (e.g., in ViewModels and Constraint validators) and make them explicit in the docs:
- **Validation Rules:** Explicitly document validation constraints, such as mandatory fields, date validation checks (`CheckDateConstraint`), and file upload requirements (e.g., strict PDF MIME-type validation, file existence checks before deletion).
- **Maker-Checker Logic:** Explicitly define the constraint `USER_INPUT != USER_OTOR` and outline how state transitions happen between staging queues and main databases.
- **Error Handling:** Document the expected system behavior when exceptions or invalid states occur.

### 3. Verify Data Contracts
We will update the data architecture documentation to explicitly define the expected data structures:
- Document exhaustive JSON API payloads for requests (e.g., Create Complaint, Approve Complaint).
- Define clear data types, nullability, and relationships without relying on Java/Hibernate ORM specific annotations.

## File-by-File Rewrite Plan

---

### System Architecture (`system-architecture.md`)
- **[MODIFY]** Remove all references to ZK framework, `.zul` files, Java, MVVM, and JAX-WS.
- **[MODIFY]** Rewrite the "Technical Architecture & Data Flow" section to describe a generic Next.js Frontend calling a Python REST API.
- **[MODIFY]** Update sequence diagrams to reflect Frontend -> API Gateway -> Backend Service -> Database interactions.

### Data Architecture (`data_architecture.md`)
- **[MODIFY]** Remove references to Hibernate, JPA, and Java `.properties`/`.xml` files.
- **[MODIFY]** Detail the expected database schema in a universal format (e.g., PostgreSQL/Generic SQL).
- **[MODIFY]** Explicitly document the JSON structure/schema required for configuration management, completely removing the "Java constants" context.

### Authorization Workflow (`authorization_workflow_spec.md`)
- **[MODIFY]** Replace ZK UI views (`compOtor.zul`) and Java classes (`CompHandVM.java`, `ComphandBo.java`) with generic API endpoints (e.g., `POST /api/authorization/approve`).
- **[MODIFY]** Clarify the transactional boundary: what exactly happens if the migration from the staging table to the active table fails.

### Complaint Management (`complaint_management_spec.md`)
- **[MODIFY]** Remove ZK framework specifics and Java method calls.
- **[MODIFY]** Add explicitly discovered validation logic (e.g., date constraints, exact file type validations like application/pdf, file size limits if any).
- **[MODIFY]** Specify the exact JSON payload contract required for submitting a new complaint.

### Master Data Management (`master_data_spec.md`)
- **[MODIFY]** Remove Java/ZK specific references (`compMaster.zul`, `CompMasterVM.java`).
- **[MODIFY]** Define the CRUD API contracts necessary for managing Reference Data.

### Reporting & Auditing (`reporting_auditing_spec.md`)
- **[MODIFY]** Remove references to `.zul` dashboards and Java BO classes.
- **[MODIFY]** Define the exact structure of the audit log payload (`System_Logs`) and the triggering conditions.

## Verification Plan

### Manual Verification
- Review the rewritten markdown files to ensure no Java, ZK Framework, or Hibernate terminology remains.
- Verify that a developer reading only the updated documentation can understand the precise API endpoints, data models, and business logic constraints necessary to build the system in Next.js and Python.
