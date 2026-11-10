# Complaint Authorization (`otorApproved`) Core Logic Breakdown

This document provides a detailed recap of the `otorApproved` flow in the legacy ZK application, tracing the logic from the user interface (`compList.zul`) down to the ViewModel controller (`CompHandVM.class`). This breakdown serves as a blueprint for implementing the authorization logic into a new application.

## 1. User Interface Trigger (`compList.zul`)
- **Location:** Line 135 in `compList.zul`
- **Component:** The **Approve** button inside the Authorization `listbox` grid.
- **Event:** `onClick="@command('otorApproved', id=item.REQUEST_ID)"`
- **Action:** Clicking the button triggers the `otorApproved` method in the ViewModel. It passes the `REQUEST_ID` of the specific complaint row as a parameter.

## 2. Controller Initialization (`CompHandVM.java`)
- **Method:** `public void otorApproved(@BindingParam("id") String idSelected)` (Starts at Line 2384)
- **Data Selection:**
  - The controller iterates through `lstOtor` (the list of authorization items displayed on the screen).
  - It matches the `REQUEST_ID` property with `idSelected`.
  - Once found, it assigns the matching `CompOtor` object to a local class variable `compotor`.

## 3. Validation & Confirmation
- **Confirmation Dialog:** The system triggers a ZK `MessageBox` displaying:
  > *"Apakah yakin otor data complain dengan request id [idSelected] ?"*
  *(Are you sure to authorize complaint data with request id [idSelected]?)*
- **Condition:** Execution halts and waits for the user to select the `MessageBox.YES` action before proceeding with the core business logic.

## 4. Backend Processing & Data Refresh
If the user confirms the action:
1. **Set Authorization User:** `compotor.setUSER_OTOR(strUserName)` assigns the currently logged-in user's ID as the authorizer.
2. **Execute Service Call:** It invokes `comphandBo.approvedCompData(compotor, compotor.getACTION())`. This calls the backend WebService (BO) to process the database updates. The service returns a status message (`msg`).
3. **Refresh Pending List:**
   - `lstOtor.clear()` empties the current view list.
   - It fetches the updated pending authorizations via `comphandBo.lstCompOtor(strUserName)` and re-populates `lstOtor`.

## 5. Physical File Management (Critical Logic)
This is a critical segment. The application manages physical document files attached to the complaints. It uses a **Temporary Folder** to **Permanent Folder** strategy based on authorization, where the final destination for approved files is the **`ComplainOtor`** folder.

There are 3 document types:
1. **Pengaduan** (Complaint Document)
2. **Penyelesaian** (Resolution Document)
3. **Perpanjangan** (Extension Document)

For each document type, it extracts the filename and executes the following directory logic based on the `compotor.getACTION()` value:

### Condition A: `ACTION` == "Add" OR (`ACTION` == "Update" AND file exists in Temp Directory)
- **Logic:** The file is considered newly uploaded but unauthorized.
- **Execution:** Moves the file from the unauthorized temporary directory (e.g., `PengaduanNotOtor/`) to the authorized permanent directory inside **`ComplainOtor`** (e.g., `ComplainOtor/Pengaduan/`) using `Files.move` with `StandardCopyOption.REPLACE_EXISTING`.

### Condition B: `ACTION` == "Delete"
- **Logic:** The user requested to delete a complaint, and the authorizer approved it.
- **Execution:** Calls the internal `delFile()` method to physically delete the document from the permanent directory (e.g., `Pengaduan/`).

## 6. UI Updates and Notifications
- **Status Alert:** Displays another `MessageBox` with the result `msg` (e.g., "Success" or error message) returned from the `comphandBo` WebService call.
- **View Model Rebind:** Calls `BindUtils.postNotifyChange(null, null, this, "*")` at the end of the execution flow to force the ZK UI to re-render and reflect the updated `lstOtor` data list on the screen.

---

> [!TIP]
> **Implementation Note for the New App:**
> When rebuilding this logic, ensure the file management (moving files from temporary unapproved folders to the final permanent folder **`ComplainOtor`** upon approval) is strictly implemented. If an authorization is **Rejected** (handled by `otorRejected`), the equivalent logic deletes the files straight from the temporary `*NotOtor/` folders to clean up disk space.