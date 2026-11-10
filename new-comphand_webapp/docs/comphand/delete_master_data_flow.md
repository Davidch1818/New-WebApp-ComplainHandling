# End-to-End Flow of Delete Master Data (`delMst`)

## 1. Overview
The "Delete Master Data" process implements a Maker-Checker (Request-Approve) pattern. When a user initiates a delete operation on a master record, the system does not delete the data directly. Instead, it creates a request in a staging table (`MASTER_OTOR`). A checker (authorizer) must then approve the request, at which point the record is "soft-deleted" (flagged as `ISDELETED = 'Y'`) in the actual master table.

## 2. Maker Process: Requesting Deletion (UI & ViewModel)
### UI Trigger (`compMaster.zul`)
- The user clicks the **Delete** button on a row in the Master Data listbox.
- This invokes the `@command('delMst', id=item)` in the ViewModel, passing the selected row's `AllMasters` object as a parameter.

### ViewModel Logic (`CompMasterVM.java - delMst`)
1. **Preparation**:
   - `TYPE_PRS` (Type of Process) is set to `"Delete"`.
   - `ACTION` is set to the current menu name (e.g., `"Branch"`, `"City"`, `"Channel"`, `"Code_601"`, etc.).
   - `initFormDetail(all)` is called to map the selected data into a staging object (`masterotor` of type `MasterOtor`). This extracts the relevant `CODE1` (Primary Code), `NAME`, and `CODE2` (Secondary Code, e.g., `CITY_CODE` for Branch).
2. **Confirmation Dialog**:
   - The user is prompted with a confirmation dialog: *"Apakah yakin hapus data master dengan kode [CODE] dan action [ACTION] ?"*.
3. **Submission**:
   - If the user clicks **YES**, the `USER_INPUT` is set to the current user (`strUserName`).
   - The `USER_OTOR` (Authorizer) is defaulted to `"-"` (indicating it is pending).
   - The application calls the Business Object layer: `masterBo.insMstData(masterotor, action, type_prs, masterotorbe4)`.

## 3. Maker Process: Database Insertion (`MasterDaoImpl.java - insMstData`)
1. **Validation**:
   - The system checks if there is already a pending request for this exact `CODE1`, `ACTION`, and `TYPE_PRS` in the `MASTER_OTOR` table (`select count(CODE1) ... from MASTER_OTOR ...`).
   - If a request already exists, it aborts and returns an error message: *"[Menu] code [Code1] sudah direquest"*.
   - *Specific for Branch:* It also checks if the parent City (`CODE2`) is already soft-deleted. If so, it prevents the request.
2. **Log Generation**:
   - Generates a new `Log_Id` formatted as `MSTDELETE` + auto-increment index.
3. **Database Execution** (Transaction):
   - Inserts the request into the `MASTER_OTOR` table with pending status (`USER_OTOR = '-'`).
   - Inserts an audit trail record into the `SYSTEM_LOGS` table with:
     - `ACTIVITY_TYPE` = `"REQ_DELETE_MST_[ACTION]"`
     - `DESCRIPTION` = `"Master [action] request deleted for code [code1] by user [user]"`
4. **Completion**:
   - Commits the transaction and returns a success message to the ViewModel, which is then displayed to the user via `Messagebox.show`.

## 4. Checker Process: Approval (ViewModel & DAO)
### UI & ViewModel (`CompMasterVM.java - otorApproved`)
- A checker (a user other than the maker) navigates to the Master Authorization menu and clicks **Approve** on the pending Delete request.
- This triggers `@command('otorApproved')`.
- The ViewModel prompts for confirmation. On YES, it updates `USER_OTOR` to the checker's username and calls `masterBo.approvedMstData`.

### Database Execution (`MasterDaoImpl.java - approvedDelMstData`)
1. **Log Generation**:
   - Generates a new `Log_Id` formatted as `OKMSTDEL` + auto-increment index.
2. **Soft Deletion & Cascading Logic**:
   - The system maps the `ACTION` to the actual physical table (e.g., `Branch`, `City`, `Code_601`, etc.).
   - It executes a **Soft Delete** by updating the actual master table: `UPDATE [Table] SET ISDELETED='Y' WHERE [PK_CODE]=:CODE1`.
   - ⚠️ **CRITICAL CASCADING LOGIC**: If the deleted master is a **City** (`ACTION = "City"`), the system *also* cascades the soft-delete to all Branches belonging to that City:
     `UPDATE Branch SET ISDELETED='Y' WHERE CITY_CODE=:CODE1`.
3. **Cleanup Staging**:
   - Deletes the pending request from the `MASTER_OTOR` table since it is now approved and processed.
4. **Audit Trail**:
   - Inserts an audit record into `SYSTEM_LOGS` with:
     - `ACTIVITY_TYPE` = `"APP_DEL_MST_[ACTION]"`
     - `DESCRIPTION` = `"Master [action] approve deleted for code [code1] by user [checker]"`
5. **Completion**:
   - Commits transaction and returns a success message.

---

## Core Logic Implementation Notes for New Application:
When migrating this functionality to a new application, ensure the following core principles are retained:
1. **Maker-Checker Flow**: Always maintain the staging table concept (`MASTER_OTOR`) for deletions. Users should not be able to delete master data directly without authorization.
2. **Soft Delete**: Data must never be physically deleted (`DELETE FROM ...`), only logically deleted via an `ISDELETED` (or equivalent) flag.
3. **Cascading Soft Deletes**: Take special care to implement the cascading soft delete functionality (e.g., Cities -> Branches). Deleting a parent entity must logically delete its dependent child entities to prevent orphaned active records.
4. **Duplicate Request Validation**: Prevent users from requesting a deletion if a pending delete request already exists for the same item.
5. **Audit Logging**: Every state change (both the initial Request and the final Approval/Rejection) must be logged comprehensively in a system audit logs table.