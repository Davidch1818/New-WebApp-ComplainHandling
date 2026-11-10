# IT Security Requirements: UAM and Authentication

This document summarizes the User Access Management (UAM) and Authentication security requirements for the internal web project, based on the provided IT security guidelines. These requirements are specifically tailored for **local user** management within the application.

## 1. Authentication & Password Policies
The system must enforce the following rules for all local user accounts:

*   **Force Change Password**: New users receiving their initial password, or users whose passwords have been reset by an administrator, must be forced to change their password immediately upon their next successful login.
*   **Minimum Password Age**: Passwords must be kept for at least **1 day** before they can be changed again.
*   **Maximum Password Age**: Passwords expire after **90 days**. The system must force users to change their passwords within this timeframe.
*   **Minimum Password Length**: Passwords must be at least **8 characters** long.
*   **Password Complexity**:
    *   Passwords are case-sensitive.
    *   The password must not be identical to the User ID.
    *   The password must not contain long consecutive repeating characters (e.g., `AAAAAAAA`).
    *   The password must contain a mix of characters from at least **3 of the following 4 categories**:
        1.  English uppercase letters (`A-Z`)
        2.  English lowercase letters (`a-z`)
        3.  Numbers (`0-9`)
        4.  Special characters (e.g., `*`, `/`, `@`, `#`, `%`, `&`)
*   **Password History**: The system must remember the last **5** passwords used by an account to prevent reuse (users cannot reuse their previous 5 passwords).
*   **Account Lockout Threshold**: An account must be temporarily suspended/locked immediately after **3 consecutive failed login attempts**.
*   **Password Masking**: The password input field must mask characters on screen using symbols (e.g., asterisks `*`).

## 2. User Management (Admin Functions)
User Administrators must be provided with the following capabilities to manage application users:

*   **Create**: Create new user accounts.
*   **Update**: Modify user profiles and assign/update user roles.
*   **Delete**: Delete accounts (System must handle Hard or Soft deletion, and define rules for recreating previously deleted User IDs).
*   **Status Management**: Set account status to `Active`/`Inactive` or `Enable`/`Disable`.
*   **Bulk Operations**: Support Bulk Load functionality for user creation/updates (required if managing more than 100 accounts).
*   **Export (Audit Report)**: Export a list of all current users.

## 3. Role Management (Admin Functions)
User Administrators must have the following capabilities to manage system roles and permissions:

*   **Create**: Create new roles.
*   **Update / Rename**: Rename roles and modify the menus and permissions associated with a role.
*   **Delete**: Delete roles from the system.
*   **Status Management**: Set role status to `Active`/`Inactive`.
*   **Export (Audit Report)**: Export a list of all current roles, menus, and permissions.

## 4. Audit & Compliance Reporting
To fulfill specific audit requirements, the application must provide comprehensive reporting capabilities:

*   **Current Access Matrix Report**: The system must generate and export an audit report that lists all **Users**, their assigned **Roles**, and the corresponding **Functions/Menus/Permissions** currently available in the application (รายงานที่แสดงรายชื่อ User ID/Role/Function ทั้งหมดที่มีอยู่บนระบบ).
