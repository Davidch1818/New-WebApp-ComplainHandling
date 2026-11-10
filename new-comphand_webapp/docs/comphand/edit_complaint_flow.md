# Edit Complaint Data Flow Analysis

This document provides a detailed end-to-end recap of the "Edit Complaint Data" process found within the legacy ZK-based Complaint Handling module. This analysis covers UI interactions, ViewModel logic, validations, and the final dispatch to the backend. It is designed to serve as a blueprint for implementing the same core logic in the new application.

## 1. Entry Point: Triggering Edit Mode
The process begins in the `complist.zul` file where the list of complaints is displayed.
- The user clicks the **Edit** button on a specific row:
  ```xml
  <button label="Edit" onClick="@command('editComplaint', id=item.REQUEST_ID)" visible="@load(vm.showBtnEdel)"/>
  ```
- This triggers the `@command("editComplaint")` method in `CompHandVM.java`.

## 2. ViewModel Data Preparation (`editComplaint`)
Inside `CompHandVM.java`, when `editComplaint` is invoked with the selected `REQUEST_ID`:
1. The method searches the `complaints` list to find the matching `CompData` object.
2. It clones the selected object into two separate variables:
   - `compdata`: The object bound to the UI for user edits.
   - `compdataBe4`: A snapshot of the original data used later for generating an audit log string of what changed.
3. It invokes `editForm()` to adjust UI states.
4. It sets the `REQUEST_ID` inside a new `CompOtor` object which will eventually be used to send the update request for authorization.

## 3. UI State Changes (`editForm`)
The `editForm()` method manipulates boolean flags to control the read/write state of the input fields in `compDetailForm.zul`.

### Read-Only Fields (Disabled for Editing)
- **Request ID**, **Customer Name**, **Channel**, **City**, **Branch**, **Received Date**, **Incident Date**
- **Code 601** (Product & Problem) and **Code 603** (Causes)

### Editable Fields
- **Settlement Number**, **Extension Number**, **Location**, **Amount**, **ATM Card Number**, **Description**, **Completion Date**
- **Code 602** (Reporting Period), **Code 604** (Negative Publication), **Code 605** (Dispute Resolution)

### UI Behaviors
- **Completion Date** becomes visible (`visible="@load(vm.isBtnEditMode)"`).
- The Submit button's label dynamically changes to **Update Complaint**.
- Existing attached PDF file names are extracted and displayed.
- Dependent combo box options (e.g., Code 60x problems) are re-evaluated via `refreshoption60()`.

## 4. User Interaction & Client-Side Formatting
As the user interacts with the form, specific events fire to ensure data consistency:
- **OnBlur Trimming (`trimLeadingWhitespace`)**:
  When the user leaves input fields (like Settlement Number, Extension Number, Location, ATM, Description), the application strips leading whitespaces and restricts characters. For instance, alphanumeric, spaces, hyphens, and parentheses are typically allowed.
- **File Uploads (`browseFile`)**:
  - Validates that the uploaded file is of type `application/pdf`.
  - Automatically renames the file based on the Request ID (e.g., `[REQ_ID]_Dispute.pdf`, `[REQ_ID]_Settlement.pdf`, `[REQ_ID]_Extension.pdf`).
  - Temporarily saves the uploaded file into the `/BMIWebData/ComplainFileOps/Temp/` directory on the server.
  - Sets boolean flags (`isEditDisputeFile`, etc.) to track that a file was modified.

## 5. Submission & Validation (`prsupl`)
When the user clicks the "Update Complaint" button, the `@Command("prsupl")` method is invoked.

### Mandatory Field Validations
The system blocks submission and prompts an error if any of the following occur:
1. **Empty Required Fields**: `Amount < 0`, `Location` is empty, `ATM Card Number` is empty, or `Description` is empty.
2. **Date Logic**: `Received Date` is earlier than the `Incident Date`.

### Document vs. Number Validations
The system enforces consistency between reference numbers and their corresponding physical documents:
1. **Settlement Constraint**: If a `Settlement Number` is entered, a Settlement file **MUST** be uploaded (or already exist). Conversely, if a Settlement file is uploaded, a `Settlement Number` **MUST** be provided.
2. **Extension Constraint**: If an `Extension Number` is entered, an Extension file **MUST** be uploaded. Conversely, if an Extension file is uploaded, an `Extension Number` **MUST** be provided.

*Note: If any validation fails, the system automatically deletes any newly uploaded PDFs residing in the `Temp/` directory to prevent orphaned files.*

## 6. Pre-Processing & Data Comparison
Once validations pass:
1. **Aging Calculation**: If a Completion Date was provided, the system recalculates the SLA `AGING` metric (difference in days between Completion Date and Received Date).
2. **Change Tracking (`compareDataEdit`)**:
   The system invokes `compareDataEdit(compdataBe4, compotor)` to build a human-readable `logEdit` string. This string concatenates every field that changed (e.g., `"Amount from 50000 to 100000. Settlement file changed."`).

## 7. Dispatching to Backend
1. A new `CompOtor` payload is constructed, migrating values from `compdata` and injecting the new temporary file paths. The action is explicitly set to `"Update"`.
2. The payload and the `logEdit` string are passed to the Business Object:
   ```java
   outMsg = comphandBo.reqUpdtCompData(compotor, logsCompareEdit);
   ```
3. **Success Handling**:
   - If the backend returns a success message (containing `"berhasil"`), the physical PDF files are moved from the `Temp/` directory to the respective awaiting-authorization directories (`PengaduanNotOtor/`, `PenyelesaianNotOtor/`, `PerpanjanganNotOtor/`).
   - Form variables are reset, the detail panel is hidden, and the complaint list is refreshed.
4. **Error Handling**:
   - If the backend returns an error, the temporary files are immediately deleted.

## Implementation Guidelines for the New App
When migrating this module, ensure the following core requirements are met:
- **State Management**: Clearly distinguish between `Add` mode and `Update` mode. Ensure immutable fields (like Request ID and Received Date) remain strictly read-only in the UI during an update.
- **Audit Logging**: The custom field-by-field string generation for audit logs must be replicated so authorizers understand exactly what the editor altered.
- **File Handling Lifecycle**: Retain the exact logic of saving to a `Temp/` directory first, deleting them on validation failure, and moving them to a `NotOtor` (Not Authorized) holding area only upon successful database insertion.
- **Cross-Field Validations**: The strict pairing of "Number provided <-> File uploaded" for both Settlements and Extensions is critical business logic.