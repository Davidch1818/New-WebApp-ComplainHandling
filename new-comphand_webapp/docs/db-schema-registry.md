# Database Schema Registry

> **Single PostgreSQL instance** (`bmas_web_db`) on-premise.
> All sub-programs share this database but are isolated via **PostgreSQL schemas**.

## Schema Naming Convention

- All lowercase, snake_case
- Reconciliation modules prefixed with `rekon_`
- Each schema is self-contained — **no cross-schema foreign keys**

## Schema Overview

| # | Schema | Sub-program | Tables | Build Phase |
|---|--------|-------------|--------|-------------|
| 1 | `uam` | User Access Management | 7 | Phase 1 |
| 2 | `rekon_bifast` | BiFast Reconciliation | 6 | Phase 1 (exists as `bifast`, rename) |
| 3 | `rekon_prima` | Prima QRIS Reconciliation | ~20 | Phase 2 |
| 4 | `rekon_pac` | PAC JALIN PLN Reconciliation | 5 | Phase 2 |
| 5 | `rekon_telkom` | Telkom Reconciliation | 5 | Phase 2 |
| 6 | `comphand` | Customer Complaints Handling | 8 | Phase 1 |
| 7 | `lld` | LLD Reporting | 11 | Phase 2 |
| 8 | `payroll` | Payroll | 6 | Phase 2 |

---

## 1. `uam` — User Access Management

Central authentication, authorization, and audit system. Used by **all** sub-programs.

### Tables

| Table | Description |
|-------|-------------|
| `uam.users` | User accounts with password policy fields (status, lockout, must_change_pwd) |
| `uam.password_history` | Last 5 password hashes per user to prevent reuse |
| `uam.roles` | Named roles (e.g., "Reconciliation Officer", "Admin") |
| `uam.permissions` | Menu/function registry (e.g., `reconcile.bifast`, `comphand.view`) |
| `uam.role_permissions` | Many-to-many: which permissions belong to which role |
| `uam.user_roles` | Many-to-many: which roles are assigned to which user |
| `uam.audit_log` | Immutable append-only log of all user actions |

### ER Diagram

```mermaid
erDiagram
    USERS ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ ROLE_PERMISSIONS : "grants"
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "granted_to"
    USERS ||--o{ PASSWORD_HISTORY : "has"
    USERS ||--o{ AUDIT_LOG : "generates"

    USERS {
        UUID id PK
        VARCHAR user_id UK
        VARCHAR full_name
        VARCHAR email
        VARCHAR department
        VARCHAR password_hash
        VARCHAR status
        BOOLEAN must_change_pwd
        TIMESTAMPTZ pwd_changed_at
        INT failed_attempts
        BOOLEAN is_deleted
    }

    ROLES {
        UUID id PK
        VARCHAR name UK
        VARCHAR description
        VARCHAR status
    }

    PERMISSIONS {
        UUID id PK
        VARCHAR code UK
        VARCHAR name
        VARCHAR category
    }

    AUDIT_LOG {
        UUID id PK
        VARCHAR actor_id
        VARCHAR action
        VARCHAR target_type
        VARCHAR target_id
        JSONB detail
        VARCHAR ip_address
        TIMESTAMPTZ created_at
    }
```

---

## 2. `rekon_bifast` — BiFast Reconciliation

> **Migration note:** Currently exists as schema `bifast`. Will be renamed to `rekon_bifast` for naming consistency.

### Tables

| Table | Description |
|-------|-------------|
| `rekon_bifast.t_data_core` | Core system transactions (uploaded CSV) |
| `rekon_bifast.t_data_bifast` | BiFast transactions (uploaded XLSX) |
| `rekon_bifast.t_match` | Matched transactions (core ↔ bifast) |
| `rekon_bifast.t_core_only` | Unmatched core transactions |
| `rekon_bifast.t_bifast_only` | Unmatched BiFast transactions |
| `rekon_bifast.t_config` | Biller/file configuration |

### ER Diagram

```mermaid
erDiagram
    T_DATA_CORE ||--o{ T_MATCH : "matched"
    T_DATA_BIFAST ||--o{ T_MATCH : "matched"

    T_DATA_CORE {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR userid
        DATE tanggalpilih
        VARCHAR session_batch
        VARCHAR inc_out
        VARCHAR nom
        VARCHAR endtoendid
        VARCHAR noreferensi
    }

    T_DATA_BIFAST {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR userid
        VARCHAR business_id
        VARCHAR amount
        VARCHAR status
        DATE tanggalpilih
    }

    T_MATCH {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR userid
        VARCHAR nom
        VARCHAR business_id
        VARCHAR endtoendid
        VARCHAR flag
    }
```

---

## 3. `rekon_prima` — Prima QRIS Reconciliation

### Tables

| Table | Description |
|-------|-------------|
| `rekon_prima.mst_prima` | Prima master data (transaction codes, accounts) |
| `rekon_prima.mst_dd` | Direct Debit master data |
| `rekon_prima.mst_dd2` | Direct Debit master data (secondary) |
| `rekon_prima.mst_dd_mjt` | Direct Debit maturity master data |
| `rekon_prima.mst_biaya_prima` | Prima fee configurations |
| `rekon_prima.mst_biaya_biller` | Biller fee configurations |
| `rekon_prima.mst_mcode` | Merchant codes |
| `rekon_prima.mst_mcode_qris` | QRIS-specific merchant codes |
| `rekon_prima.t_rekening` | Account reference data |
| `rekon_prima.t_kode_transaksi` | Transaction code reference |
| `rekon_prima.t_rekon_dd` | Core DD transaction data |
| `rekon_prima.t_rekon_dd2` | Core DD transaction data (secondary) |
| `rekon_prima.t_data_npg` | NPG transaction data |
| `rekon_prima.t_data_prima` | Prima core transaction data |
| `rekon_prima.t_data_prima_qris` | Prima QRIS transaction data |
| `rekon_prima.t_data_pac_qris` | PAC QRIS transaction data |
| `rekon_prima.t_prima_jurnal` | Prima journal entries |
| `rekon_prima.t_dd_match` | DD matched results |
| `rekon_prima.t_dd_core_only` | DD core-only (unmatched) |
| `rekon_prima.t_dd_npg_only` | DD NPG-only (unmatched) |
| `rekon_prima.t_prima_match` | Prima matched results |
| `rekon_prima.t_prima_core_only` | Prima core-only (unmatched) |
| `rekon_prima.t_prima_decline` | Prima declined transactions |

### ER Diagram

```mermaid
erDiagram
    T_REKON_DD ||--o{ T_DD_MATCH : "reconciled"
    T_DATA_NPG ||--o{ T_DD_MATCH : "reconciled"
    T_DATA_PRIMA ||--o{ T_PRIMA_MATCH : "reconciled"
    T_DATA_PRIMA_QRIS ||--o{ T_PRIMA_MATCH : "reconciled"
    MST_PRIMA ||--o{ T_DATA_PRIMA : "configures"

    MST_PRIMA {
        INT id PK
        VARCHAR kode
        VARCHAR kodetransaksi
        VARCHAR rekening
        VARCHAR sign
    }

    T_REKON_DD {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR noreferensi
        DECIMAL nilaitransaksi
        VARCHAR typetransaksi
    }

    T_DATA_PRIMA {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR issuer
        VARCHAR acquirer
        DECIMAL amount
        VARCHAR tx_cd
    }
```

---

## 4. `rekon_pac` — PAC JALIN PLN Reconciliation

### Tables

| Table | Description |
|-------|-------------|
| `rekon_pac.t_biller` | Biller mapping data (product IDs, fees) |
| `rekon_pac.mst_dd` | Direct Debit master data |
| `rekon_pac.t_rekon_pln` | PLN reconciliation transaction data |
| `rekon_pac.t_rekon_jalin` | Jalin reconciliation transaction data |
| `rekon_pac.t_kode_transaksi` | Transaction code reference |

### ER Diagram

```mermaid
erDiagram
    T_REKON_PLN }o--o{ T_BILLER : "mapped_by_biller"
    T_REKON_JALIN }o--o{ T_KODE_TRANSAKSI : "uses_code"

    T_BILLER {
        VARCHAR id PK
        VARCHAR billerid
        VARCHAR biller
        VARCHAR productid
        DECIMAL trans_amount
        DECIMAL fee_biller
        DECIMAL fee_bank
    }

    T_REKON_PLN {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR noreferensi
        VARCHAR produkid
        VARCHAR nopelanggan
        DECIMAL nominaltransaksi
    }

    T_REKON_JALIN {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR noreferensi
        VARCHAR bankacq
        VARCHAR bankissuer
        DECIMAL nilai
        DATE tanggalpilih
    }
```

---

## 5. `rekon_telkom` — Telkom Reconciliation

### Tables

| Table | Description |
|-------|-------------|
| `rekon_telkom.t_core_telkom` | Raw core Telkom transactions (from fixed-width text files) |
| `rekon_telkom.t_data_finnet` | Raw Finnet settlement transactions |
| `rekon_telkom.t_match` | Matched transactions (core ↔ finnet) |
| `rekon_telkom.t_core_only` | Unmatched core transactions |
| `rekon_telkom.t_finnet_only` | Unmatched Finnet transactions |

### ER Diagram

```mermaid
erDiagram
    T_CORE_TELKOM ||--o{ T_MATCH : "matched"
    T_DATA_FINNET ||--o{ T_MATCH : "matched"

    T_CORE_TELKOM {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR area
        VARCHAR telepon
        VARCHAR nokartu
        VARCHAR refer
        VARCHAR nilai
        DATE tanggalpilih
    }

    T_DATA_FINNET {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR productcode
        VARCHAR phonenumber
        VARCHAR amount
        VARCHAR feeaccess
        DATE tanggalpilih
    }

    T_MATCH {
        VARCHAR id PK
        TIMESTAMP tstamp
        VARCHAR phonenumber
        VARCHAR amount
        VARCHAR flag
        DATE tanggalpilih
    }
```

---

## 6. `comphand` — Customer Complaints Handling

### Tables

| Table | Description |
|-------|-------------|
| `comphand.complaints` | Core complaint records (Maker creates, Checker approves) |
| `comphand.complaints_staging` | Authorization queue (pending Checker approval) |
| `comphand.mst_branch` | Branch master data |
| `comphand.mst_channel` | Channel master data (ATM, Mobile, etc.) |
| `comphand.mst_city` | City master data |
| `comphand.mst_product_codes` | Product category codes |
| `comphand.mst_problem_codes` | Problem classification codes |
| `comphand.system_logs` | Immutable activity log with field-level change tracking |

### ER Diagram

```mermaid
erDiagram
    COMPLAINTS ||--o{ MST_CHANNEL : "received_via"
    COMPLAINTS ||--o{ MST_CITY : "located_in"
    COMPLAINTS ||--o{ MST_BRANCH : "assigned_to"
    COMPLAINTS ||--o{ MST_PRODUCT_CODES : "categorized_by"
    MST_BRANCH ||--o{ MST_CITY : "located_in"
    COMPLAINTS_STAGING ||--o{ COMPLAINTS : "pending_for"

    COMPLAINTS {
        UUID id PK
        VARCHAR settlement_number
        VARCHAR customer_name
        DECIMAL amount
        DATE received_date
        DATE completion_date
        INT aging_days
        VARCHAR created_by
        VARCHAR authorized_by
        BOOLEAN is_deleted
    }

    COMPLAINTS_STAGING {
        UUID id PK
        VARCHAR requested_action
    }

    SYSTEM_LOGS {
        UUID log_id PK
        VARCHAR activity_type
        VARCHAR reference_id FK
        JSONB changed_fields_json
        TIMESTAMP created_at
    }
```

---

## 7. `lld` — LLD Reporting (Lalu Lintas Devisa)

Bank Indonesia regulatory reporting for foreign exchange transactions.

### Tables

| Table | Description |
|-------|-------------|
| `lld.t_lld1` | Form 1 — Export/Import transactions |
| `lld.t_lld2` | Form 2 — Balance, debit, credit mutations |
| `lld.t_lld3` | Form 3 — Customs (Pabean) + PEB data |
| `lld.t_lld4` | Form 4 — Payment mechanisms |
| `lld.t_lld7` | Form 7 — Beneficiary/maturity details |
| `lld.t_rkd1` | Rekening Khusus Devisa Form 1 |
| `lld.t_rkd2` | Rekening Khusus Devisa Form 2 |
| `lld.t_lampiran1` | Supporting attachments |
| `lld.mst_pabean` | Master data: customs offices |
| `lld.mst_pilihan` | Master data: dynamic key-value lookups (dropdowns) |
| `lld.mst_posisi` | Master data: fixed-width field positions for flat-file generation |

### ER Diagram

```mermaid
erDiagram
    T_LLD3 }|--o| MST_PABEAN : "references"
    T_LLD4 }|--o| MST_PABEAN : "references"
    T_LLD1 ||--o{ MST_POSISI : "formatted_by"
    T_LLD2 ||--o{ MST_POSISI : "formatted_by"
    T_RKD1 ||--o{ MST_POSISI : "formatted_by"

    MST_PABEAN {
        VARCHAR kode_pabean PK
        VARCHAR nama_kantor
    }

    MST_PILIHAN {
        VARCHAR nama_field PK
        VARCHAR nilai PK
        VARCHAR keterangan
    }

    MST_POSISI {
        VARCHAR form PK
        VARCHAR field PK
        INT awal
        INT panjang
        INT akhir
        VARCHAR tipe
    }
```

---

## 8. `payroll` — Payroll Processing

### Tables

| Table | Description |
|-------|-------------|
| `payroll.karyawan` | Employee records |
| `payroll.pengguna` | Application user accounts (linked to employees) |
| `payroll.cabang` | Branch offices |
| `payroll.wilayah` | Regional areas |
| `payroll.v_karyawan_um` | View: employee-user mapping for user management |
| `payroll.t_nasabah` | Temporary payroll processing data (from Excel uploads) |

### ER Diagram

```mermaid
erDiagram
    WILAYAH ||--o{ CABANG : "contains"
    CABANG ||--o{ KARYAWAN : "employs"
    KARYAWAN ||--o{ PENGGUNA : "has_account"

    WILAYAH {
        VARCHAR kode_prg PK
        VARCHAR kode_wilayah
        VARCHAR nama_wilayah
    }

    CABANG {
        VARCHAR kode_prg PK
        VARCHAR kode_wilayah FK
        VARCHAR kode_cabang
        VARCHAR nama_cabang
        VARCHAR alamat_cabang
    }

    KARYAWAN {
        VARCHAR kode_prg PK
        VARCHAR kode_cabang FK
        VARCHAR kode_karyawan
        VARCHAR nama_karyawan
    }

    PENGGUNA {
        VARCHAR username PK
        VARCHAR kode_karyawan FK
        VARCHAR email
    }
```

---

## Cross-Schema Relationship Map

All schemas share a single PostgreSQL instance but are **logically isolated**.
The only cross-cutting dependency is the `uam` schema, which controls who can access what.

```mermaid
graph TB
    UAM["uam<br/>(Auth & Permissions)"]

    UAM --> BIFAST["rekon_bifast"]
    UAM --> PRIMA["rekon_prima"]
    UAM --> PAC["rekon_pac"]
    UAM --> TELKOM["rekon_telkom"]
    UAM --> COMPHAND["comphand"]
    UAM --> LLD["lld"]
    UAM --> PAYROLL["payroll"]

    style UAM fill:#00A94F,color:#fff,stroke:#008F62,stroke-width:2px
    style BIFAST fill:#f3f4f6,stroke:#333
    style PRIMA fill:#f3f4f6,stroke:#333
    style PAC fill:#f3f4f6,stroke:#333
    style TELKOM fill:#f3f4f6,stroke:#333
    style COMPHAND fill:#f3f4f6,stroke:#333
    style LLD fill:#f3f4f6,stroke:#333
    style PAYROLL fill:#f3f4f6,stroke:#333
```

> The `uam` schema grants/restricts access via **application-level RBAC** (JWT + permission checks), NOT via PostgreSQL row-level security. Each schema's backend code checks `require_permission("reconcile.bifast")` before executing queries against `rekon_bifast.*`.
