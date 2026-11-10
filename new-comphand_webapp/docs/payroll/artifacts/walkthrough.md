# Clean Room Audit Walkthrough

The legacy codebase analysis revealed highly esoteric behavior that was completely omitted from the original documentation. A new engineering team given the old documentation would have failed the "Clean Room" test due to strict string formats and formatting bugs in the legacy payload construction not being conveyed in the spec.

I have aggressively refactored the `/docs` directory to embed exact 1:1 business parity derived from `PayrollNasabahViewModel.java`.

## Critical Findings & Actions Taken

### 1. File Structure Hardcoding (Byte-for-Byte Mapped)
**Finding:** The original documentation referenced "heavily padded string concatenation" without supplying the mapping constraints. The code uses hundreds of raw `" "` spaces, different `.00` vs `%.0f` formatters, and undocumented dummy columns.
**Action:** Overwrote `file-structures.md` with an exact layout grid for both `DATAHASIL.txt` and `DATAHASILM2M.txt`.
- [MODIFY] [file-structures.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/file-structures.md)

### 2. Silent Logic Constraints
**Finding:** We identified hidden sanitization on the `Nama` variable: `.trim().replace("'", "")` that stripped quotes and whitespace. Furthermore, the nominal value format dynamically changes across Modes (Mode 0 uses `#.00` and pads a dummy `0` column; Mode 1 uses `%.0f` whole numbers without a dummy).
**Action:** These differences were codified explicitly into the specifications and master data sheets.
- [MODIFY] [bulk_payroll_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/bulk_payroll_spec.md)
- [MODIFY] [m2m_clearing_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/m2m_clearing_spec.md)
- [MODIFY] [master-data.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/master-data.md)

### 3. Delimiter Split Parsing
**Finding:** The application doesn't write rows linearly. It aggregates an infinite string appending `#` as a delimiter, and subsequently splits this giant string block by `#` just before streaming the buffer to the `PrintWriter`.
**Action:** Refactored flowcharts and descriptions to indicate this memory manipulation before the write execution.
- [MODIFY] [system-architecture.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/system-architecture.md)

## Next Steps
With the documentation rewritten to exact constraints, you can confidently hand this `/docs` folder over to the Next.js and Python developers. They will be able to construct identical byte-for-byte `.txt` exports matching the legacy system.
