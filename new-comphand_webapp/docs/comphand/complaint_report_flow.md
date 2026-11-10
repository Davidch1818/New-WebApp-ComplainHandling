# Complaint Handling Report - End-to-End Flow Review

This document provides a detailed end-to-end review of the flow for displaying report data (`vm.reports`) and exporting to Excel (`expReport`) in the Complaint Handling application, including detailed SQL queries and Excel column mappings.

## 1. View Layer (`compReport.zul` & `compList.zul`)
The flow starts from the ZK view components.
- **Window Initialization**: `compReport.zul` defines the main window and binds it to the ViewModel `id.co.bankmaspion.intranet.comphand.viewmodel.CompHandVM`.
- **Data Display**: `compList.zul` includes multiple `<listbox>` elements that dynamically render based on `vm.strTitleMenu`:
  - **Complaint Handling Report**: Binds to `@bind(vm.reports)` and displays Product Type, Problem Type, and Number of Complaints (`FREK`).
  - **Complaint Resolution Report**: Binds to `@bind(vm.reports)` and displays Branch, Resolution Status, Total Complaints (`FREK`), and Average Resolution Time in days (`RATA`).
- **Export Button**: A button mapped to the command `@command('expReport', param=vm.strTitleMenu)` triggers the Excel export process.

## 2. ViewModel Layer (`CompHandVM.java`)
The orchestrator of the business logic.

### A. List Data Process (`vm.reports`)
- The `reports` property (List of `CompReport`) is populated by calling the Web Service layer (`comphandBo`).
- The specific method called depends on the active menu and search filters:
  - `comphandBo.lstCompRpt()` or `comphandBo.lstCompRptByFilter()` for Handling Reports.
  - `comphandBo.lstCompResRpt()` or `comphandBo.lstCompResRptByFilter()` for Resolution Reports.

### B. Export to Excel Process (`expReport`)
When the `expReport` command is triggered with the menu title parameter:
1. **Validation & Query**:
   - Validates `startDate` and `endDate` inputs. If invalid, shows an error message.
   - Refreshes the `complaints` list via `comphandBo.lstCompDataByFilter(...)` if search/dates are active.
2. **Excel Generation (Apache POI)**:
   - Initializes an `HSSFWorkbook` and `HSSFSheet`.
   - Generates the Excel file based on the selected report type (see Section 3 for detailed formats).
3. **Saving & Logging**:
   - The file is saved locally to `xlsFilePath`.
   - Logs the download activity into the database by constructing a `System_Logs` object and calling `comphandBo.insProcToLogs(sysLogs)`.
4. **File Download**:
   - `Filedownload.save(new File(xlsFilePath), null)` is invoked to push the generated Excel file to the user's browser.

## 3. Excel Data Format & Columns
The structure of the generated Excel files varies significantly depending on the selected report type.

### A. Complaint Handling Report
> [!NOTE]
> Even though the UI displays a summarized table, the Excel export actually outputs the **raw, detailed list of complaints** iterating over `vm.complaints` (List of `CompData`).

**Columns Generated:**
1. No.
2. Request ID
3. Tgl. Terima *(Received Date - dd/MM/yyyy)*
4. Nama Nasabah *(Customer Name)*
5. No. Kartu ATM *(ATM Card Number)*
6. Tgl. Kejadian *(Incident Date - dd/MM/yyyy)*
7. Tempat *(Location)*
8. Wilayah *(City Name)*
9. Keterangan *(Description)*
10. Nilai Transaksi *(Amount)*
11. Tgl. Selesai *(Completion Date - dd/MM/yyyy)*
12. No. Surat *(Settlement Number)*
13. 601 *(Code 601 Product Name)*
14. 601-P *(Code 601 Problem Info Name)*
15. 602 *(Code 602 Product Name)*
16. 602-P *(Code 602 Problem Info Name)*
17. 603 *(Code 603 Product Name)*
18. 603-P *(Code 603 Problem Info Name)*
19. 604 *(Code 604 Product Name)*
20. 604-P *(Code 604 Problem Info Name)*
21. 605 *(Code 605 Product Name)*
22. 605-P *(Code 605 Problem Info Name)*

### B. Complaint Resolution Report
Loops over `vm.reports` (List of `CompReport`) and outputs the exact summarized data shown in the UI.

**Columns Generated:**
1. Branch
2. Resolution Status
3. Total Complaints
4. Average Resolution Time (days)

### C. Complain Handling Logs
Loops over `vm.lstLogs` (List of `System_Logs`).

**Columns Generated:**
1. Activity Type
2. Request ID
3. Create Date *(dd-MM-yyyy)*
4. Description
5. Changed Fields
6. Description File
7. User Input
8. User Otor

## 4. Data Access Layer & SQL Queries (`ComphandDaoImpl.java`)
This class uses `HibernateDaoSupport` to execute native SQL queries. Here are the core queries used.

### A. Complaint Handling Report Summary Query (`lstCompRpt`)
This query powers the UI summary grid. It uses a `UNION` across all 60X lookup tables to count complaints grouped by product and problem types.

```sql
SELECT PRODUCT_TYPE, PROBLEM_TYPE, FREK FROM (
    SELECT COUNT(c.REQUEST_ID) AS FREK,
        '601-' || c6.PRODUCT_NAME AS PRODUCT_TYPE,
        c6i.PRODUCTINFO_NAME AS PROBLEM_TYPE,
        '601' AS KODE, c.CODE_601_PRODUCT as RPOD, c.CODE_601_PROBLEM as PROB
    FROM COMPLAINTS c, CODE_601 c6, CODE_601_INFO c6i
    WHERE c.CODE_601_PRODUCT = c6.PRODUCT_CODE
    AND c.CODE_601_PROBLEM = c6i.PRODUCTINFO_CODE
    AND TRIM(c.CODE_601_PRODUCT) IS NOT NULL
    AND TRIM(c.CODE_601_PROBLEM) IS NOT NULL
    AND c.ISDELETED = 'N'
    GROUP BY c.CODE_601_PRODUCT, c.CODE_601_PROBLEM, c6.PRODUCT_NAME, c6i.PRODUCTINFO_NAME, '601'

    UNION
    -- The above block repeats for 602, 603, 604, and 605 (e.g. CODE_602, CODE_602_INFO, etc.)
) RESULT ORDER BY KODE, RPOD, PROB
```

*(Note: When `lstCompRptByFilter` is called, `AND TRUNC(c.RECEIVED_DATE) BETWEEN :sDate AND :eDate` is appended to the `WHERE` clause.)*

### B. Complaint Resolution Report Query (`lstCompResRpt`)
This query groups data by branch and calculates counts and averages based on the completion date.

```sql
SELECT BRANCH_CODE, KET, FREK, RATA FROM (
    -- Pending Complaints
    SELECT BRANCH_CODE, 'Pending' AS KET, COUNT(REQUEST_ID) AS FREK, 0 AS RATA
    FROM COMPLAINTS
    WHERE ISDELETED = 'N' AND COMPLETION_DATE IS NULL
    GROUP BY BRANCH_CODE

    UNION

    -- Resolved Complaints
    SELECT BRANCH_CODE, 'Resolved' AS KET, COUNT(REQUEST_ID) AS FREK, AVG(AGING) AS RATA
    FROM COMPLAINTS
    WHERE ISDELETED = 'N' AND COMPLETION_DATE IS NOT NULL
    GROUP BY BRANCH_CODE
) ORDER BY BRANCH_CODE
```

### C. Detailed Data Query for Excel Export (`lstCompDataByFilter`)
This query fetches the comprehensive raw data used for exporting the "Complaint Handling Report" to Excel.

```sql
SELECT co.REQUEST_ID, co.SETTLEMENT_NUMBER, co.EXTENSION_NUMBER, co.CUSTOMER_NAME, co.LOCATION,
       co.CHANNEL, co.CITY_CODE, co.BRANCH_CODE, co.AMOUNT, co.ATM_CARD_NUMBER, co.DESCRIPTION,
       co.RECEIVED_DATE, co.INCIDENT_DATE, co.COMPLETION_DATE,
       co.CODE_601_PRODUCT, co.CODE_601_PROBLEM, co.CODE_602_PRODUCT, co.CODE_602_PROBLEM,
       co.CODE_603_PRODUCT, co.CODE_603_PROBLEM, co.CODE_604_PRODUCT, co.CODE_604_PROBLEM,
       co.CODE_605_PRODUCT, co.CODE_605_PROBLEM,
       co.PENGADUAN_FILE_PATH, co.PENYELESAIAN_FILE_PATH, co.PERPANJANGAN_FILE_PATH,
       co.USER_INPUT, co.USER_OTOR, co.AGING, co.ISDELETED
FROM COMPLAINTS co, CITY c, BRANCH b
WHERE co.ISDELETED = 'N'
  AND co.CITY_CODE = c.CITY_CODE
  AND co.BRANCH_CODE = b.BRANCH_CODE
  AND (
      TRUNC(co.RECEIVED_DATE) BETWEEN :sDate AND :eDate OR
      TRUNC(co.INCIDENT_DATE) BETWEEN :sDate AND :eDate OR
      TRUNC(co.COMPLETION_DATE) BETWEEN :sDate AND :eDate OR
      UPPER(co.REQUEST_ID) LIKE :key OR
      UPPER(co.CUSTOMER_NAME) LIKE :key OR
      UPPER(c.CITY_NAME) LIKE :key OR
      UPPER(b.BRANCH_NAME) LIKE :key
  )
ORDER BY REQUEST_ID DESC
```

## Core Logic & Validation Rules to Implement in New App
1. **Data Source Distinction**: The UI shows grouped report summaries, but the "Handling Report" Excel export downloads the raw detailed data instead of the summary grid. This logic needs to be properly replicated or re-verified with stakeholders.
2. **Date Validations**: End Date must not be earlier than Start Date.
3. **Hardcoded IDs / Lookups**: The summary report manually constructs product types using hardcoded prefixes ('601-', '602-', etc.) in the SQL query.
4. **Audit Logging**: Every report download triggers a `System_Logs` database entry via `comphandBo.insProcToLogs(sysLogs)`. This auditing requirement is crucial for compliance and must be implemented.