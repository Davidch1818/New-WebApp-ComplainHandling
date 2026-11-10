-- =============================================================================
-- Migration 003: DDL Lengkap Schema Comphand
-- File   : 003_comphand_schema.sql
-- Dibuat saat inisialisasi — hanya dijalankan jika tabel belum ada.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS comphand;

-- ---------------------------------------------------------------------------
-- Extension (wajib untuk gen_random_uuid())
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Master Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comphand.channel (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    channels_code   VARCHAR(50) PRIMARY KEY,
    channel_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.request_type (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    req_code        VARCHAR(50) PRIMARY KEY,
    req_name        VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.city (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    city_code       VARCHAR(50) PRIMARY KEY,
    city_name       VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.branch (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    branch_code     VARCHAR(50) PRIMARY KEY,
    branch_name     VARCHAR(255) NOT NULL,
    city_code       VARCHAR(50),
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.comp_type (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    code            VARCHAR(50) PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Code 601-605 (Produk & Info Produk)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comphand.code_601 (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) PRIMARY KEY,
    product_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_601_info (
    uuid                UUID UNIQUE DEFAULT gen_random_uuid(),
    productinfo_code    VARCHAR(50) PRIMARY KEY,
    productinfo_name    VARCHAR(255) NOT NULL,
    isdeleted           VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input          VARCHAR(50),
    user_otor           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_602 (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) PRIMARY KEY,
    product_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_602_info (
    uuid                UUID UNIQUE DEFAULT gen_random_uuid(),
    productinfo_code    VARCHAR(50) PRIMARY KEY,
    productinfo_name    VARCHAR(255) NOT NULL,
    isdeleted           VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input          VARCHAR(50),
    user_otor           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_603 (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) PRIMARY KEY,
    product_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_603_info (
    uuid                UUID UNIQUE DEFAULT gen_random_uuid(),
    productinfo_code    VARCHAR(50) PRIMARY KEY,
    productinfo_name    VARCHAR(255) NOT NULL,
    isdeleted           VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input          VARCHAR(50),
    user_otor           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_604 (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) PRIMARY KEY,
    product_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_604_info (
    uuid                UUID UNIQUE DEFAULT gen_random_uuid(),
    productinfo_code    VARCHAR(50) PRIMARY KEY,
    productinfo_name    VARCHAR(255) NOT NULL,
    isdeleted           VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input          VARCHAR(50),
    user_otor           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_605 (
    uuid            UUID UNIQUE DEFAULT gen_random_uuid(),
    product_code    VARCHAR(50) PRIMARY KEY,
    product_name    VARCHAR(255) NOT NULL,
    isdeleted       VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input      VARCHAR(50),
    user_otor       VARCHAR(50),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comphand.code_605_info (
    uuid                UUID UNIQUE DEFAULT gen_random_uuid(),
    productinfo_code    VARCHAR(50) PRIMARY KEY,
    productinfo_name    VARCHAR(255) NOT NULL,
    isdeleted           VARCHAR(1) NOT NULL DEFAULT 'N',
    user_input          VARCHAR(50),
    user_otor           VARCHAR(50),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Complaints (Tabel Utama)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comphand.complaints (
    request_id              VARCHAR(50) PRIMARY KEY,
    uuid                    UUID UNIQUE DEFAULT gen_random_uuid(),
    customer_name           TEXT NOT NULL,
    amount                  NUMERIC(15, 2) NOT NULL,
    location                VARCHAR(255),
    city_code               VARCHAR(50) NOT NULL,
    branch_code             VARCHAR(50) NOT NULL,
    atm_card_number         TEXT NOT NULL,
    description             TEXT NOT NULL,
    received_date           DATE NOT NULL,
    incident_date           DATE NOT NULL,
    completion_date         DATE,
    channel                 VARCHAR(50) NOT NULL,
    incident_checkbox       VARCHAR(1) NOT NULL DEFAULT 'N',
    request_type            VARCHAR(50),
    comp_source             VARCHAR(50),
    address                 TEXT,
    status                  VARCHAR(50),
    settlement_number       VARCHAR(50),
    extension_number        VARCHAR(50),
    code_601_product        VARCHAR(100),
    code_601_problem        VARCHAR(100),
    code_602_product        VARCHAR(100),
    code_602_problem        VARCHAR(100),
    code_603_product        VARCHAR(100),
    code_603_problem        VARCHAR(100),
    code_604_product        VARCHAR(100),
    code_604_problem        VARCHAR(100),
    code_605_product        VARCHAR(100),
    code_605_problem        VARCHAR(100),
    pengaduan_file_path     VARCHAR(255) NOT NULL,
    penyelesaian_file_path  VARCHAR(255),
    perpanjangan_file_path  VARCHAR(255),
    aging                   INTEGER DEFAULT 0,
    user_input              VARCHAR(50),
    user_otor               VARCHAR(50),
    isdeleted               VARCHAR(1) DEFAULT 'N',
    action                  VARCHAR(20),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_complaints_uuid        ON comphand.complaints(uuid);
CREATE INDEX IF NOT EXISTS idx_complaints_status      ON comphand.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_isdeleted   ON comphand.complaints(isdeleted);
CREATE INDEX IF NOT EXISTS idx_complaints_received    ON comphand.complaints(received_date);
CREATE INDEX IF NOT EXISTS idx_complaints_user_input  ON comphand.complaints(user_input);

-- ---------------------------------------------------------------------------
-- Complaints OTOR (Pending Authorization Queue)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comphand.complaints_otor (
    request_id              VARCHAR(50) PRIMARY KEY,
    uuid                    UUID UNIQUE DEFAULT gen_random_uuid(),
    customer_name           TEXT NOT NULL,
    amount                  NUMERIC(15, 2) NOT NULL,
    location                VARCHAR(255),
    city_code               VARCHAR(50) NOT NULL,
    branch_code             VARCHAR(50) NOT NULL,
    atm_card_number         TEXT NOT NULL,
    description             TEXT NOT NULL,
    received_date           DATE NOT NULL,
    incident_date           DATE NOT NULL,
    completion_date         DATE,
    channel                 VARCHAR(50) NOT NULL,
    incident_checkbox       VARCHAR(1) NOT NULL DEFAULT 'N',
    request_type            VARCHAR(50),
    comp_source             VARCHAR(50),
    address                 TEXT,
    status                  VARCHAR(50),
    settlement_number       VARCHAR(50),
    extension_number        VARCHAR(50),
    code_601_product        VARCHAR(100),
    code_601_problem        VARCHAR(100),
    code_602_product        VARCHAR(100),
    code_602_problem        VARCHAR(100),
    code_603_product        VARCHAR(100),
    code_603_problem        VARCHAR(100),
    code_604_product        VARCHAR(100),
    code_604_problem        VARCHAR(100),
    code_605_product        VARCHAR(100),
    code_605_problem        VARCHAR(100),
    pengaduan_file_path     VARCHAR(255) NOT NULL,
    penyelesaian_file_path  VARCHAR(255),
    perpanjangan_file_path  VARCHAR(255),
    aging                   INTEGER DEFAULT 0,
    user_input              VARCHAR(50),
    user_otor               VARCHAR(50),
    isdeleted               VARCHAR(1) DEFAULT 'N',
    action                  VARCHAR(20) NOT NULL,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comp_otor_uuid       ON comphand.complaints_otor(uuid);
CREATE INDEX IF NOT EXISTS idx_comp_otor_isdeleted  ON comphand.complaints_otor(isdeleted);

-- ---------------------------------------------------------------------------
-- Master OTOR (Approval Master Data)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comphand.master_otor (
    uuid        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code1       VARCHAR(255),
    name        VARCHAR(255),
    code2       VARCHAR(255),
    user_input  VARCHAR(255),
    user_otor   VARCHAR(255),
    action      VARCHAR(255),
    type_prs    VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Sequences untuk Request ID Generator (counter_<comp_type>)
-- Dibuat per comp_type — script ini membuat sequence generik.
-- Sequence spesifik per comp_type dibuat melalui setup_db_init.py.
-- ---------------------------------------------------------------------------

-- Contoh sequence untuk comp_type default (tambahkan sesuai kebutuhan):
-- CREATE SEQUENCE IF NOT EXISTS comphand.counter_ATM START 1 INCREMENT 1;
-- CREATE SEQUENCE IF NOT EXISTS comphand.counter_KAR START 1 INCREMENT 1;

-- ---------------------------------------------------------------------------
-- Grant Privileges
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bmas_user') THEN
        GRANT USAGE ON SCHEMA comphand TO bmas_user;
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA comphand TO bmas_user;
        GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA comphand TO bmas_user;
        -- Default privileges untuk objek yang dibuat di masa depan
        ALTER DEFAULT PRIVILEGES IN SCHEMA comphand
            GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO bmas_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA comphand
            GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO bmas_user;
    END IF;
END $$;

