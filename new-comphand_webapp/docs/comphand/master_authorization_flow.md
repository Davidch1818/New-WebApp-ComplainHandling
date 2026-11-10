# Master Data Authorization (Approve/Reject) End-to-End Flow Analysis

This document outlines the detailed end-to-end flow for the authorization process (Approve and Reject) of Master Data requests within the complain handling application.

## 1. Frontend Trigger (`compMaster.zul`)
- The authorization UI is rendered when the user navigates to the Master Otor menu (`vm.strTitleMenuMaster.equals('MasterOtor')`).
- The `lstMasterOtor` listbox displays pending master data requests. Columns include Code 1, Name, Code 2, User Input, Action, and Type Process.
- **Actions**:
  - **Approve Button**: Triggers the `@command('otorApproved', id=item.CODE1.concat(item.ACTION))` command in the ViewModel.
  - **Reject Button**: Triggers the `@command('otorRejected', id=item.CODE1.concat(item.ACTION))` command in the ViewModel.

## 2. ViewModel Logic (`CompMasterVM.java`)
### A. Approve Flow (`otorApproved`)
1. **Identification**: The method loops through `lstMasterOtor` to find the `MasterOtor` object matching the concatenated ID parameter (`CODE1` + `ACTION`).
2. **Confirmation Dialog**: A `MessageBox` asks the user: *"Apakah yakin otor data master dengan kode [CODE] dan action [ACTION] ?"*
3. **Execution (On Yes)**:
   - Sets the `USER_OTOR` field of the `MasterOtor` object to the currently logged-in user (`strUserName`).
   - Calls the Business Object layer: `masterBo.approvedMstData(masterotor, masterotor.getACTION(), masterotor.getTYPE_PRS())`.
   - Clears and refreshes the `lstMasterOtor` to reflect the updated state.
   - Shows a success or error message returned by the backend.

### B. Reject Flow (`otorRejected`)
1. **Identification**: Similar to the approve flow, it identifies the target `MasterOtor` object.
2. **Confirmation Dialog**: A `MessageBox` asks the user: *"Apakah yakin reject data master dengan kode [CODE] dan action [ACTION] ?"*
3. **Execution (On Yes)**:
   - Calls the Business Object layer: `masterBo.rejectedMstData(masterotor)`.
   - Clears and refreshes the `lstMasterOtor`.
   - Shows the result message.

## 3. Business Object Layer (`MasterBoImpl.java`)
The Business Object acts as a router to the Data Access Object (DAO) depending on the type of operation:
- **Approve (`approvedMstData`)**:
  - If `typeprs` is `"Add"`: Routes to `masterDao.approvedInsMstData`.
  - If `typeprs` is `"Edit"`: Routes to `masterDao.approvedEditMstData`.
  - If `typeprs` is `"Delete"`: Routes to `masterDao.approvedDelMstData`.
- **Reject (`rejectedMstData`)**:
  - Routes directly to `masterDao.rejectedInsMstData(masterotor)`.

## 4. Data Access Layer (`MasterDaoImpl.java`)
This layer handles the actual database interactions using Hibernate SQL Queries. It ensures transaction safety with `Session` and `Transaction` commits/rollbacks.

### A. Approve Add (`approvedInsMstData`)
1. **Target Table Resolution**: Maps the `Action` string (e.g., `"Channel"`, `"Branch"`, `"City"`, `"Code_601"`) to the specific target database table.
2. **Validation**: Runs a `SELECT COUNT` query to verify if the Master Code (`CODE1`) already exists in the target table.
   - If it exists: Returns an error message: *"Code [CODE1] sudah digunakan pada data existing"*.
3. **Log ID Generation**: Queries the maximum sequence number for `Log_Id` in `System_Logs` using the prefix `'OKMSTADD'` and increments it.
4. **Data Insertion**:
   - Executes an `INSERT INTO [TargetTable] ... SELECT ... FROM MASTER_OTOR` query.
   - Copies `CODE1`, `NAME`, `CODE2` (if applicable), and `USER_INPUT`.
   - Uses the approving user for `USER_OTOR`.
   - Hardcodes `FLAGOTOR='Y'` and `ISDELETED='N'`.
5. **Request Cleanup**: Executes a `DELETE FROM MASTER_OTOR` query for the processed request.
6. **Audit Trail**: Inserts a log into `SYSTEM_LOGS` with `ACTIVITY_TYPE` = `'APP_ADD_MST_[ACTION]'`.

### B. Approve Edit (`approvedEditMstData`)
1. **Log Data Retrieval**: Queries the `SYSTEM_LOGS` table to retrieve the most recent edit request log (`REQ_EDIT_MST_[ACTION]`). This is used to copy the `CHANGED_FIELDS` and original description.
2. **Log ID Generation**: Generates a new `Log_Id` using the prefix `'OKMSTEDIT'`.
3. **Data Modification**:
   - Executes a `MERGE INTO [TargetTable]` query (an UPSERT operation) matching on the primary code (`CODE1`).
   - Updates the target row's `NAME`, `CODE2` (for Branch/city relations), `USER_INPUT`, and `USER_OTOR`.
4. **Request Cleanup**: Deletes the processed request from `MASTER_OTOR`.
5. **Audit Trail**: Inserts a log into `SYSTEM_LOGS` with `ACTIVITY_TYPE` = `'APP_EDIT_MST_[ACTION]'`, persisting the historical changes (`CHANGED_FIELDS`) retrieved in step 1.

### C. Approve Delete (`approvedDelMstData`)
1. **Log ID Generation**: Generates a new `Log_Id` using the prefix `'OKMSTDEL'`.
2. **Soft Deletion**:
   - Executes an `UPDATE [TargetTable] SET ISDELETED='Y' WHERE [PrimaryKey]=:CODE1`.
   - **Cascading Note**: If the Action is `"City"`, it executes an additional query to soft delete all associated Branches (`UPDATE Branch SET ISDELETED='Y' where CITY_CODE=:CODE1`).
3. **Request Cleanup**: Deletes the processed request from `MASTER_OTOR`.
4. **Audit Trail**: Inserts a log into `SYSTEM_LOGS` with `ACTIVITY_TYPE` = `'APP_DEL_MST_[ACTION]'`.

### D. Reject (`rejectedInsMstData`)
1. **Request Deletion**: Directly executes a `DELETE FROM MASTER_OTOR` query matching the `CODE1`, `ACTION`, and `TYPE_PRS`.
2. **Audit Trail**: *Note: Unlike approval flows, the rejection flow does not record an explicit entry into `SYSTEM_LOGS`.*
3. **Return Message**: Returns a success message indicating the rejection.