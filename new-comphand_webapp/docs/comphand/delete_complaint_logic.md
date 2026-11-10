# End-to-End Flow for Delete Complain Data Process

Based on the review of the ZK front-end (`compEditDel.zul`, `compList.zul`, `compDetailForm.zul`), ViewModel (`CompHandVM.java`), and backend DAO implementation (`ComphandDaoImpl.java`), here is the detailed end-to-end flow of the complaint deletion process.

## 1. Delete Request Initiation (User Interface & ViewModel)

**Triggering the Action**
- The user views the complaints list through `compList.zul`.
- For each complaint item in the list, if the user has edit/delete privileges (`showBtnEdel` is true), a **"Delete"** button is displayed.
- Clicking this button triggers the `@command('deleteComplaint')` method in `CompHandVM.java`, passing the `REQUEST_ID` of the selected complaint.

**Validation and ViewModel Logic (`CompHandVM.java`)**
- The system loops through the `complaints` list to locate the `Compdata` object matching the selected `REQUEST_ID`.
- It creates a new `CompOtor` (Authorization) object and populates it with all the data from the selected `Compdata`. The `ACTION` property is explicitly set to `"Delete"`.
- The system extracts the file names for *Pengaduan*, *Penyelesaian*, and *Perpanjangan* from their respective paths.
- A confirmation dialog (`MessageBox`) appears: `"Apakah yakin request hapus data complain dengan request id <REQUEST_ID> ?"`.

**Executing the Request**
- If the user confirms ("YES"), the viewModel calls the Business Object method: `comphandBo.reqDelCompData(compotor)`.
- A response message is shown to the user upon completion.
- Note: The actual physical deletion of attached files and updating the active list is bypassed at this stage (commented out in the VM) because the delete process uses an **approval/authorization (maker-checker)** flow.

## 2. Request Handling in Backend (DAO Layer)

**DAO Implementation (`ComphandDaoImpl.java - reqDelCompData`)**
- The DAO does **not** delete the data directly from the main `COMPLAINTS` table.
- Instead, it **inserts** a record into the `COMPLAINTS_OTOR` table with all the mapped fields from the complaint, and sets the `ACTION` column to `'Delete'`.
- It generates a new `LOG_ID` (prefixed with `"DEL"`).
- It inserts an activity record into the `SYSTEM_LOGS` table with `ACTIVITY_TYPE = 'REQ_DELETE_COMPLAINT'`.
- The main `COMPLAINTS` table is untouched at this point.

## 3. Authorization / Approval Process

The system relies on an authorization flow where a user with "Otor" (authorization) privileges must approve or reject the pending deletion.

### Scenario A: Approving the Deletion

**ViewModel Logic (`otorApproved` in `CompHandVM.java`)**
- In the "Authorize Complaints" view (`compList.zul`), the user clicks **"Approve"**.
- The system prompts: `"Apakah yakin otor data complain dengan request id <REQUEST_ID> ?"`.
- If confirmed, the system sets the `USER_OTOR` to the current user's name and calls `comphandBo.approvedCompData(compotor, "Delete")`.
- **File Deletion:** After the BO completes, the ViewModel explicitly deletes the physical files (for *Pengaduan*, *Penyelesaian*, and *Perpanjangan*) from the server directories.

**DAO Logic (`approvedDelCompData` in `ComphandDaoImpl.java`)**
- The DAO generates a new `LOG_ID` (prefixed with `"OKDEL"`).
- It performs a **soft delete** on the main `COMPLAINTS` table:
  `UPDATE COMPLAINTS SET ISDELETED = 'Y', USER_OTOR = :USER_OTOR WHERE REQUEST_ID = :REQUEST_ID`
- It then removes the authorization request from the `COMPLAINTS_OTOR` table:
  `DELETE FROM COMPLAINTS_OTOR WHERE REQUEST_ID = :REQUEST_ID`
- An activity log is inserted into `SYSTEM_LOGS` with `ACTIVITY_TYPE = 'APP_DELETE_COMPLAINT'`.

### Scenario B: Rejecting the Deletion

**ViewModel Logic (`otorRejected` in `CompHandVM.java`)**
- In the authorization view, the user clicks **"Reject"**.
- The system prompts: `"Apakah yakin reject data complain dengan request id <REQUEST_ID> ?"`.
- If confirmed, it calls `comphandBo.rejectedCompData(...)`.
- It checks for and deletes any un-authorized files lingering in the `*NotOtor/` folders.

**DAO Logic (`rejectedCompData` in `ComphandDaoImpl.java`)**
- Retrieves context data from `COMPLAINTS_OTOR`.
- Generates a new `LOG_ID` (prefixed with `"NOTOK"`).
- Deletes the authorization request from the `COMPLAINTS_OTOR` table.
- The main `COMPLAINTS` table remains unchanged (the data remains active).
- An activity log is inserted into `SYSTEM_LOGS` with `ACTIVITY_TYPE = 'REJECT_DEL_COMPLAINT'`.

## Summary Core Logic to Implement in New App

When implementing the new application, the delete logic must follow a **Maker-Checker** pattern:
1. **Maker Request:**
   - Prompt user confirmation.
   - Do NOT delete the record. Insert it into a temporary/authorization table (e.g. `COMPLAINTS_OTOR`) with action type `"Delete"`.
   - Log the `"REQ_DELETE_COMPLAINT"` action.
2. **Checker Approval:**
   - Prompt approver confirmation.
   - Update main table (soft delete): `SET ISDELETED = 'Y'`.
   - Delete physical attachments from file server.
   - Delete row from the authorization table.
   - Log the `"APP_DELETE_COMPLAINT"` action.
3. **Checker Rejection:**
   - Delete row from the authorization table.
   - Delete any temporary unapproved files.
   - Main table record stays intact.
   - Log the `"REJECT_DEL_COMPLAINT"` action.