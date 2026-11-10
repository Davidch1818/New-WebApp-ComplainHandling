# Developer Workflow (No Version Control)

Since we are operating without a centralized Version Control System (like GitLab or GitHub), we rely entirely on **strict folder separation** and a **manual End-of-Day (EOD) integration process**.

This document outlines the rules and daily steps every developer must follow to avoid overwriting each other's work.

> [!WARNING]
> **Highly Recommended - Local Git:** Even though there is no central server, you should run `git init` inside your local program folder (e.g., `programs/comphand`). This acts as a safety net allowing you to undo mistakes and see exactly what changed locally.

## The Golden Rules

1. **The 4 Dev Rule:** You are assigned to ONE specific folder under `programs/` (e.g., `programs/comphand/`). You must **NEVER** edit files in another developer's program folder.
2. **Core Shared Logic:** The `/core_shared/` directory contains logic used by everyone (database connections, storage setup, auth). Only the **Lead Developer** is allowed to modify files in this directory. If you need a change here, request it from the Lead.
3. **No Direct Interactions:** Your module should not import code directly from another developer's module (e.g., `comphand` should not import from `reconcile`). Any shared code goes into `core_shared`.

## The Daily Routine

### 1. Morning Checkout
At the start of the day, copy the latest "Golden Master" codebase to your local machine.
1. Access the shared network drive or server where `/bmas-master-codebase` is stored.
2. Find the latest release inside `/releases/` (e.g., `/releases/2026-06-11_v1/`).
3. Copy this entire folder to your local machine and rename it to `bmas-local-dev`.

### 2. Local Development
1. Open your terminal and navigate to your assigned folder:
   ```bash
   cd bmas-local-dev/programs/comphand
   ```
2. Activate your Python virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
3. Make your code changes and run your local tests against your local PostgreSQL instance.

### 3. End-of-Day (EOD) Manual Merge
At a designated time every day (e.g., 4:00 PM), development stops, and the Lead Developer performs the merge.

**Lead Developer Steps:**
1. Create a new release folder for the day on the shared drive: `/bmas-master-codebase/releases/YYYY-MM-DD_v1/`.
2. Copy the base files (like `frontend/` and `core_shared/`) into this new folder.
3. Call each developer one by one.

**Developer Steps (When called by the Lead):**
1. Copy **only your specific folder** (e.g., `programs/comphand/`) from your local machine into the new daily release folder on the shared drive: `/bmas-master-codebase/releases/YYYY-MM-DD_v1/programs/comphand/`.
2. Do not copy your `venv/` folder or local `.env` files.

### 4. Integration Testing
Once all 4 developers have copied their folders, the Lead Developer:
1. Runs a fresh `pip install` on the merged folder.
2. Starts the application locally.
3. Runs a smoke test to ensure nothing broke.
4. If successful, this folder becomes the new "Golden Master" for the next day, and is packaged for deployment to UAT.
