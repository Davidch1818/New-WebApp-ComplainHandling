-- =============================================================================
-- Migration: Pindahkan semua objek Comphand dari schema public ke schema comphand
-- File   : 005_migrate_public_to_comphand.sql
-- Author : migration script (generated)
-- Tanggal: 2026-11-02
--
-- PERINGATAN (R1): Script ini DESTRUCTIVE terhadap schema public.
--   Jalankan hanya sekali. Backup terlebih dahulu:
--     pg_dump -Fc -n public bmas_web_db > public_schema_backup_$(date +%Y%m%d).dump
--
-- Cara jalankan:
--   psql -U postgres -d bmas_web_db -f 005_migrate_public_to_comphand.sql
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 0. PASTIKAN SCHEMA COMPHAND ADA
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS comphand;

-- ---------------------------------------------------------------------------
-- 1. PINDAHKAN TABEL-TABEL COMPHAND (jika masih ada di public)
--    Jika tabel sudah ada di comphand, blok ini di-skip via DO $$ block.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    tables_to_migrate TEXT[] := ARRAY[
        'channel',
        'request_type',
        'city',
        'branch',
        'code_601',
        'code_601_info',
        'code_602',
        'code_602_info',
        'code_603',
        'code_603_info',
        'code_604',
        'code_604_info',
        'code_605',
        'code_605_info',
        'comp_type',
        'complaints',
        'complaints_otor',
        'master_otor'
    ];
    tbl TEXT;
    in_public BOOLEAN;
    in_comphand BOOLEAN;
BEGIN
    FOREACH tbl IN ARRAY tables_to_migrate LOOP
        -- Cek apakah tabel ada di public
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) INTO in_public;

        -- Cek apakah tabel sudah ada di comphand
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_schema = 'comphand' AND table_name = tbl
        ) INTO in_comphand;

        IF in_public AND NOT in_comphand THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA comphand', tbl);
            RAISE NOTICE 'MIGRATED TABLE: public.% -> comphand.%', tbl, tbl;
        ELSIF in_public AND in_comphand THEN
            -- Tabel sudah ada di comphand tapi juga masih di public (konflik)
            -- Pindahkan data dari public ke comphand jika diperlukan, lalu drop public
            RAISE NOTICE 'CONFLICT: Tabel % ada di kedua schema. Lakukan manual review!', tbl;
        ELSIF NOT in_public AND in_comphand THEN
            RAISE NOTICE 'SKIP (sudah di comphand): %', tbl;
        ELSE
            RAISE NOTICE 'NOT FOUND (tidak ada di public maupun comphand): %', tbl;
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2. PINDAHKAN SEQUENCES (counter_* untuk auto-generated request ID)
--    Sequences ini dipakai di router.py: comphand.counter_<comp_type>
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
          AND sequence_name LIKE 'counter_%'
    LOOP
        -- Cek apakah sequence sudah ada di comphand
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.sequences
            WHERE sequence_schema = 'comphand'
              AND sequence_name = seq.sequence_name
        ) THEN
            EXECUTE format('ALTER SEQUENCE public.%I SET SCHEMA comphand', seq.sequence_name);
            RAISE NOTICE 'MIGRATED SEQUENCE: public.% -> comphand.%', seq.sequence_name, seq.sequence_name;
        ELSE
            RAISE NOTICE 'SKIP SEQUENCE (sudah di comphand): %', seq.sequence_name;
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. PINDAHKAN FUNGSI / STORED PROCEDURE YANG BERHUBUNGAN DENGAN COMPHAND
--    Fungsi-fungsi yang biasanya ada dari legacy deployment di public schema.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    func RECORD;
    func_names TEXT[] := ARRAY[
        -- Tambahkan nama function/procedure yang ada di public jika diketahui
        -- Contoh: 'update_complaint_aging', 'auto_set_complaint_status'
        -- Kosong dulu, akan diisi setelah inspeksi manual
    ];
    fname TEXT;
BEGIN
    -- Scan semua fungsi non-system di public schema
    FOR func IN
        SELECT p.proname AS func_name,
               pg_catalog.pg_get_function_identity_arguments(p.oid) AS func_args,
               p.oid
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prokind IN ('f', 'p')  -- f=function, p=procedure
          AND p.proname NOT LIKE 'pg_%'
          AND p.proname NOT IN (
              -- Fungsi system yang TIDAK boleh dipindah
              'st_%', 'geometry_%', 'geography_%'  -- PostGIS
          )
    LOOP
        RAISE NOTICE 'FOUND FUNCTION in public: % (%)', func.func_name, func.func_args;
        -- Untuk memindahkan function:
        -- EXECUTE format('ALTER FUNCTION public.%I(%s) SET SCHEMA comphand', func.func_name, func.func_args);
        -- NOTE: Dikomentari karena perlu validasi manual terlebih dahulu.
        --       Uncomment baris di atas setelah konfirmasi bahwa function tersebut milik comphand.
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. PINDAHKAN TRIGGERS
--    Trigger tidak bisa dipindah schema secara langsung karena trigger
--    melekat ke tabel. Setelah tabel dipindah ke comphand (langkah 1),
--    trigger-trigger yang ada otomatis ikut ke schema comphand.
--    Blok ini hanya untuk verifikasi.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    trig RECORD;
BEGIN
    FOR trig IN
        SELECT trigger_name, event_object_schema, event_object_table, event_manipulation
        FROM information_schema.triggers
        WHERE event_object_schema = 'comphand'  -- Sudah harus di comphand setelah step 1
          AND trigger_schema = 'comphand'
    LOOP
        RAISE NOTICE 'TRIGGER OK (di comphand): %.% -> event: %',
            trig.event_object_table, trig.trigger_name, trig.event_manipulation;
    END LOOP;

    -- Cek apakah masih ada trigger di public yang seharusnya di comphand
    FOR trig IN
        SELECT trigger_name, event_object_schema, event_object_table, event_manipulation
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
    LOOP
        RAISE NOTICE 'TRIGGER MASIH DI PUBLIC (perlu review): %.% -> event: %',
            trig.event_object_table, trig.trigger_name, trig.event_manipulation;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. PERBARUI SEARCH_PATH DEFAULT UNTUK USER bmas_user
--    Pastikan user selalu mencari di comphand, uam, dan public secara berurutan.
-- ---------------------------------------------------------------------------

-- Cek jika variabel DB_USER tersedia, gunakan bmas_user sebagai default
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bmas_user') THEN
        ALTER ROLE bmas_user SET search_path TO comphand, uam, lld, public;
        RAISE NOTICE 'search_path bmas_user diperbarui: comphand, uam, lld, public';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. GRANT PRIVILEGES PADA SEMUA OBJEK DI COMPHAND UNTUK bmas_user
-- ---------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'bmas_user') THEN
        -- Grant schema-level
        GRANT USAGE ON SCHEMA comphand TO bmas_user;
        -- Grant semua tabel
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA comphand TO bmas_user;
        -- Grant semua sequences
        GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA comphand TO bmas_user;
        -- Grant semua fungsi
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA comphand TO bmas_user;
        RAISE NOTICE 'Privileges comphand diberikan ke bmas_user';
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. VERIFIKASI AKHIR: Tampilkan daftar objek di comphand
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '=== DAFTAR TABEL DI SCHEMA COMPHAND ===';
    FOR rec IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'comphand'
        ORDER BY table_name
    LOOP
        RAISE NOTICE '  [TABLE] comphand.%', rec.table_name;
    END LOOP;

    RAISE NOTICE '=== DAFTAR SEQUENCE DI SCHEMA COMPHAND ===';
    FOR rec IN
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'comphand'
        ORDER BY sequence_name
    LOOP
        RAISE NOTICE '  [SEQUENCE] comphand.%', rec.sequence_name;
    END LOOP;

    RAISE NOTICE '=== DAFTAR FUNGSI DI SCHEMA COMPHAND ===';
    FOR rec IN
        SELECT p.proname AS func_name,
               CASE p.prokind WHEN 'f' THEN 'FUNCTION' WHEN 'p' THEN 'PROCEDURE' ELSE 'OTHER' END AS kind
        FROM pg_catalog.pg_proc p
        JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'comphand'
        ORDER BY p.proname
    LOOP
        RAISE NOTICE '  [%] comphand.%', rec.kind, rec.func_name;
    END LOOP;

    RAISE NOTICE '=== DAFTAR TRIGGER DI SCHEMA COMPHAND ===';
    FOR rec IN
        SELECT trigger_name, event_object_table, event_manipulation
        FROM information_schema.triggers
        WHERE event_object_schema = 'comphand'
        ORDER BY event_object_table, trigger_name
    LOOP
        RAISE NOTICE '  [TRIGGER] %.% (%)', rec.event_object_table, rec.trigger_name, rec.event_manipulation;
    END LOOP;
END $$;

COMMIT;

-- =============================================================================
-- SETELAH MENJALANKAN SCRIPT INI:
-- 1. Verifikasi tabel-tabel sudah ada di comphand: \dt comphand.*
-- 2. Verifikasi sequences sudah ada di comphand:   \ds comphand.*
-- 3. Verifikasi app bisa connect dan query normal
-- 4. Jika semua OK, hapus sisa objek public yang tidak diperlukan (opsional)
-- =============================================================================

