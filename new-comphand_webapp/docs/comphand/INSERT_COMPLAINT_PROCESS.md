# Insert New Complaint Data - Process Documentation

This document provides a deep dive into the technical process of inserting a new complaint into the Complain Handling System. It breaks down the User Interface, the ViewModel validations, the underlying data structure, and the Database execution.

---

## 1. UI Components and Functions
**File:** `compDetailForm.zul`

The form uses ZK Framework components heavily bound to the ViewModel (`CompHandVM`) via `@bind` and `@load`.

### Key UI Components:
* **Request ID (`textbox`):** The unique identifier for the complaint. Uses `onChange` to validate file paths and `onBlur` to trigger `trimLeadingWhitespace`. **(Mandatory)**
* **Customer Name (`textbox`):** Name of the customer filing the complaint. **(Mandatory)**
* **Location (`textbox`):** The location where the incident occurred. **(Mandatory)**
* **Channel, City, Branch (`combobox`):** Dropdowns populated from Master Data. They bind to complex objects (`vm.channel`, `vm.city`, `vm.branch`). **(Mandatory)**
* **Amount (`doublebox`):** Financial amount related to the complaint. **(Mandatory)**
* **ATM Card Number & Description (`textbox`):** Free text fields. Description uses `multiline="true"`. **(Mandatory)**
* **Received Date & Date of Incident (`datebox`):** Calendar inputs constrained to `no future` to prevent selecting dates in the future. **(Mandatory)**
* **Codes 601-605 (`tabbox` & `combobox`):** A tabbed section mapping Products and Problems to specific BI (Bank Indonesia) or OJK regulatory codes.
* **File Uploads (`toolbarbutton`):** Three distinct file upload buttons for `Pengaduan` (Complaint), `Penyelesaian` (Settlement), and `Perpanjangan` (Extension). They trigger `@command('browseFile')` to temporarily save the PDF files. **(Pengaduan is Mandatory)**
* **Submit Button (`button`):** Triggers `@command('prsupl')` (Process Upload) to begin the validation and saving sequence.

---

## 2. Process Breakdown and Validation (Pre-Submit)
**File:** `CompHandVM.java` (Method: `prsupl()`)

Before any request is sent to the backend database, the ViewModel performs rigorous logical checks.

### Step-by-Step Validation:
1. **Default Value Initialization:** Sets default system values such as `AGING = 0`, `USER_INPUT = [Current Logged-in User]`, and `ISDELETED = 'N'`.
2. **Mandatory Field Check:** Validates that no core field is empty or null. If any mandatory field (like Request ID, Customer Name, Branch, City, etc.) is missing, it displays the error: *`"Inputan yang diperlukan belum terisi semua"`* and immediately deletes any files uploaded to the temporary folder.
3. **Chronological Date Check:** Executes `validateDateInput(Incident_Date, Received_Date)`. If the Received Date is earlier than the Incident Date, it aborts the process and throws: *`"Received date tidak dapat lebih awal dari Incident date"`*.
4. **Paired Data Validation (Settlement & Extension):**
   * If a `Settlement Number` is provided, a `Penyelesaian` file **must** be uploaded.
   * If a `Penyelesaian` file is uploaded, a `Settlement Number` **must** be provided.
   * The exact same paired validation logic applies to `Extension Number` and the `Perpanjangan` file.
5. **Directory Preparation:** Checks for the existence of `PengaduanNotOtor`, `PenyelesaianNotOtor`, and `PerpanjanganNotOtor` directories on the server and creates them if they do not exist.
6. **Service Invocation:** If all validations pass, the ViewModel delegates the data to the backend via the `comphandBo.reqInsCompData(compotor)` SOAP service.

---

## 3. Data Field Breakdown
During the process, the UI fields are encapsulated into a central Data Transfer Object (DTO) model called `CompOtor`.

**Core Fields Processed:**
* **Identifiers:** `REQUEST_ID`, `SETTLEMENT_NUMBER`, `EXTENSION_NUMBER`
* **Customer Info:** `CUSTOMER_NAME`, `LOCATION`, `ATM_CARD_NUMBER`
* **Categorization:** `CHANNEL_CODE`, `CITY_CODE`, `BRANCH_CODE`
* **Financial & Text:** `AMOUNT`, `DESCRIPTION`
* **Timestamps:** `RECEIVED_DATE`, `INCIDENT_DATE` (Note: `COMPLETION_DATE` is generally null upon insertion).
* **Regulatory Codes:** `CODE_601_PRODUCT`, `CODE_601_PROBLEM`, through `605`.
* **File Paths:** `PENGADUAN_FILE_PATH`, `PENYELESAIAN_FILE_PATH`, `PERPANJANGAN_FILE_PATH`
* **System Audit:** `USER_INPUT` (The Maker), `AGING` (Days outstanding), `ISDELETED` (Status flag).

---

## 4. Database Execution & Proof of Success
**File:** `ComphandDaoImpl.java` (Method: `reqInsCompData()`)

The actual insertion into the database follows the Maker-Checker authorization pattern. It does **not** insert directly into the live `COMPLAINTS` table.

### Database Sequence:
1. **Uniqueness Check 1:** Queries `COMPLAINTS` to ensure the `REQUEST_ID` does not already exist in the active data.
2. **Uniqueness Check 2:** Queries `COMPLAINTS_OTOR` to ensure the `REQUEST_ID` is not already pending authorization.
3. **Insert Maker Data:** Executes a native SQL `INSERT INTO COMPLAINTS_OTOR` query, bringing over all the mapped fields from the `CompOtor` model, and hardcoding the `ACTION = 'Add'`.
4. **Insert Audit Trail:** Executes an `INSERT INTO SYSTEM_LOGS` with an `ACTIVITY_TYPE` of `'REQ_ADD_COMPLAINT'`.
5. **Commit Transaction:** `tx.commit()` executes the batch.

### Proof of Success:
* **Database Perspective:** The presence of a new row in the `COMPLAINTS_OTOR` table with the corresponding `REQUEST_ID` and a new row in `SYSTEM_LOGS`.
* **Application Perspective:** The DAO returns a specific string: **`"Data dengan Req ID [ID] berhasil request input."`**
* **Post-Success Cleanup:** When the ViewModel receives the message containing the word `"berhasil"` (success), it acts as the final proof. The ViewModel then physically moves the uploaded PDF files from the `Temp/` folder into their respective `*NotOtor/` folders and clears the UI form for the next entry.