# End-to-End Flow: Adding Master Branch Data

This document recaps the detailed flow, logic, and validations when a user adds Master Branch data. This flow utilizes a Maker-Checker (Request-Approve) mechanism, meaning the inserted data goes to a staging table (`MASTER_OTOR`) before being finalized.

## 1. Initial State (UI - `compMaster.zul`)
- The user is on the "Master Branch" menu.
- The UI displays a `listbox` of existing branches.
- An **`Add`** button is visible for creating a new branch.

## 2. User Clicks "Add" Button
- **Action**: Triggers the `addMst()` command in `CompMasterVM.java`.
- **Logic**:
  - Sets the transaction type (`TYPE_PRS`) of the `MasterOtor` object to `"Add"`.
  - Calls `initFormDetail(null)` to prepare the detail form for data entry.

## 3. Form Initialization (`initFormDetail`)
- **Action**: Prepares the UI for the "Branch" context.
- **Logic**:
  - Sets `showDetMst = true` (makes the detail form `compDetailMaster.zul` visible).
  - Clears previous values: `CODE1` (Branch Code) = `""`, `NAME` (Branch Name) = `""`, `city` (selected City object) = `null`.
  - Dynamically sets the form labels:
    - `lblField1` = "Branch Code"
    - `lblField2` = "Branch Name"
    - `lblField3` = "City Code"
  - Sets `inputCityCode = true` (enables and displays the City combobox).

## 4. User Fills Out Detail Form (`compDetailMaster.zul`)
- The user inputs data into the textboxes (Branch Code, Branch Name) and selects a City from the combobox.
- **On Blur Event (Data Sanitization)**:
  - When the user leaves the text field, the `trimLeadingWhitespace` method is triggered.
  - **Branch Code (`CODE1`)**: Removes leading whitespace and strips out all non-numeric characters (since the context is Branch).
  - **Branch Name (`NAME`)**: Removes leading whitespace and strips out invalid characters (typically leaving alphanumeric characters, spaces, hyphens, and parentheses).

## 5. User Clicks "Submit" Button
- **Action**: Triggers the `insMst()` command in `CompMasterVM.java`.
- **Pre-Processing Logic**:
  - Sets `USER_INPUT` to the current logged-in user's username.
  - Sets `USER_OTOR` to `"-"` (indicating it hasn't been authorized yet).
  - Sets `ACTION` to `"Branch"`.
- **UI Level Validation**:
  - **Null/Empty Check**: Verifies that Branch Code (`CODE1`), Branch Name (`NAME`), and City (`city`) are not null or empty.
    - *Failure*: Displays a popup message `"Inputan belum lengkap"` and halts submission.
  - If successful, it sets the `CODE2` field to the selected City's `CITY_CODE` and proceeds to call the backend DAO via `masterBo.insMstData()`.

## 6. Database Operations & Validations (`MasterDaoImpl.insMstData`)
- **Action**: The backend processes the request and enforces business rules.
- **DAO Level Validations**:
  1. **Duplicate Check (Existing Data)**: Queries the `BRANCH` table (`select count(BRANCH_CODE) from BRANCH where BRANCH_CODE=:cCode`) to check if the Branch Code already exists.
     - *Failure*: Returns error `"Branch code [code] sudah digunakan pada data existing"`.
  2. **Duplicate Check (Pending Request)**: Queries the `MASTER_OTOR` table (`select count(CODE1) from MASTER_OTOR where CODE1=:cCode and ACTION='Branch' AND TYPE_PRS='Add'`) to check if another user has already requested to add this Branch Code.
     - *Failure*: Returns error `"Branch code [code] sudah direquest"`.
  3. **Inactive City Check**: Queries the `CITY` table (`select count(CITY_CODE) from CITY where CITY_CODE=:cCode AND ISDELETED='Y'`) to check if the selected City Code has been marked as deleted/inactive.
     - *Failure*: Returns error `"City code [code] tidak dapat dipilih karena sudah nonaktif"`.
- **Database Inserts (Transaction)**:
  - If all validations pass, a database transaction is initiated.
  - Inserts a new staging record into the `MASTER_OTOR` table containing the request details (`CODE1`, `NAME`, `CODE2`, `USER_INPUT`, `ACTION="Branch"`, `TYPE_PRS="Add"`).
  - Inserts an audit log entry into the `SYSTEM_LOGS` table with `ACTIVITY_TYPE = 'REQ_ADD_MST_BRANCH'`, a generated `LOG_ID`, and a description detailing who made the request.
  - The transaction is committed.

## 7. Post-Submission Feedback
- **Action**: The UI reacts to the backend response.
- **Logic**:
  - Resets the `masterotor` object and sets `city = null` to clear the form.
  - Hides the detail form (`showDetMst = false`).
  - Displays a `MessageBox` showing the success message (`"Data dengan Branch code [code] berhasil request Add."`) or the respective validation error.
  - Re-binds the view (`BindUtils.postNotifyChange`) to update the UI state.

## 8. Pending Approval (Checker Flow)
- The inserted data now resides in `MASTER_OTOR`. It will **not** be available in the main `BRANCH` table until a checker (an authorized user) approves it via the Master Otor menu (`formMstOtor`).
- Once approved, the backend method `MasterDaoImpl.approvedInsMstData` will move the data from `MASTER_OTOR` into the `BRANCH` table and write an approval log.