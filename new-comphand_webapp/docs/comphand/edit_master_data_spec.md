# Edit Master Data - End-to-End Flow Specification

## 1. Overview
The "Edit Master Data" process in the Complain Handling system allows users to propose modifications to various master entities (Branch, City, Channel, Product Codes, etc.).
Changes are not immediately applied to the master tables. Instead, they are inserted into a staging table (`MASTER_OTOR`) as an "Edit" request, pending authorization from another user.

## 2. UI Flow (`compMaster.zul` & `compDetailMaster.zul`)
1. **Triggering Edit**:
   - The user selects a master record from the data table.
   - User clicks the **Edit** button.
   - The UI invokes `@command('editMst', id=item)`.
2. **Form Initialization (`compDetailMaster.zul`)**:
   - The system displays the detail form (setting `showDetMst` to true).
   - The form renders read-only fields for the identifier (`CODE1`) and editable fields for the name/description (`NAME`).
   - For `Branch` master, a City Dropdown (`CODE2`) is also shown.
3. **Submission**:
   - After updating the values, the user clicks **Submit**.
   - The UI invokes `@command('insMst', param=vm.strTitleMenu)`.

## 3. Controller / ViewModel Logic (`CompMasterVM.java`)

### `editMst(AllMasters all)`
- Sets `masterotor.TYPE_PRS = "Edit"`.
- Calls `initFormDetail(all)` to initialize the staging object (`masterotor`) and an object holding the previous values (`masterotorbe4`).
- Refreshes the UI to display the Detail Form.

### `insMst(String pStrTitleMenu, String pBtnAction)`
- **Validations (Pre-database)**:
  - Ensures `CODE1` and `NAME` are not empty.
  - If editing a `Branch`, ensures a `City` is selected.
- **Pre-Processing**:
  - Sets `USER_INPUT` to the current user.
  - Sets `USER_OTOR` to `"-"`.
  - Sets `ACTION` to the type of master data being edited (e.g., `Branch`, `City`, `Channel`).
  - Sets `CODE2` to the selected City Code (if Branch) or `"-"` for others.
- **Execution**:
  - Calls `masterBo.insMstData(masterotor, ACTION, TYPE_PRS, masterotorbe4)`.
  - Clears the form and hides it upon success.

## 4. Business Logic & Validations (`MasterDaoImpl.java`)

### A. Submission of Edit Request (`insMstData`)
When an edit request reaches the DAO:
1. **Database Validations**:
   - **Duplicate Request Check**: Queries `MASTER_OTOR` to ensure there isn't already an active request for the same `CODE1`, `ACTION`, and `TYPE_PRS = 'Edit'`.
     *If true: returns error "Code X sudah direquest".*
   - **Foreign Key Validity (Branch Only)**: Queries `CITY` to ensure the selected City Code is active (`ISDELETED='N'`).
     *If false: returns error "City code X tidak dapat dipilih karena sudah nonaktif".*
2. **Staging**:
   - Inserts a new record into `MASTER_OTOR` table with:
     - `CODE1` (Primary Key of the master)
     - `NAME` (New Name)
     - `CODE2` (Foreign Key if applicable, else '-')
     - `USER_INPUT` (Requester)
     - `USER_OTOR` ('-')
     - `ACTION` (Master Type)
     - `TYPE_PRS` ('Edit')
3. **Audit Logging**:
   - Computes a new `LOG_ID` (e.g., `MSTEDIT123`).
   - Inserts into `SYSTEM_LOGS` with `ACTIVITY_TYPE = 'REQ_EDIT_MST_[ACTION]'`.
   - The `DESCRIPTION` and `CHANGED_FIELDS` columns explicitly record the old and new names (e.g., "Changed Master Branch name from oldName to NewName").

### B. Approval Flow (`approvedEditMstData`)
1. An Authorizer navigates to the Authorization page. The list excludes requests made by the Authorizer themselves (`USER_INPUT <> CURRENT_USER`).
2. Authorizer clicks "Approve", invoking `approvedMstData` -> `approvedEditMstData`.
3. **Execution**:
   - Fetches the latest Request Log from `SYSTEM_LOGS` to carry over the description.
   - Executes a **MERGE INTO (UPSERT) query** against the actual master table (e.g., `BRANCH`, `CITY`).
     - Updates the `NAME` (and `CITY_CODE` if applicable).
     - Updates `USER_INPUT` and sets `USER_OTOR` to the authorizer's username.
   - **Cleanup**: Deletes the approved request from `MASTER_OTOR`.
   - **Audit Logging**: Inserts a new `SYSTEM_LOGS` entry with `LOG_ID` starting with `OKMSTEDIT`, and `ACTIVITY_TYPE = 'APP_EDIT_MST_[ACTION]'`.

### C. Rejection Flow (`rejectedInsMstData`)
1. Authorizer clicks "Reject".
2. System executes `rejectedMstData` in DAO.
3. **Execution**:
   - Simply deletes the pending request from `MASTER_OTOR` without modifying the actual master data tables.
   - No explicit audit log is created for the rejection action in the current implementation.

## 5. Blueprint for New Application
To implement this in a modern stack (e.g., Spring Boot + React/Angular):
1. **Maker-Checker Architecture**: Implement a robust staging mechanism. Use a generalized payload column (e.g., JSONB) in a `master_requests` table instead of hardcoded `CODE1`, `CODE2` to easily scale to master tables with different schemas.
2. **Transactional Integrity**: Ensure the deletion from the staging table and the update to the actual master table happen within the same database transaction.
3. **Granular Validations**:
   - Pre-validate all foreign keys before staging.
   - Ensure a user cannot authorize their own edits.
4. **Audit Trail**: Continue using an append-only audit log table, but structure the "before" and "after" state in a machine-readable format (JSON) rather than plain strings for better historical tracking.