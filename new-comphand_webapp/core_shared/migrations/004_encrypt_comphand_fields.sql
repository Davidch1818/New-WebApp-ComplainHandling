-- ====================================================================
-- Migration: Encrypt Sensitive Fields in CompHand Schema
-- ====================================================================
-- Since AES-SIV ciphertext is longer than the plaintext (encoded as hex),
-- we change the column types to TEXT to avoid truncation errors.

ALTER TABLE comphand.complaints
    ALTER COLUMN customer_name TYPE TEXT,
    ALTER COLUMN atm_card_number TYPE TEXT,
    ALTER COLUMN address TYPE TEXT;

ALTER TABLE comphand.complaints_otor
    ALTER COLUMN customer_name TYPE TEXT,
    ALTER COLUMN atm_card_number TYPE TEXT,
    ALTER COLUMN address TYPE TEXT;
