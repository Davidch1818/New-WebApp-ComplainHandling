# Customer Payroll Handling System - Architecture Manifest

> [!IMPORTANT]
> **AGENT INSTRUCTION**: This is the root manifest. You MUST read and analyze this file first during every session to understand the system context before modifying any code or reading sub-modules.

## Source Code Location

All backend business logic and endpoints for this module reside in **`programs/payroll/`**.
Core shared utilities and the UAM integration reside in **`core_shared/`**.

## File Directory Mapping & Module Summaries

### 1. [system-architecture.md](./system-architecture.md)
This document outlines the overarching architectural design, dual-mode execution flow, and application state constraints of the system. Its primary functional purpose is to explain the end-to-end journey from UI initialization via ZK Framework to final file output. Key technical interfaces include the Model-View-ViewModel (MVVM) bindings and local filesystem storage bindings used for byte-stream processing.

### 2. [database-schemas.md](./database-schemas.md)
This file defines the domain of relational data models and user management entities (such as Karyawan, Pengguna, Cabang). Its functional purpose is to map out the JPA Entity relationships and database structures underlying the application's authentication and organization structure. Key technical interfaces include the schema definitions and Entity-Relationship (ER) diagram for the persistence layer.

### 3. [master-data.md](./master-data.md)
This specification captures all critical legacy hardcoded variables, magic strings, and constant flags. Its functional purpose is to serve as the definitive dictionary for undocumented GL mappings, delimiter strategies, and specialized row prefixes. Key technical interfaces include the routing matrix mapping transaction source codes directly to 19-digit General Ledger accounts.

### 4. [configuration-strategy.md](./configuration-strategy.md)
This document details the transition strategy for decoupling hardcoded business logic into a centralized, modern configuration structure. Its functional purpose is to propose the YAML schema that replaces the legacy in-code `if-else` GL mapping matrix. Key technical interfaces include the proposed externalization schema designed for cloud-native dynamic injection.

### 5. [file_ingestion_and_delivery_spec.md](./file_ingestion_and_delivery_spec.md)
This module specification outlines the front-door gatekeeper logic for user file uploads and downloads. Its functional purpose is to securely capture binary Excel payload streams, validate MIME types natively, and manage the HTTP delivery of the finalized output files. Key technical interfaces include the ZK `UploadEvent` hooks, `FileOutputStream` mechanisms, and `Filedownload.save()` actions.

### 6. [file-structures.md](./file-structures.md)
This reference manual dictates the strict layout, character widths, and whitespace paddings for all fixed-width text file exports. Its functional purpose is to act as a byte-for-byte visual mapping constraint for generating core-banking-compliant payloads. Key technical interfaces include the explicit array positioning and exact string formatters for `DATAHASIL.txt` and `DATAHASILM2M.txt`.

### 7. [bulk_payroll_spec.md](./bulk_payroll_spec.md)
This specification describes the specific execution logic for Mode 0 (Standard Mass Payroll). Its functional purpose is to define how raw spreadsheet records are aggregated and mapped into a direct linear transfer file. Key technical interfaces include the `0PAYGROUP` header construction, string sanitization logic, and specific decimal formatting constraints.

### 8. [m2m_clearing_spec.md](./m2m_clearing_spec.md)
This specification dictates the operational flow for Mode 1 (Many-to-Many Settlement). Its functional purpose is to establish the double-entry accounting generation rules balancing Debit/Credit scenarios across user and General Ledger accounts. Key technical interfaces include the `0UPLM2MPAYMINUS` header formatting and dynamic GL matching implementation.

## Dependency Graph & Recommended Reading Order

To fully comprehend the system and establish a new modern implementation, read the documentation modules in the following hierarchical order:

1. **`system-architecture.md`**: Start here for the top-level understanding of user flows, system boundaries, and execution models.
2. **`database-schemas.md`**: Understand the relational entities, personnel, and organizational constraints that surround the application's users.
3. **`master-data.md`**: Review the hardcoded legacy mappings, dictionaries, and undocumented logic values referenced globally.
4. **`configuration-strategy.md`**: Understand how the hardcoded data from the previous step is planned to be externalized into a modernized configuration setup.
5. **`file-structures.md`**: Absorb the absolute constraints regarding padding, delimiters, and fixed-width formats required for final system parity.
6. **`file_ingestion_and_delivery_spec.md`**: Review the I/O edge layer dealing with client uploads/downloads.
7. **`bulk_payroll_spec.md`**: Review the specific execution branch mapping to standard payrolls.
8. **`m2m_clearing_spec.md`**: Conclude with the most complex execution branch handling double-entry GL routing.
