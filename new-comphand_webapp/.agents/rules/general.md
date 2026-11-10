---
description: General rules and router for the Bank Reconciliation System workspace.
activation: always_on
---

# Reconcile System Workspace Rules

This workspace contains a Bank Reconciliation System processing financial transactions for an Indonesian bank. **Reliability, accuracy, and security are non-negotiable.** 

## 1. Tech Stack Boundaries
- **System Blueprint:** Always refer to `docs/architecture.md` and `docs/db-schema-registry.md` for the approved Tech Stack (e.g., Python, PostgreSQL) and database structure. 
- **Database Schema Separation:** Strict separation is enforced. The shared core staging schema MUST be kept in `docs/db-schema-registry.md`. Microservice-specific schemas (e.g., BiFast tables) MUST be kept completely isolated within their respective module documentation (e.g., `docs/reconcile/`).
- **Monorepo Structure:** Review `docs/project-structure.md`. Never duplicate code across microservices. Put common logic in `core_shared/` and specific logic in `programs/<module>/`.
- **Constraint:** Do not introduce new technologies, frameworks, or dependencies without explicit permission from the Senior Engineer.

## 2. Security & Testing (Skill Router)
Instead of keeping redundant instructions here, this workspace uses strict workflow skills. When performing these tasks, you MUST invoke and follow the corresponding skill file:

- **For Security & PII:** When writing database queries, handling files, or dealing with potentially malicious inputs, follow `.agents/skills/security-and-hardening/SKILL.md`.
- **For New Logic & Bug Fixes:** When writing core logic, follow `.agents/skills/test-driven-development/SKILL.md`. Always check `docs/modules/` for specific third-party reconciliation rules.
- **For Reviewing Code:** When asked to review a PR or existing code, strictly follow `.agents/skills/code-review-and-quality/SKILL.md`.

## 3. Workflow Instructions
- **Documentation Sync:** Whenever you make changes to files or folders in the project, you MUST verify if the changes impact the overall system architecture or project structure. If they do, you are required to immediately update `docs/architecture.md`, `docs/project-structure.md`, `README.md`, and `frontend/README.md` to reflect the new state.
- **Security First:** Never log PII. Never hardcode secrets. Treat all files as untrusted.
- **Planning:** For complex features, use Planning Mode to generate an `implementation_plan.md` for review prior to writing code.
