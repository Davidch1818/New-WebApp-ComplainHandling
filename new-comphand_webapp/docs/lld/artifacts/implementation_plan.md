# Markdown Documentation Audit and Modernization

The goal of this plan is to ensure that all documentation in the `/docs` folder strictly adheres to the "Clean Room Test." The rewritten docs will abstract away legacy implementation details (like Hibernate, ZK Framework, sessionScope) and replace them with universally understandable functional requirements. We will also introduce newly discovered edge cases and hardcoded logic from the legacy Java codebase.

## User Review Required
Please review the proposed changes below. Once approved, I will systematically overwrite the Markdown files with these exact updates and include a brief changelog at the top of each file.

## Open Questions
- Is the hardcoded `SandiPelapor = "157001"` found in the legacy `LLDComposer` for forms LLD2, LLD3, and LLD4 intentional business logic, or should it be derived dynamically in the new application? For now, I will document it as an explicit functional requirement.

## Proposed Changes

### Documentation Files

#### [MODIFY] [bulk_upload_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/bulk_upload_spec.md)
- **Remove:** ZK Framework specific terminology (`byte[] buffer = new byte[1024 * 100]`, `periodelabel.getValue()`, `LldBoImpl`, `LldDaoImpl`).
- **Add:** Hidden data transformation logic: 
  - Number fields must strip commas before parsing.
  - Empty string fallbacks for numbers must explicitly default to `0.0`.
  - Date segment fallbacks for specific fields (e.g., Year defaults to "0000", Month/Day defaults to "00").
  - System must auto-generate a temporary ID (legacy used "x").

#### [MODIFY] [data_architecture.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/data_architecture.md)
- **Remove:** Oracle DB, Hibernate ORM, `JExcelApi`, `.zul`, `LldNewDaoImpl.java`.
- **Add:** Exhaustive data mapping contracts for the remaining forms (LLD2, LLD3, LLD4), documenting exactly what data structures the new Next.js / Python system will use without referencing Java reflection.
- **Add:** Fallback defaults discovered (e.g., Sandi Pelapor = "157001").

#### [MODIFY] [data_management_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/data_management_spec.md)
- **Remove:** ZK Framework, `LLDComposer.java`, `onClick$saveBtn`, `sessionScope`, JAX-WS, `LldBoImpl`, Hibernate, `Lld1.java`, SQL `INSERT` specifics.
- **Add:** Implicit State Dependencies: Define the functional requirement for maintaining pagination state and editing context.
- **Add:** Discovered Hidden Logic: `posisiAkhir` (Final Balance) in LLD2 is implicitly calculated as `Awal + Debet - Kredit + Lainnya`. The new frontend must enforce this calculation before saving.

#### [MODIFY] [master_data_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/master_data_spec.md)
- **Remove:** ZK framework CRUD patterns, `Posisi.java`, `Pilihan.java`, JAX-WS Web Service, Hibernate.
- **Add:** Define the functional schema for Master Data and explicitly state how the new application should cache and serve this data (since it governs regulatory formatting).

#### [MODIFY] [regulatory_reporting_spec.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/regulatory_reporting_spec.md)
- **Remove:** `LLDComposer.onClick$cetak()`, Web Service client (`selectLLD`), Java fields, `StringBuilder`.
- **Add:** Exhaustive Data Padding Rules extracted from legacy `StringFormat`:
  - `NUMBER`: Remove decimals, pad left with "0". If negative, replace "-" with "0" and prepend "-".
  - `STRING`: Pad right with spaces.
  - `STRNUM`: Pad right with "0".
- **Add:** Explicit header generation rules (e.g., JENIS_LAPORAN = form, PERIODE_LAPORAN = YYYYMM, JUMLAH_RECORD_ISI).

#### [MODIFY] [system-architecture.md](file:///c:/Users/ravinun.s/OneDrive%20-%20KASIKORNBANKGROUP/เอกสาร/workspace/lld/docs/system-architecture.md)
- **Remove:** Java Enterprise architecture, ZK Framework (ZKoss), `.zul`, `GenericForwardComposer`, JAX-WS, Hibernate ORM, `sessionScope`.
- **Add:** The new target architecture (Next.js Frontend, Python Backend, REST/GraphQL APIs, State Management via React Context/Redux, DB agnostic).
- **Add:** Ensure that all functional flows dictate the expected behavior seamlessly without leaking legacy class names.

## Verification Plan
1. Ensure all Markdown files contain a changelog at the top.
2. Confirm that all references to Java, ZK, Hibernate, JAX-WS, and specific legacy method names are entirely removed.
3. Validate that a developer reading only the updated `/docs` folder would know exactly how to format the `.txt` files, validate the `.xls` uploads, apply fallbacks, and compute dependent values (like LLD2's `posisiAkhir`).
