# Core Database Schema

This document provides the inferred DDL (Data Definition Language) structures for the shared core database tables used across all reconciliation engines. 

## 1. `t_data_core_new`
This table acts as the staging area for daily transaction records uploaded from the Bank's Core system (CSV files). This table is shared and acts as the base point of comparison for all third-party reconciliations (BiFast, Visa, Mastercard, etc.).

```sql
CREATE TABLE bifast.t_data_core_new (
    id VARCHAR2(50) PRIMARY KEY,              -- Unique generated ID (e.g., 'COREYYYYMMDD...')
    tstamp TIMESTAMP,                         -- Record insert timestamp
    userid VARCHAR2(50),                      -- User who performed the upload
    tanggalpilih DATE,                        -- Reconcile selective date
    session_batch VARCHAR2(10),               -- Time batch indicator (e.g., '1', '2')
    inc_out VARCHAR2(10),                     -- Incoming or Outgoing flag
    tgl VARCHAR2(10),                         -- Transaction Date from Core
    jam VARCHAR2(10),                         -- Transaction Time from Core
    debetcredit VARCHAR2(5),                  -- Debit / Credit indicator
    nom VARCHAR2(50),                         -- Core Nominal Amount (Cleaned Decimal)
    noreferensi VARCHAR2(100),                -- Core Reference Number
    norekening VARCHAR2(100),                 -- Base Account Number
    bic_from VARCHAR2(20),                    -- Sender BIC
    rek_from VARCHAR2(50),                    -- Sender Account Number
    nama_from VARCHAR2(100),                  -- Sender Account Name
    typetransaksi VARCHAR2(50),               -- Transaction Type
    deskripsi VARCHAR2(255),                  -- Core Transaction Description
    endtoendid VARCHAR2(100),                 -- End to End Identifier (Key Match column)
    bic_to VARCHAR2(20),                      -- Receiver BIC
    rek_to VARCHAR2(50),                      -- Receiver Account Number
    nama_to VARCHAR2(100)                     -- Receiver Account Name
);
```