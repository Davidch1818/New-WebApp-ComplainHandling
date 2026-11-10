# CI/CD Pipeline & Git Workflow Standards (BMAS Internal Web)

This document serves as the official operational manual for the Bank Maspion Internal Web project. It defines the automated deployment architecture on Huawei Cloud, the environment strategy, and the mandatory Git branching workflow for the development team.

## 1. Automated Pipeline Architecture

The project utilizes a single, unified pipeline (`.gitlab-ci.yml`) to manage code quality, security, and deployment across all environments. The pipeline acts as an automated enforcer, strictly validating code against the Bank's security standards before it is permitted to merge into the main branch.

### 1.1. Security and Code Quality Tooling
The pipeline enforces Static Application Security Testing (SAST) using industry-standard tools:
*   **Backend (Python):** `Bandit` is used to detect security vulnerabilities (e.g., hardcoded credentials, SQL injection). `flake8` enforces code readability.
*   **Frontend (React):** `npm audit` blocks vulnerable third-party libraries. `eslint` enforces UI coding standards.

## 4. Secrets Management (Local vs. Pipeline)

The bank strictly enforces the separation of application secrets (passwords, API keys) between developer laptops and the automated pipeline.

### 4.1. Local Development
Developers must store their database passwords and Huawei access keys in the `.env` file on their local laptops. 
*   **Critical Rule:** The `.env` file must **never** be committed to the Git repository. It is permanently excluded via `.gitignore`.

### 4.2. CI/CD Pipeline Variables
Because the `.env` file is blocked from Git, the pipeline cannot read it. 
For the pipeline to deploy to Huawei CCE, it requires the `$KUBECONFIG_CONTENT` credential.
*   **Critical Rule:** You must never hardcode production keys in `.gitlab-ci.yml`.
*   **Procedure:** You must log into the GitLab or Huawei CodeArts Web Console, navigate to **Settings > CI/CD > Variables**, and input the keys there. The pipeline will securely inject them into memory during the run and wipe them immediately afterward.

---

### 5. Path-Based Triggering (Monorepo Optimization)
To optimize Huawei Cloud computing costs and deployment speed, the pipeline utilizes path-based triggers. If a developer exclusively modifies the `services/uam/` directory, the pipeline will only build and deploy the UAM Docker image, safely ignoring the other un-modified microservices.

---

## 2. Environment Strategy

The BMAS Internal Web utilizes a streamlined 3-tier environment architecture. A separate "Pre-Prod" environment is excluded to optimize cloud costs, as the UAT environment is sufficient for internal application validation.

1.  **DEV (Local Environment):** Code is written and tested locally on the developer's laptop using `docker-compose`.
2.  **UAT (User Acceptance Testing - Huawei CCE):** The automated testing ground where business users validate new features. Code merged into the `main` branch is automatically deployed here.
3.  **PROD (Production - Huawei CCE):** The live system. Deployments are strictly controlled via manual approval upon tagging a release.

---

## 3. Git Branching & Workflow Standards

All developers must adhere to the following Git workflow. The `main` branch is strictly protected; no direct commits are allowed. All changes must be processed through Merge Requests (MR) and approved by the Tech Lead.

### 3.1. Initial Build Phase Standards (Pre-Go-Live)
During the initial development phase, before the system is live, developers must follow strict backup protocols to prevent data loss. 

*   **Rule 1: Daily Backup Commits.** Developers must **never** wait until the end of the build phase to commit code. At the end of every single workday, developers must commit and push their active feature branch to the remote Git server. Even if the code is broken or incomplete, pushing the branch ensures the bank has a backup.
*   **Rule 2: Feature-Complete Merging.** Developers should **not** merge broken code into the `main` branch daily. A Merge Request to `main` should only be opened when the specific feature/ticket is fully completed and tested locally.

*(Example: If a Login UI takes 3 days to build, the developer pushes their branch to the server on Day 1, Day 2, and Day 3. On Day 3, when it is finished, they open a Merge Request.)*

### 3.2. Standard Development Loop
1.  **Sync:** Developer checks out the `main` branch and pulls the latest stable code.
2.  **Branch:** Developer creates a dedicated feature branch (e.g., `git checkout -b feature/bifast-reconciliation`).
3.  **Develop:** Developer writes code and verifies it locally via `docker-compose`.
4.  **Commit & Push:** Developer pushes the branch to the remote repository.
5.  **Merge Request:** Developer opens an MR against the `main` branch.
6.  **Pipeline Gauntlet:** The CI pipeline automatically runs Security and Linting checks. If it fails, the developer must fix the code.
7.  **Tech Lead Approval:** The Tech Lead reviews the business logic. Upon approval, the MR is merged.
8.  **Automated Deployment:** The pipeline builds the Docker image, pushes it to Huawei SWR, and deploys it to the UAT environment on Huawei CCE.

### 3.3. Release to Production
Once Business Users formally sign off on the UAT environment:
1.  The Tech Lead creates a version Tag on the `main` branch in GitLab (e.g., `v1.0.0`).
2.  The CI/CD pipeline intercepts the tag and prepares the exact Docker image used in UAT.
3.  The pipeline halts and awaits a manual "Deploy" click from the Tech Lead to push the image to the PROD namespace on Huawei CCE.
