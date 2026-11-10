# Add Complain Logic Flow ("prsupl" Function)

This document recaps the core logic for adding a new complain, specifically analyzing the flow from the user interface down to the `prsupl` function in `CompHandVM.java`. This logic flow serves as the foundation for implementing the add complain feature in the new application.

## 1. Trigger Point
The flow begins when the user clicks the submit button on the UI:
- **UI Element:** Submit button in `compDetailForm.zul` (`<button sclass="btnOK" label="Submit Complaint" onClick="@command('prsupl')"/>`).
- **ViewModel Method:** The `@command('prsupl')` binding triggers the `prsupl()` method in `CompHandVM.java`.

## 2. Initial State Preparation
When entering `prsupl()`, the system first checks if it is in Add Mode (`!isBtnEditMode()`). If true, it initializes the `CompOtor` (Complain Authorization/Staging) object with default values:
- `AGING = 0`
- `USER_INPUT = strUserName` (the current logged-in user session)
- `ISDELETED = "N"`

## 3. Form Validation (Core Rules)
The system executes a series of strict validations before any database operation:

### A. Mandatory Fields Validation
The system checks if all required fields are filled. If any of the following fail, an error is thrown ("Inputan yang diperlukan belum terisi semua"):
- `REQUEST_ID` must not be null or empty.
- `CUSTOMER_NAME` must not be empty.
- `AMOUNT` must be >= 0.
- `LOCATION` must not be empty.
- `CITY_CODE` must be selected (not null).
- `BRANCH_CODE` must be selected (not null).
- `ATM_CARD_NUMBER` must not be empty.
- `DESCRIPTION` must not be empty.
- `RECEIVED_DATE` must not be null.
- `INCIDENT_DATE` must not be null.
- `CHANNEL` must be selected (not null).
- **Pengaduan (Complain) File** must be uploaded (`getStrFileNamePengaduan().isEmpty()` is false).

### B. Date Logic Validation
- `INCIDENT_DATE` and `RECEIVED_DATE` are evaluated.
- **Rule:** The Received Date cannot be earlier than the Incident Date.
- **Error message:** "Received date tidak dapat lebih awal dari Incident date".

### C. Settlement (Penyelesaian) Cross-Validation
- **Rule:** If a `SETTLEMENT_NUMBER` is inputted, a Settlement File **must** be uploaded.
- **Rule:** If a Settlement File is uploaded, a `SETTLEMENT_NUMBER` **must** be inputted.
- **Error handling:** Throws specific error messages pointing out the missing pair.

### D. Extension (Perpanjangan) Cross-Validation
- **Rule:** If an `EXTENSION_NUMBER` is inputted, an Extension File **must** be uploaded.
- **Rule:** If an Extension File is uploaded, an `EXTENSION_NUMBER` **must** be inputted.
- **Error handling:** Throws specific error messages pointing out the missing pair.

*(Note on Error Handling: Whenever any validation fails, the system automatically runs a cleanup routine that deletes any temporary files uploaded during the current transaction from the `Temp/` directory, preventing junk files.)*

## 4. Pre-Insertion Setup
If all validations pass, the system prepares for data insertion:
- **Directory Check:** Ensures the destination directories for files exist (`PengaduanNotOtor`, `PenyelesaianNotOtor`, `PerpanjanganNotOtor`), and creates them if they don't.
- **Path Assignment:** Sets the definitive file paths in the `CompOtor` model (e.g., `strFilePath + "Pengaduan/" + filename`).

## 5. Database Operation
- Calls the business logic service: `comphandBo.reqInsCompData(compotor)`.
- **Note:** The method name `reqInsCompData` and the folder suffix `NotOtor` indicate that the initial add operation inserts the complaint into an authorization/staging state (Requiring Authorization) rather than directly into the final approved dataset.
- The service returns a string message (`outMsg`) indicating success or failure.

## 6. Post-Insertion Flow
The flow branches based on the result of the database operation (`outMsg`):

### A. On Success (`outMsg` contains "berhasil"):
1. **File Move:** Physically moves the uploaded files from the `Temp/` directory to their respective `NotOtor` staging directories.
2. **Form Reset:** Instantiates a new empty `CompOtor` object.
3. **Data Clear:** clears all dropdown selections (`CHANNEL`, `CITY_CODE`, `BRANCH_CODE`, and all G01-G05 Problem Code selections) and file name variables, effectively resetting the form UI.

### B. On Failure (`outMsg` does not contain "berhasil"):
1. **File Cleanup:** Deletes the temporary uploaded files from the `Temp/` directory to ensure no orphaned files remain.

## Final Step
- A message box (`Messagebox.show(outMsg)`) is presented to the user displaying the exact response from the business logic layer.