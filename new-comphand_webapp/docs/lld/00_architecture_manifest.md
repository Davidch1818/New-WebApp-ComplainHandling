# AI System Directive

> [!IMPORTANT]
> **AGENT INSTRUCTION**: This is the root manifest. You MUST read and analyze this file first during every session to understand the system context before modifying any code or reading sub-modules.

# System Architecture Manifest

This document serves as the master index for the LLD (Lalu Lintas Devisa) regulatory reporting system documentation. It provides a structured overview of all architectural blueprints, domain modules, and data contracts to ensure a unified understanding across all AI agents and human engineers.

## Reading Order & Dependency Hierarchy

To fully grasp the system's architecture and functional workflows, review the documentation in the following sequence:

1. **Read** `system-architecture.md` to understand the high-level goals and technical stack.
2. **Read** `data_architecture.md` to understand the persistent storage contracts and fallback logic.
3. **Read** `master_data_spec.md` to understand the critical configurations that drive UI dropdowns and final report formatting.
4. **Read** `data_management_spec.md` and `bulk_upload_spec.md` to understand the two primary methods of transactional data ingress.
5. **Read** `regulatory_reporting_spec.md` last to understand how all aggregated data is ultimately transformed and exported.

---

## Source Code Location

All backend business logic and endpoints for this module reside in **`programs/lld/`**. 
Core shared utilities and the UAM integration reside in **`core_shared/`**.

---

## File Directory Mapping & Module Summaries

### Core Architecture & Data Models

#### 1. [system-architecture.md](./system-architecture.md)
This module establishes the foundational blueprint for the LLD system, detailing the transition to a modern Next.js and Python architecture. Its primary functional purpose is to outline the end-to-end user workflows, from data entry to final regulatory generation. It defines the technical boundaries, explicitly separating stateful frontend navigation from stateless backend APIs.

#### 2. [data_architecture.md](./data_architecture.md)
This module dictates the persistent storage structures and the strict data schemas required for the various regulatory forms (LLD1, LLD2, LLD3, LLD4, RKD1, RKD2). Its functional purpose is to guarantee that the new system explicitly handles legacy data structures, mappings, and discovered fallback logic (such as hardcoded reporter codes). It provides the exact entity definitions that the database ORM must enforce.

---

### Master Data & Configuration

#### 3. [master_data_spec.md](./master_data_spec.md)
This module defines the static registry for application configurations, lookup choices, and customs office identifiers. Its functional purpose is to detail the underlying schemas that drive dynamic UI dropdowns and the strict position mapping (`Posisi`) used for flat-file generation. It mandates an aggressive caching strategy for these low-volatility, high-read data sets.

---

### Transactional Data Ingress

#### 4. [data_management_spec.md](./data_management_spec.md)
This module outlines the manual data entry workflows used by banking officers to view, add, edit, and delete single foreign exchange records. Its functional purpose is to map UI interactions to backend CRUD operations while enforcing implicit frontend state management. It also documents critical hidden business logic, such as the dynamic calculation required for the `posisiAkhir` field in LLD2 forms.

#### 5. [bulk_upload_spec.md](./bulk_upload_spec.md)
This module specifies the automated, high-volume ingestion workflow for processing spreadsheet (`.xls`/`.xlsx`) uploads. Its primary functional purpose is to replace historical data safely by explicitly validating the embedded reporting period against the active UI context before processing. It dictates strict data transformation rules, including comma stripping, date parsing fallbacks, and temporary identifier generation.

---

### Egress & Reporting

#### 6. [regulatory_reporting_spec.md](./regulatory_reporting_spec.md)
This module defines the final generation process that translates aggregated database records into Bank Indonesia's strictly required fixed-width flat files. Its functional purpose is to govern the exact string manipulation logic, detailing how numbers are stripped of decimals and padded with zeros, and how strings are padded with spaces. It explicitly defines the mandatory header structures and file construction sequences.
