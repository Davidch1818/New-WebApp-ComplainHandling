# Dynamic Creation and Reset of PostgreSQL Counters for Complaint Types

**Objective:** Automate the creation and monthly resetting of PostgreSQL sequences whenever a new Complaint Type (`comp_type`) is added to the system.
**Compliance Requirements (Banking Gauntlet):** Adheres to secure schema execution. Uses parameterized dynamic SQL (`format('%I')`) to prevent SQL injection when generating Database DDL dynamically from user input.

---

## 1. Architectural Overview

Currently, the system relies on hardcoded sequences (e.g., `counter_CC`, `counter_CS`). As the system grows, adding a new `comp_type` manually requires a DBA to create a new sequence.

This architecture automates this by:
1. Attaching a PostgreSQL `AFTER INSERT` trigger to the `comp_type` table.
2. Dynamically generating a `CREATE SEQUENCE` command using the new `comp_type` code.
3. Updating the monthly reset stored procedure to query system tables for all `counter_%` sequences and resetting them dynamically.

---

## 2. Dynamic Sequence Creation

### Step 1: Create the Trigger Function

This function executes whenever a new row is successfully inserted. It uses `IF NOT EXISTS` as a defensive measure to ensure that if the sequence was manually created beforehand, the insert process will not fail.

```sql
CREATE OR REPLACE FUNCTION comphand.create_comp_seq()
RETURNS TRIGGER AS $$
DECLARE
    seq_name text;
BEGIN
    -- 1. Construct the sequence name (e.g., 'counter_NEWCODE')
    seq_name := 'counter_' || NEW.code;

    -- 2. Dynamically execute the CREATE SEQUENCE DDL
    -- format('%I') ensures the sequence name is safely quoted, preventing SQL injection
    -- IF NOT EXISTS ensures we don't crash if it already exists
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS comphand.%I START WITH 1', seq_name);

    -- 3. Explicitly set the owner to your admin/service user
    EXECUTE format('ALTER SEQUENCE comphand.%I OWNER TO bmas_user', seq_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

> **DBA Note:** The database user connecting from the web application (performing the `INSERT`) **must have `CREATE` privileges** on the `comphand` schema to execute this dynamic DDL successfully.

### Step 2: Attach the Trigger to the Table

Bind the function to the `comp_type` table so it executes strictly on new insertions. Existing data is not affected.

```sql
CREATE TRIGGER trg_after_insert_comp_type
AFTER INSERT ON comphand.comp_type
FOR EACH ROW
EXECUTE FUNCTION comphand.create_comp_seq();
```

---

## 3. Dynamic Sequence Reset

### Step 3: Update the Monthly Reset Stored Procedure

Update the existing `PROC_RESET_MONTHLY_COUNTERS` to dynamically look up all sequences starting with `counter_` rather than hardcoding specific codes. This guarantees that newly created sequences are automatically picked up by the monthly reset job.

```sql
CREATE OR REPLACE PROCEDURE comphand."PROC_RESET_MONTHLY_COUNTERS"()
LANGUAGE plpgsql
AS $BODY$
DECLARE
    seq_record RECORD;
BEGIN
    -- Safely query the PostgreSQL internal catalog for matching sequences
    FOR seq_record IN
        SELECT sequencename
        FROM pg_sequences
        WHERE schemaname = 'comphand'
          AND sequencename LIKE 'counter_%'
    LOOP
        -- Dynamically reset each found sequence back to 1
        EXECUTE format('ALTER SEQUENCE comphand.%I RESTART WITH 1', seq_record.sequencename);
    END LOOP;

    COMMIT;
END;
$BODY$;

-- Ensure correct ownership so the scheduled job has permission
ALTER PROCEDURE comphand."PROC_RESET_MONTHLY_COUNTERS"() OWNER TO bmas_user;
```

---

## 4. Verification

To verify the setup:

1. Insert a test record:
```sql
INSERT INTO comphand.comp_type (code, name) VALUES ('TEST', 'Test Type');
```

2. Check if the sequence was created:
```sql
SELECT * FROM pg_sequences WHERE sequencename = 'counter_TEST';
```

3. Test sequence increment:
```sql
SELECT nextval('comphand.counter_TEST');
```

4. Run the reset procedure:
```sql
CALL comphand."PROC_RESET_MONTHLY_COUNTERS"();
```

5. Verify the reset worked:
```sql
SELECT last_value FROM comphand.counter_TEST;
-- Should return 1
```