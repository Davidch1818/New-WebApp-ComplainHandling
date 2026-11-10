from __future__ import annotations
import pandas as pd
import json
import argparse
import os
import sqlite3
import datetime
import uuid
from sqlalchemy import Column, String, Float, MetaData, Table, create_engine, select, insert, text
from dotenv import load_dotenv

load_dotenv()

# Configuration (M3: Persistence Layer)
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT", "5432")
db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASSWORD")
db_name = os.getenv("DB_NAME")

if db_host and db_user and db_pass and db_name:
    DB_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
else:
    DB_URL = os.getenv("DATABASE_URL", "sqlite:///reconcile.db")

# Enable pooled connections for Postgres, but for SQLite we need specific tuning
engine = create_engine(DB_URL, connect_args={"timeout": 30} if "sqlite" in DB_URL else {})
metadata = MetaData()

def enable_wal(db_engine):
    """Enable Write-Ahead Logging for SQLite stability"""
    if "sqlite" in str(db_engine.url):
        with db_engine.connect() as conn:
            conn.execute(text("PRAGMA journal_mode=WAL;"))
            conn.commit()

def load_config():
    with open('biller_config.json', 'r') as f:
        return json.load(f)

def ensure_schema():
    """M3: Standardized Loading - Exact alignment with db-schema.md"""
    # 1. t_data_core_new
    t_data_core_new = Table(
        't_data_core_new', metadata,
        Column('id', String(50), primary_key=True),
        Column('tstamp', String(50)),
        Column('userid', String(50)),
        Column('tanggalpilih', String(50)),
        Column('session_batch', String(10)),
        Column('inc_out', String(10)),
        Column('tgl', String(10)),
        Column('jam', String(10)),
        Column('debetcredit', String(5)),
        Column('nom', String(50)),
        Column('noreferensi', String(100)),
        Column('norekening', String(100)),
        Column('bic_from', String(20)),
        Column('rek_from', String(50)),
        Column('nama_from', String(100)),
        Column('typetransaksi', String(50)),
        Column('deskripsi', String(255)),
        Column('endtoendid', String(100)),
        Column('bic_to', String(20)),
        Column('rek_to', String(50)),
        Column('nama_to', String(100)),
        extend_existing=True
    )

    # 2. t_data_bifast
    t_data_bifast = Table(
        't_data_bifast', metadata,
        Column('id', String(50), primary_key=True),
        Column('tstamp', String(50)),
        Column('userid', String(50)),
        Column('tanggalpilih', String(50)),
        Column('session_batch', String(10)),
        Column('business_id', String(100)),
        Column('ref_number', String(100)),
        Column('service_type', String(50)),
        Column('from_bank_code', String(20)),
        Column('from_acc_name', String(100)),
        Column('from_acc_number', String(50)),
        Column('to_bank_code', String(20)),
        Column('to_acc_name', String(100)),
        Column('to_acc_number', String(50)),
        Column('amount', String(50)),
        Column('purpose_of_transaction', String(100)),
        Column('initiation_date_time', String(50)),
        Column('settlement_date_time', String(50)),
        Column('description', String(255)),
        Column('status', String(50)),
        Column('status_reason_code', String(50)),
        extend_existing=True
    )

    # 3. t_bifast_match
    t_bifast_match = Table(
        't_bifast_match', metadata,
        Column('id', String(50)),
        Column('tstamp', String(50)),
        Column('userid', String(50)),
        Column('tanggalpilih', String(50)),
        Column('session_batch', String(10)),
        Column('nom', String(50)),
        Column('inc_out', String(10)),
        Column('tgl', String(10)),
        Column('jam', String(10)),
        Column('endtoendid', String(100)),
        Column('bic_from', String(20)),
        Column('rek_from', String(50)),
        Column('bic_to', String(20)),
        Column('rek_to', String(50)),
        Column('flag', String(50)),
        Column('business_id', String(100)),
        Column('ref_number', String(100)),
        Column('service_type', String(50)),
        Column('from_bank_code', String(20)),
        Column('from_acc_name', String(100)),
        Column('from_acc_number', String(50)),
        Column('to_bank_code', String(20)),
        Column('to_acc_name', String(100)),
        Column('to_acc_number', String(50)),
        Column('amount', String(50)),
        Column('purpose_of_transaction', String(100)),
        Column('initiation_date_time', String(50)),
        Column('settlement_date_time', String(50)),
        Column('description', String(255)),
        Column('status', String(50)),
        Column('status_reason_code', String(50)),
        Column('ref_number_core', String(100)),
        extend_existing=True
    )

    # 4. t_bifast_core_only_ng
    t_bifast_core_only_ng = Table(
        't_bifast_core_only_ng', metadata,
        Column('id', String(50), primary_key=True),
        Column('tstamp', String(50)),
        Column('userid', String(50)),
        Column('tanggalpilih', String(50)),
        Column('session_batch', String(10)),
        Column('flag', String(20)),
        Column('noreferensi', String(100)),
        Column('norekening', String(100)),
        Column('namarekening', String(100)),
        Column('tgltransaksi', String(10)),
        Column('jamtransaksi', String(10)),
        Column('endtoendid', String(100)),
        Column('bic_to', String(20)),
        Column('rek_to', String(50)),
        Column('nilaitransaksi', String(50)),
        extend_existing=True
    )

    # 5. t_bifast_only
    t_bifast_only = Table(
        't_bifast_only', metadata,
        Column('id', String(50), primary_key=True),
        Column('tstamp', String(50)),
        Column('userid', String(50)),
        Column('tanggalpilih', String(50)),
        Column('session_batch', String(10)),
        Column('flag', String(20)),
        Column('business_id', String(100)),
        Column('ref_number', String(100)),
        Column('service_type', String(50)),
        Column('from_bank_code', String(20)),
        Column('from_acc_name', String(100)),
        Column('from_acc_number', String(50)),
        Column('to_bank_code', String(20)),
        Column('to_acc_name', String(100)),
        Column('to_acc_number', String(50)),
        Column('amount', String(50)),
        Column('purpose_of_transaction', String(100)),
        Column('initiation_date_time', String(50)),
        Column('settlement_date_time', String(50)),
        Column('description', String(255)),
        Column('status', String(50)),
        Column('status_reason_code', String(50)),
        extend_existing=True
    )

    metadata.create_all(engine)
    return {
        'CORE': t_data_core_new,
        'BIFAST': t_data_bifast,
        'MATCH': t_bifast_match,
        'CORE_ONLY': t_bifast_core_only_ng,
        'BIFAST_ONLY': t_bifast_only
    }

def generate_id(prefix):
    return f"{prefix}{datetime.datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:8]}"

def clean_amount(val):
    if pd.isna(val) or val == "":
        return "0"
    s = str(val).strip()
    # Handle European/Indonesian format 1.234.567,89
    if "," in s and "." in s:
        # If both present, assume . is thousand and , is decimal
        if s.find(".") < s.find(","):
            s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        # If only , present, could be decimal or thousand. 
        # In this context, if it has 2 digits after, likely decimal.
        if len(s.split(",")[-1]) <= 2:
            s = s.replace(",", ".")
        else:
            s = s.replace(",", "")
    return s

def safe_str(val):
    if pd.isna(val):
        return ""
    return str(val).strip()


def parse_files(biller_id, core_path, biller_path):
    """M2: Adaptive Parsing - Extended logic to map all required columns"""
    
    # 1. Parse Core (CSV)
    df_core_raw = pd.read_csv(core_path, header=None)
    core_cleaned = pd.DataFrame()
    
    for i in range(20):
        if i not in df_core_raw.columns:
            df_core_raw[i] = ""
            
    core_cleaned['id'] = [generate_id('CORE') for _ in range(len(df_core_raw))]
    core_cleaned['tstamp'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    core_cleaned['userid'] = 'SYSTEM_USER'
    core_cleaned['inc_out'] = df_core_raw[0].apply(safe_str)
    core_cleaned['tgl'] = df_core_raw[1].apply(safe_str)
    core_cleaned['jam'] = df_core_raw[3].apply(safe_str)
    core_cleaned['debetcredit'] = df_core_raw[4].apply(safe_str)
    core_cleaned['nom'] = df_core_raw[5].apply(clean_amount)
    core_cleaned['noreferensi'] = df_core_raw[6].apply(safe_str)
    core_cleaned['norekening'] = df_core_raw[7].apply(safe_str)
    core_cleaned['bic_from'] = df_core_raw[8].apply(safe_str)
    core_cleaned['rek_from'] = df_core_raw[10].apply(safe_str)
    core_cleaned['nama_from'] = df_core_raw[11].apply(safe_str)
    core_cleaned['typetransaksi'] = df_core_raw[12].apply(safe_str)
    core_cleaned['deskripsi'] = df_core_raw[14].apply(safe_str)
    core_cleaned['endtoendid'] = df_core_raw[17].apply(safe_str)
    core_cleaned['bic_to'] = df_core_raw[18].apply(safe_str)
    core_cleaned['rek_to'] = df_core_raw[19].apply(safe_str)
    core_cleaned['nama_to'] = "" # Not clearly mapped from input csv
    
    # 2. Parse Biller (XLSX)
    df_biller_raw = pd.read_excel(biller_path, header=1)
    biller_cleaned = pd.DataFrame()
    
    def get_col(name):
        return df_biller_raw[name].apply(safe_str) if name in df_biller_raw.columns else ""
        
    biller_cleaned['id'] = [generate_id('BFAST') for _ in range(len(df_biller_raw))]
    biller_cleaned['tstamp'] = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    biller_cleaned['userid'] = 'SYSTEM_USER'
    biller_cleaned['business_id'] = get_col('Business ID')
    biller_cleaned['ref_number'] = get_col('Ref. Number')
    biller_cleaned['service_type'] = get_col('Service Type')
    biller_cleaned['from_bank_code'] = get_col('Sender (From)') # Mapped based on headers
    biller_cleaned['from_acc_name'] = get_col('Unnamed: 6')
    biller_cleaned['from_acc_number'] = get_col('Unnamed: 7')
    biller_cleaned['to_bank_code'] = get_col('Receiver (To)')
    biller_cleaned['to_acc_name'] = get_col('Unnamed: 9')
    biller_cleaned['to_acc_number'] = get_col('Unnamed: 10')
    biller_cleaned['amount'] = get_col('Amount').apply(clean_amount)
    biller_cleaned['purpose_of_transaction'] = get_col('Purpose of Transaction')
    biller_cleaned['initiation_date_time'] = get_col('Initiation Date Time')
    biller_cleaned['settlement_date_time'] = get_col('Settlement Date Time')
    biller_cleaned['description'] = get_col('Description')
    biller_cleaned['status'] = get_col('Status')
    biller_cleaned['status_reason_code'] = get_col('Status Reason Code')
    
    # Drop empty trailing rows from bifast where business_id is empty
    biller_cleaned = biller_cleaned[biller_cleaned['business_id'] != '']
    biller_cleaned = biller_cleaned[biller_cleaned['amount'] != '']
    
    return core_cleaned, biller_cleaned

def reconcile_process(biller_id, session_batch, target_date, core_path, biller_path):
    print(f"🚀 Step 1 & 2: Parsing Files for {biller_id}...")
    df_core, df_biller = parse_files(biller_id, core_path, biller_path)
    
    print(f"🚀 Step 3: Standardized Loading into Staging...")
    tables = ensure_schema()
    enable_wal(engine)
    
    # Add tags
    df_core['session_batch'] = session_batch
    df_core['tanggalpilih'] = target_date
    df_biller['session_batch'] = session_batch
    df_biller['tanggalpilih'] = target_date
    
    with engine.begin() as conn:
        print("🔄 Clearing and Loading Staging Tables...")
        conn.execute(tables['CORE'].delete().where(tables['CORE'].c.session_batch == session_batch))
        conn.execute(tables['BIFAST'].delete().where(tables['BIFAST'].c.session_batch == session_batch))
        
        df_core.to_sql(tables['CORE'].name, conn, if_exists='append', index=False)
        df_biller.to_sql(tables['BIFAST'].name, conn, if_exists='append', index=False)

        print(f"🚀 Step 4: Transactional Reconciliation via SQL...")
        
        # We need normalized amount comparison because core is numeric "400000" and bifast might be "400000.00"
        
        # 1. MATCH
        sql_match = f"""
            INSERT INTO {tables['MATCH'].name} (
                id, tstamp, userid, tanggalpilih, session_batch, nom, inc_out, tgl, jam, endtoendid, 
                bic_from, rek_from, bic_to, rek_to, flag, business_id, ref_number, service_type, 
                from_bank_code, from_acc_name, from_acc_number, to_bank_code, to_acc_name, to_acc_number, 
                amount, purpose_of_transaction, initiation_date_time, settlement_date_time, 
                description, status, status_reason_code, ref_number_core
            )
            SELECT 
                c.id, c.tstamp, c.userid, c.tanggalpilih, c.session_batch, c.nom, c.inc_out, c.tgl, c.jam, c.endtoendid,
                c.bic_from, c.rek_from, c.bic_to, c.rek_to, 'MATCH', b.business_id, b.ref_number, b.service_type,
                b.from_bank_code, b.from_acc_name, b.from_acc_number, b.to_bank_code, b.to_acc_name, b.to_acc_number,
                b.amount, b.purpose_of_transaction, b.initiation_date_time, b.settlement_date_time,
                b.description, b.status, b.status_reason_code, c.noreferensi
            FROM {tables['CORE'].name} c
            JOIN {tables['BIFAST'].name} b ON c.endtoendid = b.business_id AND CAST(c.nom AS FLOAT) = CAST(b.amount AS FLOAT)
            WHERE c.session_batch = '{session_batch}'
        """
        
        # 2. CORE ONLY
        sql_core_only = f"""
            INSERT INTO {tables['CORE_ONLY'].name} (
                id, tstamp, userid, tanggalpilih, session_batch, flag, noreferensi, norekening, 
                namarekening, tgltransaksi, jamtransaksi, endtoendid, bic_to, rek_to, nilaitransaksi
            )
            SELECT 
                c.id, c.tstamp, c.userid, c.tanggalpilih, c.session_batch, 'AKTIF', c.noreferensi, c.norekening,
                c.nama_from, c.tgl, c.jam, c.endtoendid, c.bic_to, c.rek_to, c.nom
            FROM {tables['CORE'].name} c
            LEFT JOIN {tables['BIFAST'].name} b ON c.endtoendid = b.business_id
            WHERE c.session_batch = '{session_batch}' AND b.business_id IS NULL
        """
        
        # 3. BIFAST ONLY
        sql_biller_only = f"""
            INSERT INTO {tables['BIFAST_ONLY'].name} (
                id, tstamp, userid, tanggalpilih, session_batch, flag, business_id, ref_number, 
                service_type, from_bank_code, from_acc_name, from_acc_number, to_bank_code, 
                to_acc_name, to_acc_number, amount, purpose_of_transaction, initiation_date_time, 
                settlement_date_time, description, status, status_reason_code
            )
            SELECT 
                b.id, b.tstamp, b.userid, b.tanggalpilih, b.session_batch, 'AKTIF', b.business_id, b.ref_number,
                b.service_type, b.from_bank_code, b.from_acc_name, b.from_acc_number, b.to_bank_code,
                b.to_acc_name, b.to_acc_number, b.amount, b.purpose_of_transaction, b.initiation_date_time,
                b.settlement_date_time, b.description, b.status, b.status_reason_code
            FROM {tables['BIFAST'].name} b
            LEFT JOIN {tables['CORE'].name} c ON b.business_id = c.endtoendid
            WHERE b.session_batch = '{session_batch}' AND c.endtoendid IS NULL
        """
        
        for t in ['MATCH', 'CORE_ONLY', 'BIFAST_ONLY']:
            conn.execute(tables[t].delete().where(tables[t].c.session_batch == session_batch))
            
        conn.execute(text(sql_match))
        conn.execute(text(sql_core_only))
        conn.execute(text(sql_biller_only))

    print(f"🚀 Step 5: Output Generation (M6) to XLS...")
    output_file = "Result.xlsx"
    with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
        pd.read_sql(select(tables['MATCH']).where(tables['MATCH'].c.session_batch == session_batch), engine).to_excel(writer, sheet_name='MATCH', index=False)
        pd.read_sql(select(tables['CORE_ONLY']).where(tables['CORE_ONLY'].c.session_batch == session_batch), engine).to_excel(writer, sheet_name='CORE ONLY', index=False)
        pd.read_sql(select(tables['BIFAST_ONLY']).where(tables['BIFAST_ONLY'].c.session_batch == session_batch), engine).to_excel(writer, sheet_name='BIFAST ONLY', index=False)

    print(f"✅ Full Reconciliation Completed for {biller_id}")
    return output_file

if __name__ == "__main__":
    reconcile_process('BIFAST', 'BATCH-001', '2026-04-10', 'Requirement/bfast20260410.csv', 'Requirement/TransactionEnquiryReport_10042026.xlsx')
