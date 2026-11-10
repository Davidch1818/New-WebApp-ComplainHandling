# On-Premise Project Structure & Workflow

This project is deployed on an On-Premise Linux environment and uses a partitioned directory structure designed to support 4 parallel developers working on 4 separate programs without a centralized Version Control System.

## Folder Structure

```text
/bmas-master-codebase
├── docs/                    # System Documentation
│   ├── architecture.md      # Core system architecture
│   ├── db-schema.md         # PostgreSQL staging and exception tables
│   ├── manual-deployment-guide.md # How to deploy on UAT/PROD
│   ├── developer-workflow.md# Daily developer rules and merge steps
│   ├── comphand/            # Customer complaint handling documentation
│   ├── payroll/             # Payroll documentation
│   ├── lld/                 # LLD documentation
│   └── reconcile/           # Reconciliation documentation
│
├── .agents/                 # AI Assistant Configuration
│   ├── rules/               # AI Workflows (Security, TDD, Code Review)
│   └── skills/              # Specialized agent capabilities and workflow instructions
│
├── frontend/                # Vite + React SPA (Single Internal Portal)
│   ├── src/                 
│   │   ├── components/      # Shared UI elements
│   │   └── features/        # Modular UI (uam, comphand, reconcile, etc.)
│
├── core_shared/             # COMMON LIBRARIES: Shared across all modules
│   ├── auth.py              # JWT / Auth Logic
│   ├── storage_service.py   # Local server storage logic
│   └── db_core.py           # Database connection and models
│
├── programs/                # THE SEPARATED DEVELOPER PROGRAMS
│   ├── comphand/            # DEV 1 (Customer Complaints)
│   ├── reconcile/           # DEV 2 (Reconciliation Engines)
│   ├── lld/                 # DEV 3 (LLD Service)
│   └── payroll/             # DEV 4 (Payroll Service)
│
├── releases/                # The Daily Merged Golden Master
│   ├── 2026-06-11_v1/       # End-of-Day integrated build
│   └── 2026-06-12_v2/
│
└── GEMINI.md                # Global AI Behavior Rules (Quality & Security Checks)
```

## Core Principles
1. **Never Duplicate Code:** If multiple services need the same logic (like auth or database connection), put it in the `core_shared/` folder. Only the Lead Developer should modify this folder.
2. **Total Isolation (The 4 Dev Rule):** A developer assigned to `programs/comphand/` must **NEVER** modify files inside `programs/reconcile/`. This prevents conflict during the manual End-of-Day merge.
3. **Local Testing:** Each developer builds and tests locally using Python `venv` and a local PostgreSQL instance.
4. **End of Day Integration:** All 4 programs are copied into a daily release folder inside `releases/` by the Lead Developer. This merged folder is tested and then packaged for deployment.
