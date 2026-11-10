# IT Security & Change Management Policy
**Project:** BMAS Internal Web
**Target Audience:** IT Infrastructure, IT Security, Change Management Committee

This document outlines the formalized deployment approach for the BMAS Internal Web project on Huawei Cloud. It explicitly details the automated guardrails and the mandatory manual intervention points required to satisfy bank security and change control standards.

---

## 1. Overview of Deployment Architecture

The system utilizes an automated CI/CD pipeline (`.gitlab-ci.yml`) integrated with Huawei CodeArts and Huawei Cloud Container Engine (CCE). 
*   **Automated UAT:** When code passes the automated Security Scans (SAST) and is merged by the Tech Lead, it is automatically deployed to the UAT environment on Huawei CCE.
*   **Immutable Artifacts:** The exact Docker container image tested and approved in UAT is the exact same image promoted to Production. No rebuilding occurs between UAT and PROD, ensuring absolute consistency.

---

## 2. IT Security Focus: Secrets Management (Manual Task 1)

To comply with strict data privacy and security regulations (OJK/BI), the project enforces a zero-trust policy regarding credentials in the source code.

*   **The `.env` Restriction:** Developers use `.env` files for local testing. However, the repository `.gitignore` configuration explicitly blocks any `.env` file from being committed or pushed to the central Git server.
*   **MANUAL TASK (IT Sec / DevOps):** Production credentials, database passwords, and Huawei Cloud access keys (e.g., `$KUBECONFIG_CONTENT`) must **never** be hardcoded in the pipeline scripts. Instead, an authorized administrator must manually input these secrets into the secure **Settings > CI/CD > Variables** section of the Huawei CodeArts Web Console. 
*   **Execution:** During deployment, the Huawei pipeline securely injects these variables into memory for the duration of the deployment and immediately wipes them, ensuring keys are never logged or stored.

---

## 3. Change Management Focus: Production Release Process (Manual Task 2)

While the pipeline automates testing and UAT deployment, **Production deployments are strictly manual** to ensure compliance with Change Management scheduling. 

When Business Users formally sign off on the UAT environment, the Tech Lead executes the Production Release via the following manual steps:

### Step 1: The Digital Signature (Tagging)
The Tech Lead logs into the Huawei CodeArts repository and manually creates a new Git Tag (e.g., `v1.0.0`) on the `main` branch. This manual action serves as the digital signature indicating that the UAT code is approved for production.

### Step 2: The Pipeline Pause
The CI/CD pipeline detects the new tag and automatically prepares the production deployment. It locates the approved Docker image in Huawei SWR. However, the pipeline is configured with a strict `when: manual` rule. **The pipeline halts and will not touch the live Production server.**

### Step 3: The Change Management Window (Manual Deploy)
The system remains paused until the approved Change Management downtime window (e.g., Sunday at 2:00 AM). At that exact time, the Tech Lead logs into the CodeArts Pipeline UI and manually clicks the **"Play / Deploy to PROD"** button. The Huawei CCE cluster then pulls the image and performs a zero-downtime rolling update.
