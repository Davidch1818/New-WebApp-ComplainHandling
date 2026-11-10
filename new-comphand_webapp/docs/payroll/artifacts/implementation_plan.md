# Clean Room Audit & Documentation Revision Plan

## Goal Description
Conduct a strict "Clean Room" audit of the `/docs` directory against the legacy `PayrollNasabahViewModel.java` codebase to ensure 100% functional parity for a completely new Next.js & Python engineering team. 
The current documentation has severe gaps in data contracts, precise string manipulation logic, implicit formatting decisions, and file structuring, which would lead to functional mismatches if handed to a clean-room team. This plan outlines the exact discrepancies discovered and the files that will be rewritten.

## Open Questions
No open questions. The legacy logic is straightforward but highly esoteric, and the documentation just needs to explicitly state every single padding, format, and mathematical anomaly.

## Proposed Changes

### Documentation Updates

#### [MODIFY] [bulk_payroll_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/bulk_payroll_spec.md)
- **Add Missing Logic**: Note the implicit `#` string concatenation and splitting mechanism for lines.
- **Add Missing Logic**: Expose the name sanitization rule: `.trim().replace("'", "")`.
- **Add Data Contract**: Detail the precise header construction: `0PAYGROUP` + Count (5 chars, left padded with 0) + Timestamp (`yyyyMMddHHmmss`) + Total Sum (21 chars, left 0, `#.00` format) + Date (`yyyyMMdd`).
- **Add Data Contract**: Detail the trailing dummy nominal value (`0.00` padded to 21 chars).

#### [MODIFY] [m2m_clearing_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/m2m_clearing_spec.md)
- **Add Missing Logic**: Highlight the number formatting deviation: M2M uses `%.0f` (whole numbers, no decimals) left-padded with 0 to 21 characters, contrasting with Mode 0's `#.00`.
- **Add Missing Logic**: Explicit `#` string concatenation and splitting.
- **Add Data Contract**: Explicit header formulation: `0UPLM2MPAYMINUS` + "MANY TO MANY " (padded to 40) + "IDR" + Count*2 (5 chars, 0 padded) + `yyyyMMdd` + "010  " (padded to 5 chars).

#### [MODIFY] [file-structures.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/file-structures.md)
- **Revise and Overwrite**: Rewrite to provide exact byte-for-byte visual maps of the fixed-width structures for `DATAHASIL.txt` and `DATAHASILM2M.txt`. The current version says "heavily padded string concatenation" which fails the clean-room test. Every single space and block size must be declared.

#### [MODIFY] [master-data.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/master-data.md)
- **Add Missing Logic**: Include the `010` M2M settlement constant.
- **Add Missing Logic**: Include the dummy nominal value logic.
- **Add Missing Logic**: Detail the `1A` and `1G` constants for M2M rows.

#### [MODIFY] [system-architecture.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/%E0%B9%80%E0%B8%AD%E0%B8%81%E0%B8%AA%E0%B8%B2%E0%B8%A3/workspace/payroll/docs/system-architecture.md)
- **Add Missing Logic**: Mention the filesystem path resolution `getClass().getProtectionDomain().getCodeSource().getLocation().getPath()` which implies the temp file is saved directly into the deployed `.war` or classpath directory, and the potential constraints this introduces.

## Verification Plan
1. **Manual Verification**: Review the revised documentation against the `PayrollNasabahViewModel.java` to ensure no "magic strings" or undocumented methods (like `.trim()`) exist exclusively in the Java file without representation in the `.md` documentation.
