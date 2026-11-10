> **CHANGELOG - Clean Room Audit**
> * Added precise header formatting (`0UPLM2MPAYMINUS` sequence).
> * Documented critical number formatting difference (`%.0f` vs `#.00`).
> * Added `#` string concatenation delimiter logic.
> * Detailed the `1A` and `1G` constant prefixes for double entries.

# Technical Specification: Many-to-Many (M2M) Settlement Module

## 1. Module Overview
The **Many-to-Many (M2M) Settlement Module** is a specialized clearing engine designed to handle complex partner transaction settlements. It dynamically maps uploaded spreadsheet rows to internal General Ledger (GL) accounts and enforces strict double-entry accounting (Debit/Credit balancing) before exporting the final clearing payload (`DATAHASILM2M.txt`).

## 2. Local Functional Flows & Scenarios
*   **Dynamic GL Routing:** Scans the target product/partner code in the spreadsheet (e.g., `AXA`, `QRIS`, `LLG1`). Maps these identifiers to specific 19-digit internal General Ledger codes via partial string matching (`contains`).
*   **Double-Entry Generation:** For every single spreadsheet row, the system generates **two** output lines to ensure clearing accounts balance:
    1.  An Account operation line (prefixed with `"1A"`).
    2.  A General Ledger operation line (prefixed with `"1G"`).
*   **Debit/Credit Reconciliation:** Evaluates the `Tanda` (sign) column:
    *   *Credit Scenario (`+`):* The customer's account (`1A`) receives a Credit flag (`C`); the corresponding GL account (`1G`) receives a Debit flag (`D`).
    *   *Debit Scenario (`-`):* The customer's account (`1A`) receives a Debit flag (`D`); the corresponding GL account (`1G`) receives a Credit flag (`C`).

## 3. Local Technical Flows & Data Life Cycle
*   **Internal Components:** `PayrollNasabahViewModel.java` (Mode 1 execution branch), JExcelAPI (`jxl.Workbook`).
*   **Lookup Engine:** Utilizes Java string matching (`shft.getKode().contains(...)`) mapped against hardcoded `if-else if` control blocks to assign the `kodeGL` variable. *(Technical Debt Note: Requires codebase recompilation for new GL mappings).*
*   **Payload Construction:**
    *   Reads cell data identically to standard payroll but applies double-entry formatting logic.
    *   *Formatting Deviation:* Unlike standard payroll which uses `#.00` formatting, M2M formats currency (`Nominal`) as a whole number using `%.0f` and left-pads to 21 characters with `"0"`.
    *   *Memory Constraint:* Every generated double-entry line is appended to a memory string (`kontenTxt`), separated by a `#` delimiter.
*   **Header Layout:** Constructs the fixed-width header string identically as follows: `"0UPLM2MPAYMINUS"` + `"MANY TO MANY"` (right-padded to 40 spaces) + `"IDR"` + Record Count Multiplied By 2 (left-padded to 5 zeros) + Current Date (`yyyyMMdd`) + `"010  "` (settlement constant padded to 5 spaces).
*   **File Output:** Splits the `kontenTxt` string by the `#` delimiter to write individual lines to the `DATAHASILM2M.txt` output file.

### M2M Double-Entry Logic Flow

```mermaid
flowchart TD
    A[Read Excel M2M Row] --> B[Evaluate 'Kode' via Substring]
    B --> C[Map to 19-digit kodeGL]
    C --> D{Check 'Tanda' (+/-)}
    D -->|+ (Credit)| E[Account 1A gets 'C']
    D -->|+ (Credit)| F[GL 1G gets 'D']
    D -->|- (Debit)| G[Account 1A gets 'D']
    D -->|- (Debit)| H[GL 1G gets 'C']
    E & F & G & H --> I[Format Nominal %.0f & Pad Strings]
    I --> J[Append row to memory with # delimiter]
    J --> K[Split by # and write to DATAHASILM2M.txt]
```

## 4. Interface & Dependencies
*   **Inbound Dependencies:**
    *   Requires a validated, staged `.xls` file on the local file system.
    *   Triggered only when the execution mode parameter is set to `1` (Many to Many).
*   **Outbound Dependencies:**
    *   Produces a strictly formatted, double-entry balanced `DATAHASILM2M.txt` file written to the local disk.
    *   Returns execution control and the output file path back to the *File Ingestion & Delivery Module* for download delivery.
