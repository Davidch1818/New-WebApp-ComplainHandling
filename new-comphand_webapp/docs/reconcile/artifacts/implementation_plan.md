# Clean Room Audit & Documentation Overhaul

The objective is to audit and rewrite the documentation in the `/docs` directory to act as a 100% functional blueprint for the next generation of our platform (Next.js & Python). This ensures a clean room migration where the new team requires zero access to the legacy source code.

## User Review Required

Please review the proposed approach. Given the scope (4 different systems: BIFast, PAC JALIN PLN, Prima QRIS, Telkom), I plan to systematically audit each system one by one. I will use subagents to execute this efficiently if you approve the strategy.

## Proposed Changes

We will conduct a "Clean Room Test" on the 4 sub-programs. For each system, we will:
1. **Identify Hidden Logic**: Analyze the legacy source code for undocumented edge cases, silent error swallowing, regex validations, hardcoded data transformations, and implicit state dependencies.
2. **Abstract the Implementation**: Refactor the `.md` files to describe *what* the system does (functional logic) rather than *how* the legacy language implements it. We will remove all legacy framework-specific syntax.
3. **Verify Data Contracts**: Ensure all API payloads, DB transactions, and config maps are exhaustively detailed.
4. **Revise and Overwrite**: Rewrite failing `.md` files, injecting a brief changelog at the top explaining what critical logic was added.

### BIFast
- Cross-reference `Rekon BIFast/` source code against `docs/Rekon BIFast/` markdown files.
- Update `Data_Architecture.md`, `mod_file_ingestion.md`, `mod_reconciliation_engine.md`, `mod_reporting_export.md`, `system-architecture.md` as necessary.

### PAC JALIN PLN
- Cross-reference `Rekon PAC JALIN PLN/` source code against `docs/Rekon PAC JALIN PLN/` markdown files.
- Update `Data_Architecture.md`, `mod_file_ingestion.md`, `mod_pln_monthly.md`, `mod_reconciliation_engine.md`, `mod_reporting_export.md`, `system-architecture.md` as necessary.

### Prima QRIS
- Cross-reference `Rekon Prima QRIS/` source code against `docs/Rekon Prima QRIS/` markdown files.
- Update `Data_Architecture.md`, `mod_file_ingestion.md`, `mod_journal.md`, `mod_master_data.md`, `mod_outstanding.md`, `mod_reconciliation_engine.md`, `mod_reporting_export.md`, `system-architecture.md` as necessary.

### Telkom
- Cross-reference `Rekon Telkom/` source code against `docs/Rekon Telkom/` markdown files.
- Update `Data_Architecture.md`, `mod_file_ingestion.md`, `mod_reconciliation_engine.md`, `mod_reporting_export.md`, `system-architecture.md` as necessary.

## Verification Plan

### Manual Verification
- Review the modified `.md` files to ensure they contain all hardcoded mapping, precise data flow requirements, and logic previously hidden in the source code.
- Ensure the newly updated `.md` files do not reference legacy frameworks but map out logic uniformly.
