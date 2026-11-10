> **CHANGELOG - Clean Room Audit**
> * Added undocumented string manipulation logic (`trim().replace("'", "")`).
> * Documented string compilation delimiters (`#`).
> * Included missing row prefixes (`1A`, `1G`) and header constants (`010`).
> * Specified hardcoded decimal formatting logic and dummy padding values.

# Master Data & Hardcoded Values

The application logic, particularly within `PayrollNasabahViewModel.java`, suffers from severe hardcoding of business rules and master data.

**Location**: `src/java/id/co/bankmaspion/intranet/payroll/viewmodel/PayrollNasabahViewModel.java`

**Identified Hardcoded Data:**

1. **GL Account Mappings:** Transaction partner codes are evaluated via an `if-else` chain using `.contains()` to determine General Ledger codes. 
   - `"AXA"` -> `2130070000000005000`
   - `"614"` -> `2130070000000009000`
   - `"1002"` -> `2130070000000004000`
   - `"QRIS"` -> `5020190200000001000`
   - `"K4P"` -> `4021990200101003000`
   - `"5009"` -> `2130070000000005000`
   - `"PRIM"` -> `5020190200000001000`
   - `"JALI"` -> `4021990200201003000`
   - `"2001"` -> `9991011053         ` (Includes trailing spaces)
   - `"MDR1"` -> `4020070109900014000`
   - `"MDR2"` -> `5020190200000001000`
   - `"SIRQ"` -> `5020190200000002000`
   - `"WITH"` -> `5030999900000999000`
   - `"WAIV"` -> `4021990100000001000`
   - `"LLG1"` -> `5020190200000001000`
   - `"RTGS"` -> `5020190200000001000`
   - `"EQUI"` -> `2130070000000005000`
   - `"LOSS"` -> `5020130000000004000`
   - `"2RDM"` -> `5020190200000001000`
   - `"BPCR"` -> `5011990400000001000`

2. **Magic Strings and Narratives:**
   - `"Pembayaran gaji bulanan"` (Hardcoded transaction description for Mode 0).
   - `"MANY TO MANY"` (Hardcoded batch description for Mode 1).
   - `"010"` (Hardcoded M2M settlement constant appended to the header).
   - Expected Excel content types: `"application/vnd.ms-excel"`.

3. **Prefixes and Indicators:**
   - `"1001"`: Detail line prefix for Mode 0.
   - `"1A"`: Customer account double-entry prefix for Mode 1.
   - `"1G"`: General ledger double-entry prefix for Mode 1.

4. **Internal State Markers:**
   - `"#"`: Used as an in-memory line delimiter before splitting the compiled payload block for file writing.

5. **Padding and Formatting Constraints:**
   - **Mode 0 Name Sanitization:** `Nama` explicitly strips quotes and whitespace via `.trim().replace("'", "")`.
   - **Mode 0 Numeric:** Uses `#.00` formatting. Requires a hardcoded second identical `0.00` nominal block.
   - **Mode 1 Numeric:** Uses `%.0f` (no decimal) formatting.
   - Heavy use of hardcoded padding sizes (e.g., `20`, `40`, `19`, `21`) intertwined with hundreds of explicitly injected space characters `" "`.
