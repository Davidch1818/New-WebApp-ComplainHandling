> **CHANGELOG - Clean Room Audit**
> * Completely rewrote to include exact byte-for-byte visual maps of fixed-width output structures.
> * Documented hidden dummy padding columns, precise whitespace counts, and undocumented zero formatting (`#.00` vs `%.0f`).
> * Addressed the missing header structures and date formatting parameters for both Mode 0 and Mode 1 payloads.

# File-Based Data Structures

A significant portion of the application acts as a file conversion engine, reading input files from users and outputting strictly formatted core banking interface files.

### Input File Format
- **Type**: Legacy Excel Document (`.xls` only, via JExcel API).
- **Structure**:
  - Row 0 is the header row (skipped).
  - Columns parsed starting from Row 1:
    - **Col 0:** `Kode` (Transaction/Partner Code, e.g., AXA, QRIS)
    - **Col 1:** `No Rekening` (Account Number)
    - **Col 2:** `Nominal` (Amount)
    - **Col 3:** `Tanda` (`+` or `-` indicator for credit/debit)
    - **Col 4:** `No Ref` (Reference Number)
    - **Col 5:** `Nama` (Account Name)

---

### Output File Formats
The application generates two fixed-width text files depending on the selected mode. Below are the byte-for-byte exact data contracts that must be replicated perfectly.

#### 1. `DATAHASIL.txt` (Mode 0 - Payroll Group)

**Header Definition:**
1. Prefix: `"0PAYGROUP"` (9 chars)
2. Record Count: Left-padded with `"0"` to 5 chars.
3. Timestamp: `yyyyMMddHHmmss` format (14 chars).
4. Total Sum Nominal: Formatted as `#.00`, left-padded with `"0"` to 21 chars.
5. Current Date: `yyyyMMdd` format (8 chars).

**Detail Record Layout:**
| Position | Element | Length / Padding Rule | Format Detail |
| :--- | :--- | :--- | :--- |
| 1 | Prefix | 4 chars | `"1001"` |
| 2 | No Ref | 20 chars | Right-padded with spaces |
| 3 | Nama | 40 chars | `.trim().replace("'", "")` then right-padded with spaces |
| 4 | Spacer 1 | 15 chars | 15 empty spaces (`"           " + "    "`) |
| 5 | No Rekening | 19 chars | Right-padded with spaces |
| 6 | Spacer 2 | 292 chars | 292 empty spaces (7 blocks of 40, plus 12 spaces) |
| 7 | Currency Code | 3 chars | `"IDR"` |
| 8 | Nominal | 21 chars | Formatted as `#.00`, left-padded with `"0"` |
| 9 | Dummy Nominal | 21 chars | Always `"0"`, formatted as `#.00`, left-padded with `"0"` |
| 10 | Description | 40 chars | `"Pembayaran gaji bulanan"`, right-padded with spaces |
| 11 | Spacer 3 | 43 chars | 43 empty spaces |

*(Note: During memory construction, each row is appended with a `#` which is later used to split the string into individual lines before file writing).*

---

#### 2. `DATAHASILM2M.txt` (Mode 1 - Many To Many)

**Header Definition:**
1. Prefix: `"0UPLM2MPAYMINUS"` (15 chars)
2. Batch Name: `"MANY TO MANY"`, right-padded to 40 spaces.
3. Currency Code: `"IDR"` (3 chars)
4. Double Entry Record Count: Original record count multiplied by 2, left-padded with `"0"` to 5 chars.
5. Current Date: `yyyyMMdd` format (8 chars).
6. Settlement Constant: `"010"`, right-padded to 5 spaces.

**Detail Record Layout (Two lines generated per input row):**

*Line 1: Customer Account Operation (1A)*
| Position | Element | Length / Padding Rule | Format Detail |
| :--- | :--- | :--- | :--- |
| 1 | Prefix | 2 chars | `"1A"` |
| 2 | No Rekening | 19 chars | Right-padded with spaces |
| 3 | D/C Flag | 1 char | `"C"` (if `Tanda` +) or `"D"` (if `Tanda` -) |
| 4 | Nominal | 21 chars | Formatted as `%.0f` (whole number), left-padded with `"0"` |
| 5 | Nama | Variable | Unpadded string append |

*Line 2: General Ledger Operation (1G)*
| Position | Element | Length / Padding Rule | Format Detail |
| :--- | :--- | :--- | :--- |
| 1 | Prefix | 2 chars | `"1G"` |
| 2 | Kode GL | 19 chars | Exact 19-digit GL string |
| 3 | D/C Flag | 1 char | `"D"` (if `Tanda` +) or `"C"` (if `Tanda` -) |
| 4 | Nominal | 21 chars | Formatted as `%.0f` (whole number), left-padded with `"0"` |
| 5 | Nama | Variable | Unpadded string append |
