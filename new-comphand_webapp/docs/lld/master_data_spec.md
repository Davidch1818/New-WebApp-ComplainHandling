# Changelog
- **Added:** Defined functional schema for Master Data configuration arrays.
- **Added:** Caching and serving strategy for regulatory formatting dependencies.
- **Removed:** ZK framework CRUD patterns, specific Java classes (`Posisi`, `Pilihan`), and Hibernate implementation details.

# Master Data & Configuration Module Specification

## Module Overview
The Master Data & Configuration Module manages the static configurations, lookup codes, and formatting metadata required by the rest of the application. It acts as the internal system registry for application administrators, driving dynamic dropdowns and controlling the strict formatting required for flat-file generation.

## Functional Flows & Scenarios
1. **Configuration Management:** Administrators can add, edit, or remove master records.
2. **Posisi (Position) Maintenance:** Admins define the flat-file position mapping. For example, dictating that the "Nomor Transaksi" field starts at byte 10, ends at byte 25, has a length of 15, and is of a specific Data Type (`STRING`, `NUMBER`, or `STRNUM`).
3. **Lookup Data:** Maintenance of reporting choices/dropdowns (`Pilihan`) and customs data identifiers (`Pabean`) used across the application forms.

## Technical Flows & Data Life Cycle
- **Standard CRUD Operations:** This module provides standard interfaces to interact with underlying administrative database tables or configuration files.
- **Stateless Persistence:** Operations are executed statelessly via backend APIs and persisted to the underlying datastore.
- **Caching Strategy:** Because this configuration data (especially `Posisi`) strictly dictates the output formatting for regulatory reports, it is queried thousands of times during report generation. The system MUST implement an aggressive caching layer (e.g., Redis or in-memory cache) because this data exhibits extremely low volatility but high read volume.

## Schema Definitions
The functional representation of these master data structures are as follows:

*   **Pilihan (Choices):** A key-value definition store containing `{ NAMA_FIELD, NILAI, KETERANGAN }`.
*   **Pabean (Customs):** Customs codes containing `{ KODE_PABEAN, NAMA_KANTOR }`.
*   **Posisi (Positions):** Regulatory mapping containing `{ FORM, FIELD, AWAL (Start), PANJANG (Length), AKHIR (End), TIPE (Type) }`.

## Interface & Dependencies
### Inbound Dependencies
- **Admin Inputs:** Configuration input provided by System Administrators.

### Outbound Dependencies
- **Regulatory Reporting Module:** Supplies `Posisi` configurations necessary to construct the fixed-width text files exactly to specification.
- **Data Management Module:** Supplies `Pilihan` and `Pabean` codes for populating frontend UI dropdowns and performing input data validation.
