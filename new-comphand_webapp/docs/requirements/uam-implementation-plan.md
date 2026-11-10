# User Access Management (UAM) Implementation Plan

This plan outlines the architecture, database impact, and implementation steps for adding the User, User Group, and Permission management features (Login & Auth) for the internal banking web portal.

## User Review Required

> [!WARNING]  
> **IT Security Alignment**: This plan uses standard local password management (bcrypt hashing, JWT tokens). Before executing, please confirm if the IT Security requirements mandate specific complexity rules (e.g., min length, required special characters, expiration policies) so I can implement them directly.

## Proposed Changes

### 1. Database Schema Impact (PostgreSQL)

We will create RBAC (Role-Based Access Control) tables in a central `uam` schema.

*   `t_users`: Stores local users (id, username, password_hash, full_name, status, role_id).
*   `t_roles`: Stores roles (id, name) — e.g., `SUPER_ADMIN`, `RECON_USER`.
*   `t_permissions`: Stores available system permissions (id, code, description) — e.g., `VIEW_RECONCILE`, `MANAGE_USERS`, `GRANT_PERMISSIONS`.
*   `t_role_permissions`: Mapping table linking roles to specific permissions.

*This structure inherently allows an Admin user (someone with the `GRANT_PERMISSIONS` or `MANAGE_USERS` permission) to assign roles to other users.*

### 2. Backend Service (`services/uam`)

We will scaffold the first microservice according to the Monorepo structure defined in `project-structure.md`.

*   **[NEW]** `services/uam/main.py`: Entry point for the FastAPI/Flask UAM service.
*   **[NEW]** `services/uam/routes/auth.py`: Endpoints for login (`POST /login`) and JWT issuance.
*   **[NEW]** `services/uam/routes/users.py`: Endpoints for Admin users to create/edit other users, and assign them roles (this fulfills the requirement that admins can grant permissions to others). 
*   **[NEW]** `shared/auth.py`: Shared JWT validation middleware so future services can verify tokens and extract the user's permissions.

### 3. Frontend Application (`frontend/src/features/uam`)

We will create functional, temporary "placeholder" screens. These will strictly adhere to the guidelines in `/docs/requirements/DESIGN.md`:
*   **Colors**: KBank Green (`#00A94F`), ID Gradient, and White backgrounds. No drop shadows or rendering effects.
*   **Typography**: `Kurious Looped Cond` (Title/Sentence case only).

**New Views:**
*   **[NEW]** `frontend/src/features/uam/Login.jsx`: The login screen.
*   **[NEW]** `frontend/src/features/uam/AdminDashboard.jsx`: Admin panel to manage users, view existing users, and grant permissions/roles.
*   **[NEW]** `frontend/src/shared/api/auth.js`: Axios/Fetch interceptors to attach the JWT token to all outbound requests.

## Checklist

- [ ] Receive and integrate IT Security password requirements.
- [ ] Scaffold Database schemas for `users`, `roles`, and `permissions`.
- [ ] Create `shared/auth.py` for JWT handling.
- [ ] Build `services/uam` backend API for Auth and User Management (including Admin-only routes).
- [ ] Build Frontend Login and Admin User Management views aligned with `DESIGN.md`.
- [ ] Verify End-to-End login flow and Admin permission enforcement.

## Verification Plan

### Automated Tests
- *(Future)* Write unit tests for password hashing logic, JWT decoding, and Admin role enforcement.

### Manual Verification
1.  Launch the local `docker-compose` environment.
2.  Log in as a Super Admin via the temporary UI.
3.  Use the Admin panel to create a new user and grant them a specific role.
4.  Log out and log in as the new user to verify their permissions are correctly applied.
