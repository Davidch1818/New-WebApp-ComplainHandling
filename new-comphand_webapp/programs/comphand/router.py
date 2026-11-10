from __future__ import annotations
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime, timedelta
import os
import shutil
import io
import pandas as pd
import json
import uuid
from pydantic import BaseModel
from typing import Optional

# from core.database import get_db
from core.encryption import encrypt_deterministic, decrypt_deterministic
from core.database import get_db
from core.encryption import encrypt_deterministic, decrypt_deterministic
from core.dependencies import get_current_user, require_permission
from models.uam import User
from schemas.uam import PaginatedResponse, AuditLogOut
from fastapi import Query
import math
from models.comphand import (
    Complaint, ComplaintOtor, Channel, RequestType, City, Branch, CompType,
    Code601, Code601Info, Code602, Code602Info, Code603, Code603Info,
    Code604, Code604Info, Code605, Code605Info, MasterOtor
)


class MasterDataRequest(BaseModel):
    code1: str
    code2: str
    name: str
    user_input: str
    action: str
    type_prs: str
    old_name: Optional[str] = None
from models.uam import AuditLog

router = APIRouter(prefix="/api/comphand", tags=["Comphand"])

from dotenv import load_dotenv
load_dotenv()

if os.name == 'nt':
    DEFAULT_UPLOAD_DIR = r"D:\NEW INTRANET APPS\comphand"
else:
    DEFAULT_UPLOAD_DIR = "/webAppData/comphand"

UPLOAD_DIR = os.getenv("COMPHAND_UPLOAD_DIR", DEFAULT_UPLOAD_DIR)

def mask_sensitive_data(field_name, text_val):
    if not text_val:
        return ""
    s = str(text_val)

    if field_name == 'atm_card_number':
        mask_len = 4
    elif field_name in ['customer_name', 'address']:
        mask_len = 3
    else:
        return s

    if len(s) <= mask_len:
        return 'X' * len(s)

    return s[:-mask_len] + 'X' * mask_len

def calculate_business_days(start_date, end_date):
    if not start_date or not end_date:
        return 0
    if end_date < start_date:
        return 0

    business_days = 0
    current_date = start_date + timedelta(days=1)
    while current_date <= end_date:
        if current_date.weekday() < 5: # 0-4 are Mon-Fri
            business_days += 1
        current_date += timedelta(days=1)
    return business_days


@router.post("/complaints/comp_otor")
async def submit_complaint(
    request_id: str = Form(None),
    customer_name: str = Form(...),
    amount: float = Form(...),
    city_code: str = Form(...),
    branch_code: str = Form(...),
    atm_card_number: str = Form(...),
    description: str = Form(...),
    received_date: str = Form(...),
    incident_date: str = Form(...),
    completion_date: str = Form(""),
    channel_code: str = Form(...),

    incident_checkbox: str = Form("N"),
    request_type: str = Form(""),
    channel_source: str = Form(""),
    location: str = Form(""),
    address: str = Form(""),

    settlement_number: str = Form(""),
    extension_number: str = Form(""),

    reg_product_601: str = Form(""),
    reg_problem_601: str = Form(""),
    reg_product_602: str = Form(""),
    reg_problem_602: str = Form(""),
    reg_product_603: str = Form(""),
    reg_problem_603: str = Form(""),
    reg_product_604: str = Form(""),
    reg_problem_604: str = Form(""),
    reg_product_605: str = Form(""),
    reg_problem_605: str = Form(""),

    complaint_file: UploadFile = File(...),
    resolution_file: UploadFile = File(None),
    extension_file: UploadFile = File(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Basic Backend Validation (matching Java Logic)
    try:
        r_date = datetime.strptime(received_date, "%Y-%m-%d").date()
        i_date = datetime.strptime(incident_date, "%Y-%m-%d").date()
        c_date = datetime.strptime(completion_date, "%Y-%m-%d").date() if completion_date else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if r_date < i_date:
        raise HTTPException(status_code=400, detail="Received date tidak dapat lebih awal dari Incident date")

    if settlement_number and not resolution_file:
        raise HTTPException(status_code=400, detail="Resolution file is required if settlement number is provided")
    if resolution_file and not settlement_number:
        raise HTTPException(status_code=400, detail="Settlement number is required if resolution file is provided")

    if extension_number and not extension_file:
        raise HTTPException(status_code=400, detail="Extension file is required if extension number is provided")
    if extension_file and not extension_number:
        raise HTTPException(status_code=400, detail="Extension number is required if extension file is provided")

    # Generate actual request_id here using nextval
    if not channel_source:
        raise HTTPException(status_code=400, detail="channel_source is required to generate Request ID")

    channel_source = channel_source.strip()
    date_str = datetime.now().strftime("%Y%m")
    try:
        seq_name = f'comphand."counter_{channel_source}"'
        try:
            seq_val = db.execute(
                text("SELECT nextval(:seq_name)"),
                {"seq_name": seq_name}
            ).scalar()
        except Exception:
            db.rollback()
            fallback_seq = f'"counter_{channel_source}"'
            seq_val = db.execute(
                text("SELECT nextval(:seq_name)"),
                {"seq_name": fallback_seq}
            ).scalar()
        request_id = f"{channel_source}{date_str}{str(seq_val).zfill(3)}"
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate final request ID: {str(e)}")

    # Save Files
    base_folder = "ComplainNotOtor"
    try:
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Pengaduan"), exist_ok=True)
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Penyelesaian"), exist_ok=True)
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Perpanjangan"), exist_ok=True)

        comp_filename = complaint_file.filename if complaint_file.filename else ""
        _, comp_ext = os.path.splitext(comp_filename)
        complaint_path = f"{base_folder}/Pengaduan/{request_id}{comp_ext}"
        with open(os.path.join(UPLOAD_DIR, complaint_path), "wb") as buffer:
            shutil.copyfileobj(complaint_file.file, buffer)

        resolution_path = ""
        # In some FastAPI versions, an empty file upload may still provide an UploadFile object.
        # It is safer to check if filename exists and is not empty.
        if resolution_file and getattr(resolution_file, "filename", None):
            res_filename = resolution_file.filename
            _, res_ext = os.path.splitext(res_filename)
            resolution_path = f"{base_folder}/Penyelesaian/{request_id}{res_ext}"
            with open(os.path.join(UPLOAD_DIR, resolution_path), "wb") as buffer:
                shutil.copyfileobj(resolution_file.file, buffer)

        extension_path = ""
        if extension_file and getattr(extension_file, "filename", None):
            ext_filename = extension_file.filename
            _, ext_ext = os.path.splitext(ext_filename)
            extension_path = f"{base_folder}/Perpanjangan/{request_id}{ext_ext}"
            with open(os.path.join(UPLOAD_DIR, extension_path), "wb") as buffer:
                shutil.copyfileobj(extension_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=503, detail="Failed to access remote file storage. Please try again later.")

    # Determine status based on inputs
    if c_date:
        complaint_status = "Completed"
    elif extension_number and extension_file:
        complaint_status = "Extend"
    else:
        complaint_status = "In Progress"

    # Insert into DB
    insert_otor_query = """
        INSERT INTO comphand.complaints_otor (
            request_id, customer_name, amount, location, city_code, branch_code,
            atm_card_number, description, received_date, incident_date, completion_date,
            channel, incident_checkbox, request_type, comp_source, address, status,
            settlement_number, extension_number, code_601_product, code_601_problem,
            code_602_product, code_602_problem, code_603_product, code_603_problem,
            code_604_product, code_604_problem, code_605_product, code_605_problem,
            pengaduan_file_path, penyelesaian_file_path, perpanjangan_file_path,
            aging, user_input, isdeleted, action, created_at, updated_at
        ) VALUES (
            :request_id, :customer_name, :amount, :location, :city_code, :branch_code,
            :atm_card_number, :description, :received_date, :incident_date, :completion_date,
            :channel_code, :incident_checkbox, :request_type, :channel_source, :address, :status,
            :settlement_number, :extension_number, :reg_product_601, :reg_problem_601,
            :reg_product_602, :reg_problem_602, :reg_product_603, :reg_problem_603,
            :reg_product_604, :reg_problem_604, :reg_product_605, :reg_problem_605,
            :complaint_file_path, :resolution_file_path, :extension_file_path,
            :aging, :user_input, :is_deleted, :action, NOW(), NOW()
        )
    """

    try:
        db.execute(text(insert_otor_query), {
            "request_id": request_id,
            "customer_name": encrypt_deterministic(customer_name),
            "amount": amount,
            "location": location,
            "city_code": city_code,
            "branch_code": branch_code,
            "atm_card_number": encrypt_deterministic(atm_card_number),
            "description": description,
            "received_date": r_date,
            "incident_date": i_date,
            "completion_date": c_date,
            "channel_code": channel_code,
            "incident_checkbox": incident_checkbox,
            "request_type": request_type,
            "channel_source": channel_source,
            "address": encrypt_deterministic(address) if address else None,
            "status": complaint_status,
            "settlement_number": settlement_number,
            "extension_number": extension_number,
            "reg_product_601": reg_product_601,
            "reg_problem_601": reg_problem_601,
            "reg_product_602": reg_product_602,
            "reg_problem_602": reg_problem_602,
            "reg_product_603": reg_product_603,
            "reg_problem_603": reg_problem_603,
            "reg_product_604": reg_product_604,
            "reg_problem_604": reg_problem_604,
            "reg_product_605": reg_product_605,
            "reg_problem_605": reg_problem_605,
            "complaint_file_path": complaint_path,
            "resolution_file_path": resolution_path,
            "extension_file_path": extension_path,
            "aging": calculate_business_days(i_date, c_date) if c_date else 0,
            "user_input": current_user.user_id,
            "is_deleted": "N",
            "action": "Add"
        })

        # Audit Log
        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """

        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": "REQ_ADD_COMPLAINT",
            "target_type": "ComplaintOtor",
            "target_id": request_id,
            "detail": json.dumps({"status": "submitted to otor"})
        })

        db.commit()
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        if hasattr(e, 'orig'):
            error_msg = f"Database Error: {e.orig}"
        raise HTTPException(status_code=500, detail=error_msg)

    return {"message": f"Data dengan Req ID {request_id} berhasil request input.", "request_id": request_id}


@router.put("/complaints/{id}")
async def update_complaint(
    id: str,
    customer_name: str = Form(...),
    amount: float = Form(...),
    city_code: str = Form(...),
    branch_code: str = Form(...),
    atm_card_number: str = Form(...),
    description: str = Form(...),
    received_date: str = Form(...),
    incident_date: str = Form(...),
    completion_date: str = Form(""),
    channel_code: str = Form(...),

    incident_checkbox: str = Form("N"),
    request_type: str = Form(""),
    channel_source: str = Form(""),
    location: str = Form(""),
    address: str = Form(""),

    settlement_number: str = Form(""),
    extension_number: str = Form(""),

    reg_product_601: str = Form(""),
    reg_problem_601: str = Form(""),
    reg_product_602: str = Form(""),
    reg_problem_602: str = Form(""),
    reg_product_603: str = Form(""),
    reg_problem_603: str = Form(""),
    reg_product_604: str = Form(""),
    reg_problem_604: str = Form(""),
    reg_product_605: str = Form(""),
    reg_problem_605: str = Form(""),

    complaint_file: UploadFile = File(None),
    resolution_file: UploadFile = File(None),
    extension_file: UploadFile = File(None),

    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify existing complaint
    existing_complaint = db.execute(text("""
        SELECT * FROM comphand.complaints
        WHERE request_id = :id AND isdeleted = 'N'
    """), {"id": id}).mappings().first()

    if existing_complaint:
        request_id = existing_complaint["request_id"]

    if not existing_complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Check if there's already a pending otor request
    pending_otor = db.execute(text("""
        SELECT 1 FROM comphand.complaints_otor
        WHERE request_id = :request_id AND isdeleted = 'N'
    """), {"request_id": request_id}).first()

    if pending_otor:
        raise HTTPException(status_code=400, detail="Data already pending in authorization queue")

    try:
        r_date = datetime.strptime(received_date, "%Y-%m-%d").date()
        i_date = datetime.strptime(incident_date, "%Y-%m-%d").date()
        c_date = datetime.strptime(completion_date, "%Y-%m-%d").date() if completion_date else None
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    if r_date < i_date:
        raise HTTPException(status_code=400, detail="Received date tidak dapat lebih awal dari Incident date")

    # Checking file requirements considering existing files
    has_res_file = (resolution_file and getattr(resolution_file, "filename", None)) or existing_complaint["penyelesaian_file_path"]
    has_ext_file = (extension_file and getattr(extension_file, "filename", None)) or existing_complaint["perpanjangan_file_path"]

    if settlement_number and not has_res_file:
        raise HTTPException(status_code=400, detail="Resolution file is required if settlement number is provided")
    if has_res_file and not settlement_number:
        raise HTTPException(status_code=400, detail="Settlement number is required if resolution file is provided")

    if extension_number and not has_ext_file:
        raise HTTPException(status_code=400, detail="Extension file is required if extension number is provided")
    if has_ext_file and not extension_number:
        raise HTTPException(status_code=400, detail="Extension number is required if extension file is provided")

    base_folder = "ComplainNotOtor"
    try:
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Pengaduan"), exist_ok=True)
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Penyelesaian"), exist_ok=True)
        os.makedirs(os.path.join(UPLOAD_DIR, base_folder, "Perpanjangan"), exist_ok=True)

        complaint_path = existing_complaint["pengaduan_file_path"]
        if complaint_file and getattr(complaint_file, "filename", None):
            comp_filename = complaint_file.filename
            _, comp_ext = os.path.splitext(comp_filename)
            complaint_path = f"{base_folder}/Pengaduan/{request_id}{comp_ext}"
            with open(os.path.join(UPLOAD_DIR, complaint_path), "wb") as buffer:
                shutil.copyfileobj(complaint_file.file, buffer)

        resolution_path = existing_complaint["penyelesaian_file_path"]
        if resolution_file and getattr(resolution_file, "filename", None):
            res_filename = resolution_file.filename
            _, res_ext = os.path.splitext(res_filename)
            resolution_path = f"{base_folder}/Penyelesaian/{request_id}{res_ext}"
            with open(os.path.join(UPLOAD_DIR, resolution_path), "wb") as buffer:
                shutil.copyfileobj(resolution_file.file, buffer)

        extension_path = existing_complaint["perpanjangan_file_path"]
        if extension_file and getattr(extension_file, "filename", None):
            ext_filename = extension_file.filename
            _, ext_ext = os.path.splitext(ext_filename)
            extension_path = f"{base_folder}/Perpanjangan/{request_id}{ext_ext}"
            with open(os.path.join(UPLOAD_DIR, extension_path), "wb") as buffer:
                shutil.copyfileobj(extension_file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=503, detail="Failed to access remote file storage. Please try again later.")

    if c_date:
        complaint_status = "Completed"
    elif extension_number and extension_path:
        complaint_status = "Extend"
    else:
        complaint_status = "In Progress"

    insert_otor_query = """
        INSERT INTO comphand.complaints_otor (
            request_id, customer_name, amount, location, city_code, branch_code,
            atm_card_number, description, received_date, incident_date, completion_date,
            channel, incident_checkbox, request_type, comp_source, address, status,
            settlement_number, extension_number, code_601_product, code_601_problem,
            code_602_product, code_602_problem, code_603_product, code_603_problem,
            code_604_product, code_604_problem, code_605_product, code_605_problem,
            pengaduan_file_path, penyelesaian_file_path, perpanjangan_file_path,
            aging, user_input, user_otor, isdeleted, action, created_at, updated_at
        ) VALUES (
            :request_id, :customer_name, :amount, :location, :city_code, :branch_code,
            :atm_card_number, :description, :received_date, :incident_date, :completion_date,
            :channel_code, :incident_checkbox, :request_type, :channel_source, :address, :status,
            :settlement_number, :extension_number, :reg_product_601, :reg_problem_601,
            :reg_product_602, :reg_problem_602, :reg_product_603, :reg_problem_603,
            :reg_product_604, :reg_problem_604, :reg_product_605, :reg_problem_605,
            :complaint_file_path, :resolution_file_path, :extension_file_path,
            :aging, :user_input, :user_otor, :is_deleted, :action, :created_at, NOW()
        )
    """

    db.execute(text(insert_otor_query), {
        "request_id": request_id,
        "customer_name": encrypt_deterministic("customer_name"),
        "amount": amount,
        "location": location,
        "city_code": city_code,
        "branch_code": branch_code,
        "atm_card_number": encrypt_deterministic("atm_card_number"),
        "description": description,
        "received_date": r_date,
        "incident_date": r_date,
        "completion_date": c_date,
        "channel_code": channel_code,
        "incident_checkbox": incident_checkbox,
        "request_type": request_type,
        "channel_source": channel_source,
        "address": encrypt_deterministic(address) if address else None,
        "status":complaint_status,   
        "settlement_number": settlement_number,
        "extension_number": extension_number,
        "reg_product_601": reg_product_601,
        "reg_problem_601": reg_problem_601,
        "reg_product_602": reg_product_602,
        "reg_problem_602": reg_problem_602,
        "reg_product_603": reg_product_603,
        "reg_problem_603": reg_problem_603,
        "reg_product_604": reg_product_604,
        "reg_problem_604": reg_problem_604,
        "reg_product_605": reg_product_605,
        "reg_problem_605": reg_problem_605,
        "complaint_file_path": complaint_path,
        "resolution_file_path": resolution_path,
        "extension_file_path": extension_path,
        "aging": calculate_business_days(i_date, c_date) if c_date else existing_complaint["aging"],
        "user_input": current_user.user_id,
        "user_otor": existing_complaint["user_otor"],
        "is_deleted": "N",
        "action": "Edit",
        "created_at": existing_complaint["created_at"]
    })

    changed_fields = {}

    def check_change(field_name, old_val, new_val):
        old_str = str(old_val) if old_val is not None else ""
        new_str = str(new_val) if new_val is not None else ""
        if old_str != new_str:
            if field_name in ['atm_card_number', 'customer_name', 'address']:
                changed_fields[field_name] = {"old": mask_sensitive_data(field_name, old_str), "new": mask_sensitive_data(field_name, new_str)}
            else:
                changed_fields[field_name] = {"old": old_str, "new": new_str}

    check_change("customer_name", decrypt_deterministic(existing_complaint["customer_name"]) if existing_complaint["customer_name"] else "", customer_name)
    check_change("amount", existing_complaint["amount"], amount)
    check_change("location", existing_complaint["location"], location)
    check_change("city_code", existing_complaint["city_code"], city_code)
    check_change("branch_code", existing_complaint["branch_code"], branch_code)
    check_change("atm_card_number", decrypt_deterministic(existing_complaint["atm_card_number"]) if existing_complaint.get("atm_card_number") else "", atm_card_number)
    check_change("description", existing_complaint["description"], description)
    check_change("received_date", existing_complaint["received_date"], r_date)
    check_change("incident_date", existing_complaint["incident_date"], i_date)
    check_change("completion_date", existing_complaint["completion_date"], c_date)
    check_change("channel", existing_complaint["channel"], channel_code)
    check_change("incident_checkbox", existing_complaint["incident_checkbox"], incident_checkbox)
    check_change("request_type", existing_complaint["request_type"], request_type)
    check_change("comp_source", existing_complaint["comp_source"], channel_source)
    check_change("address", decrypt_deterministic(existing_complaint["address"]) if existing_complaint.get("address") else "", address)
    check_change("settlement_number", existing_complaint["settlement_number"], settlement_number)
    check_change("extension_number", existing_complaint["extension_number"], extension_number)

    for i in range(1, 6):
        old_prod = existing_complaint[f"code_60{i}_product"]
        new_prod = locals()[f"reg_product_60{i}"]
        check_change(f"code_60{i}_product", old_prod, new_prod)

        old_prob = existing_complaint[f"code_60{i}_problem"]
        new_prob = locals()[f"reg_problem_60{i}"]
        check_change(f"code_60{i}_problem", old_prob, new_prob)

    if complaint_file and getattr(complaint_file, "filename", None):
        changed_fields["complaint_file"] = {"old": str(existing_complaint["pengaduan_file_path"]), "new": "new file uploaded"}
    if resolution_file and getattr(resolution_file, "filename", None):
        changed_fields["resolution_file"] = {"old": str(existing_complaint["penyelesaian_file_path"]), "new": "new file uploaded"}
    if extension_file and getattr(extension_file, "filename", None):
        changed_fields["extension_file"] = {"old": str(existing_complaint["perpanjangan_file_path"]), "new": "new file uploaded"}

    insert_audit_query = """
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """

    db.execute(text(insert_audit_query), {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "REQ_EDIT_COMPLAINT",
        "target_type": "Complaintotor",
        "target_id": request_id,
        "detail": json.dumps({
            "status": "edit submitted to otor",
            "changed_fields": changed_fields
        })
    })

    db.commit()
    return {"message": f"Data dengan Req ID {request_id} berhasil request edit.", "request_id": request_id}


@router.post("/complaints/{id}/request-delete")
async def request_delete_complaint(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify existing complaint
    existing_complaint = db.execute(text("""
        SELECT * FROM comphand.complaints
        WHERE uuid = :id AND isdeleted = 'N'
    """), {"id": id}).mappings().first()

    if existing_complaint:
        request_id = existing_complaint["request_id"]

    if not existing_complaint:
        raise HTTPException(status_code=404, detail="Complaint data not exist")

    # Check if there's already a pending otor request
    pending_otor = db.execute(text("""
        SELECT 1 FROM comphand.complaints_otor
        WHERE request_id = :request_id AND isdeleted = 'N'
    """), {"request_id": request_id}).first()

    if pending_otor:
        raise HTTPException(status_code=400, detail="Data already pending in authorization queue")

    # Create Complaintotor with action = Delete
    insert_otor_query = """
        INSERT INTO comphand.complaints_otor (
            request_id, customer_name, amount, location, city_code, branch_code,
            atm_card_number, description, received_date, incident_date, completion_date,
            channel, incident_checkbox, request_type, comp_source, address, status,
            settlement_number, extension_number, code_601_product, code_601_problem,
            code_602_product, code_602_problem, code_603_product, code_603_problem,
            code_604_product, code_604_problem, code_605_product, code_605_problem,
            pengaduan_file_path, penyelesaian_file_path, perpanjangan_file_path,
            aging, user_input, user_otor, isdeleted, action, created_at, updated_at
        ) VALUES (
            :request_id, :customer_name, :amount, :location, :city_code, :branch_code,
            :atm_card_number, :description, :received_date, :incident_date, :completion_date,
            :channel_code, :incident_checkbox, :request_type, :channel_source, :address, :status,
            :settlement_number, :extension_number, :code_601_product, :code_601_problem,
            :code_602_product, :code_602_problem, :code_603_product, :code_603_problem,
            :code_604_product, :code_604_problem, :code_605_product, :code_605_problem,
            :pengaduan_file_path, :penyelesaian_file_path, :perpanjangan_file_path,
            :aging, :user_input, :user_otor, :isdeleted, :action, :created_at, NOW()
        )
    """

    db.execute(text(insert_otor_query), {
        "request_id": request_id,
        "customer_name": existing_complaint["customer_name"],
        "amount": existing_complaint["amount"],
        "location": existing_complaint["location"],
        "city_code": existing_complaint["city_code"],
        "branch_code": existing_complaint["branch_code"],
        "atm_card_number": existing_complaint["atm_card_number"],
        "description": existing_complaint["description"],
        "received_date": existing_complaint["received_date"],
        "incident_date": existing_complaint["incident_date"],
        "completion_date": existing_complaint["completion_date"],
        "channel_code": existing_complaint["channel"],
        "incident_checkbox": existing_complaint["incident_checkbox"],
        "request_type": existing_complaint["request_type"],
        "channel_source": existing_complaint["comp_source"],
        "address": existing_complaint["address"],
        "status": existing_complaint["status"],
        "settlement_number": existing_complaint["settlement_number"],
        "extension_number": existing_complaint["extension_number"],
        "code_601_product": existing_complaint["code_601_product"],
        "code_601_problem": existing_complaint["code_601_problem"],
        "code_602_product": existing_complaint["code_602_product"],
        "code_602_problem": existing_complaint["code_602_problem"],
        "code_603_product": existing_complaint["code_603_product"],
        "code_603_problem": existing_complaint["code_603_problem"],
        "code_604_product": existing_complaint["code_604_product"],
        "code_604_problem": existing_complaint["code_604_problem"],
        "code_605_product": existing_complaint["code_605_product"],
        "code_605_problem": existing_complaint["code_605_problem"],
        "pengaduan_file_path": existing_complaint["pengaduan_file_path"],
        "penyelesaian_file_path": existing_complaint["penyelesaian_file_path"],
        "perpanjangan_file_path": existing_complaint["perpanjangan_file_path"],
        "aging": existing_complaint["aging"],
        "user_input": current_user.user_id,
        "user_otor": existing_complaint["user_otor"],
        "isdeleted": "N",
        "action": "Delete",
        "created_at": existing_complaint["created_at"]
    })

    insert_audit_query = """
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """

    db.execute(text(insert_audit_query), {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "REQ_DELETE_COMPLAINT",
        "target_type": "Complaintotor",
        "target_id": request_id,
        "detail": json.dumps({"status": "delete submitted to otor"})
    })

    db.commit()
    return {"message": f"Data dengan Req ID {request_id} berhasil request delete.", "request_id": request_id}


@router.get("/generate-request-id")
async def generate_request_id(
    comp_type: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not comp_type:
        raise HTTPException(status_code=400, detail="comp_type is required")
    date_str = datetime.now().strftime("%Y%m")
    try:
        try:
            row = db.execute(text(f'SELECT last_value, is_called FROM comphand."counter_{comp_type}"')).fetchone()
        except Exception:
            db.rollback()
            row = db.execute(text(f'SELECT last_value, is_called FROM "counter_{comp_type}"')).fetchone()

        seq_val = row.last_value if not row.is_called else row.last_value + 1
        request_id = f"{comp_type}{date_str}{str(seq_val).zfill(3)}"
        return {"request_id": request_id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate request ID: {str(e)}")


@router.get("/options/form-data")
async def get_form_data(
    include_deleted: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    where_clause = "" if include_deleted else "WHERE isdeleted = 'N'"

    comp_types = db.execute(text(f"SELECT * FROM comphand.comp_type {where_clause}")).mappings().all()
    channels = db.execute(text(f"SELECT * FROM comphand.channel {where_clause}")).mappings().all()
    cities = db.execute(text(f"SELECT * FROM comphand.city {where_clause}")).mappings().all()
    branches = db.execute(text(f"SELECT * FROM comphand.branch {where_clause}")).mappings().all()
    request_types = db.execute(text(f"SELECT * FROM comphand.request_type {where_clause}")).mappings().all()

    code601 = db.execute(text(f"SELECT * FROM comphand.code_601 {where_clause}")).mappings().all()
    code601_info = db.execute(text(f"SELECT * FROM comphand.code_601_info {where_clause}")).mappings().all()
    code602 = db.execute(text(f"SELECT * FROM comphand.code_602 {where_clause}")).mappings().all()
    code602_info = db.execute(text(f"SELECT * FROM comphand.code_602_info {where_clause}")).mappings().all()
    code603 = db.execute(text(f"SELECT * FROM comphand.code_603 {where_clause}")).mappings().all()
    code603_info = db.execute(text(f"SELECT * FROM comphand.code_603_info {where_clause}")).mappings().all()
    code604 = db.execute(text(f"SELECT * FROM comphand.code_604 {where_clause}")).mappings().all()
    code604_info = db.execute(text(f"SELECT * FROM comphand.code_604_info {where_clause}")).mappings().all()
    code605 = db.execute(text(f"SELECT * FROM comphand.code_605 {where_clause}")).mappings().all()
    code605_info = db.execute(text(f"SELECT * FROM comphand.code_605_info {where_clause}")).mappings().all()

    return {
        "comp_types": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["code"], "name": c["name"], "is_deleted": c.get("isdeleted") == "Y"} for c in comp_types],
        "channels": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["channels_code"], "name": c["channel_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in channels],
        "cities": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["city_code"], "name": c["city_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in cities],
        "branches": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["branch_code"], "name": c["branch_name"], "city_code": c["city_code"], "is_deleted": c.get("isdeleted") == "Y"} for c in branches],
        "request_types": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["req_code"], "name": c["req_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in request_types],
        "code601": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["product_code"], "name": c["product_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code601],
        "code601_info": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["productinfo_code"], "name": c["productinfo_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code601_info],
        "code602": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["product_code"], "name": c["product_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code602],
        "code602_info": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["productinfo_code"], "name": c["productinfo_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code602_info],
        "code603": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["product_code"], "name": c["product_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code603],
        "code603_info": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["productinfo_code"], "name": c["productinfo_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code603_info],
        "code604": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["product_code"], "name": c["product_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code604],
        "code604_info": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["productinfo_code"], "name": c["productinfo_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code604_info],
        "code605": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["product_code"], "name": c["product_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code605],
        "code605_info": [{"uuid": str(c["uuid"]) if "uuid" in c and c["uuid"] else None, "code": c["productinfo_code"], "name": c["productinfo_name"], "is_deleted": c.get("isdeleted") == "Y"} for c in code605_info],
    }


@router.get("/complaints/list")
async def get_complaints_list(
    page: int = 1,
    limit: int = 10,
    search: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    # Query to count total overall
    total_all = db.execute(text("SELECT COUNT(*) FROM comphand.complaints WHERE isdeleted = 'N'")).scalar()
    total_incident = db.execute(text("SELECT COUNT(*) FROM comphand.complaints WHERE isdeleted = 'N' AND incident_checkbox = 'Y'")).scalar()

    sql_query = """
        SELECT c.uuid, c.request_id, c.customer_name, ch.channel_name, c.channel,
               c.status, c.incident_checkbox, c.created_at, c.user_input, c.action
        FROM comphand.complaints c
        LEFT JOIN comphand.channel ch ON c.channel = ch.channels_code
        WHERE c.isdeleted = 'N'
    """

    count_query = """
        SELECT COUNT(*)
        FROM comphand.complaints c
        LEFT JOIN comphand.channel ch ON c.channel = ch.channels_code
        WHERE c.isdeleted = 'N'
    """

    params = {}
    filter_clause = ""

    if search:
        search_term = f"%{search}%"
        encrypted_search = encrypt_deterministic(search)
        filter_clause += """
            AND (
                CAST(c.request_id AS VARCHAR) ILIKE :search
                OR c.customer_name = :encrypted_search
                OR c.atm_card_number = :encrypted_search
                OR CAST(ch.channel_name AS VARCHAR) ILIKE :search
                OR CAST(c.user_input AS VARCHAR) ILIKE :search
            )
        """
        params["search"] = search_term
        params["encrypted_search"] = encrypted_search

    if status:
        if status.lower() == "incident":
            filter_clause += " AND c.incident_checkbox = 'Y'"
        elif status.lower() == "complaint":
            filter_clause += " AND c.incident_checkbox = 'N'"

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            filter_clause += " AND DATE(c.created_at) >= :start_date"
            params["start_date"] = start_dt
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            filter_clause += " AND DATE(c.created_at) <= :end_date"
            params["end_date"] = end_dt
        except ValueError:
            pass

    sql_query += filter_clause
    count_query += filter_clause

    sql_query += " ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset"

    params_count = params.copy()
    params["limit"] = limit
    params["offset"] = (page - 1) * limit

    total_items = db.execute(text(count_query), params_count).scalar()
    total_pages = (total_items + limit - 1) // limit if total_items else 0

    results = db.execute(text(sql_query), params).mappings().all()

    formatted_results = []
    for row in results:
        formatted_results.append({
            "id": str(row["uuid"]),
            "request_id": row["request_id"],
            "customer_name": decrypt_deterministic(row["customer_name"]) if row.get("customer_name") else "",
            "issue_type": row["channel_name"] or row["channel"],
            "submitter": row["user_input"],
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "status": "Incident" if row["incident_checkbox"] == "Y" else "Complaint",
            "req_status": row["status"],
            "action": row["action"],
        })

    return {
        "data": formatted_results,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_items": total_items,
            "limit": limit
        },
        "stats": {
            "total_pending": total_all,
            "total_incident": total_incident
        }
    }


@router.get("/report")
async def get_complaint_report(
    start_date: str = None,
    end_date: str = None,
    product_category: str = None,
    download: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    import pandas as pd
    import io
    from fastapi.responses import StreamingResponse
    from datetime import datetime

    date_filter = ""
    params = {}

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            date_filter += " AND DATE(c.received_date) >= :start_date"
            params["start_date"] = start_dt
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            date_filter += " AND DATE(c.received_date) <= :end_date"
            params["end_date"] = end_dt
        except ValueError:
            pass

    def generate_sql_block(code_table, info_table, code_num):
        return f"""
            SELECT COUNT(c.request_id) AS FREK,
                   '{code_num}-' || c_{code_num}.product_name AS PRODUCT_TYPE,
                   ci_{code_num}.productinfo_name AS PROBLEM_TYPE,
                   '{code_num}' AS KODE, c.code_{code_num}_product as RPOD, c.code_{code_num}_problem as PROB
            FROM comphand.complaints c
            JOIN comphand.{code_table} c_{code_num} ON c.code_{code_num}_product = c_{code_num}.product_code
            JOIN comphand.{info_table} ci_{code_num} ON c.code_{code_num}_problem = ci_{code_num}.productinfo_code
            WHERE TRIM(c.code_{code_num}_product) != ''
              AND TRIM(c.code_{code_num}_problem) != ''
              AND c.isdeleted = 'N'
              {date_filter}
            GROUP BY c.code_{code_num}_product, c.code_{code_num}_problem, c_{code_num}.product_name, ci_{code_num}.productinfo_name
        """

    sql_blocks = [
        generate_sql_block("code_601", "code_601_info", "601"),
        generate_sql_block("code_602", "code_602_info", "602"),
        generate_sql_block("code_603", "code_603_info", "603"),
        generate_sql_block("code_604", "code_604_info", "604"),
        generate_sql_block("code_605", "code_605_info", "605"),
    ]

    full_sql = "SELECT PRODUCT_TYPE AS \"productType\", PROBLEM_TYPE AS \"problemType\", FREK AS \"totalComplaints\" FROM (" + \
               " UNION ALL ".join(sql_blocks) + \
               ") RESULT"

    if product_category and product_category != "all":
        full_sql += " WHERE PRODUCT_TYPE = :product_category"
        params["product_category"] = product_category

    full_sql += " ORDER BY KODE, RPOD, PROB"

    results = db.execute(text(full_sql), params).mappings().all()

    formatted_results = []
    for row in results:
        formatted_results.append({
            "productType": row["productType"],
            "problemType": row["problemType"],
            "totalComplaints": row["totalComplaints"]
        })

    is_download = download and download.lower() == 'true'

    if not is_download:
        return {"data": formatted_results}

    # Excel Generation for Detailed Download
    detail_sql = f"""
        SELECT 
            c.request_id, c.received_date, c.customer_name, c.atm_card_number,
            c.incident_date, c.location, c.city_code, c.description, c.amount,
            c.completion_date, c.settlement_number,
            c.code_601_product, c.code_601_problem,
            c.code_602_product, c.code_602_problem,
            c.code_603_product, c.code_603_problem,
            c.code_604_product, c.code_604_problem,
            c.code_605_product, c.code_605_problem
        FROM comphand.complaints c
        LEFT JOIN comphand.code_601 c_601 ON c.code_601_product = c_601.product_code
        LEFT JOIN comphand.code_602 c_602 ON c.code_602_product = c_602.product_code
        LEFT JOIN comphand.code_603 c_603 ON c.code_603_product = c_603.product_code
        LEFT JOIN comphand.code_604 c_604 ON c.code_604_product = c_604.product_code
        LEFT JOIN comphand.code_605 c_605 ON c.code_605_product = c_605.product_code
        WHERE c.isdeleted = 'N' {date_filter}
    """

    if product_category and product_category != "all":
        detail_sql += """
            AND (
                ('601-' || c_601.product_name) = :product_category OR
                ('602-' || c_602.product_name) = :product_category OR
                ('603-' || c_603.product_name) = :product_category OR
                ('604-' || c_604.product_name) = :product_category OR
                ('605-' || c_605.product_name) = :product_category
            )
        """

    detail_sql += " ORDER BY c.received_date DESC"

    detail_results = db.execute(text(detail_sql), params).mappings().all()

    def mask_name(name):
        if not name: return ""
        name = str(name).strip()
        if len(name) <= 3: return "xxx"
        return name[:-3] + "xxx"

    def mask_card(card):
        if not card: return ""
        card = str(card).replace(" ", "").replace("-", "")
        if len(card) >= 12:
            visible = card[:12]
            return f"{visible[:4]} {visible[4:8]} {visible[8:12]} XXXX"
        return card

    excel_data = []
    for idx, row in enumerate(detail_results, 1):
        decrypted_name = decrypt_deterministic(row["customer_name"]) if row.get("customer_name") else ""
        decrypted_card = decrypt_deterministic(row["atm_card_number"]) if row.get("atm_card_number") else ""

        excel_data.append({
            "No.": idx,
            "Request ID": row["request_id"] or "",
            "Tgl. Terima": row["received_date"].strftime("%m/%d/%Y") if row.get("received_date") else "",
            "Nama Nasabah": mask_name(decrypted_name),
            "No. Kartu ATM": mask_card(decrypted_card),
            "Tgl. Kejadian": row["incident_date"].strftime("%m/%d/%Y") if row.get("incident_date") else "",
            "Tempat": row["location"] or "",
            "Wilayah": f"{row['city_code']}" if row.get("city_code") else "",
            "Keterangan": row["description"] or "",
            "Nilai Transaksi": float(row["amount"]) if row.get("amount") is not None else 0,
            "Tgl. Selesai": row["completion_date"].strftime("%m/%d/%Y") if row.get("completion_date") else "",
            "No. Surat": row["settlement_number"] or "",
            "601 Product": row["code_601_product"] or "",
            "601 Problem": row["code_601_problem"] or "",
            "602 Product": row["code_602_product"] or "",
            "602 Problem": row["code_602_problem"] or "",
            "603 Product": row["code_603_product"] or "",
            "603 Problem": row["code_603_problem"] or "",
            "604 Product": row["code_604_product"] or "",
            "604 Problem": row["code_604_problem"] or "",
            "605 Product": row["code_605_product"] or "",
            "605 Problem": row["code_605_problem"] or ""
        })

    df = pd.DataFrame(excel_data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Detailed Report')

        workbook = writer.book
        worksheet = writer.sheets['Detailed Report']
        from openpyxl.styles import Border, Side

        thin_border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )

        for row in worksheet.iter_rows(min_row=1, max_row=worksheet.max_row, min_col=1, max_col=worksheet.max_column):
            for cell in row:
                cell.border = thin_border

        # Generate Keterangan Summary Table
        description_summary = {}
        for row in detail_results:
            desc = str(row.get("description") or "").strip()
            if desc: # Exclude blank descriptions
                description_summary[desc] = description_summary.get(desc, 0) + 1

        from openpyxl.styles import PatternFill, Font, Alignment
        green_fill = PatternFill(start_color="008000", end_color="008000", fill_type="solid")
        white_font = Font(color="FFFFFF", bold=True)
        center_align = Alignment(horizontal="center", vertical="center")

        start_row = worksheet.max_row + 2

        if description_summary:
            # Write Header
            header_desc = worksheet.cell(row=start_row, column=1, value="Keterangan")
            header_desc.fill = green_fill
            header_desc.font = white_font
            header_desc.alignment = center_align
            header_desc.border = thin_border

            header_count = worksheet.cell(row=start_row, column=2, value="Jumlah")
            header_count.fill = green_fill
            header_count.font = white_font
            header_count.alignment = center_align
            header_count.border = thin_border

            start_row += 1

            # Write Data Sorted Alphabetically
            for desc, count in sorted(description_summary.items()):
                c1 = worksheet.cell(row=start_row, column=1, value=desc)
                c1.border = thin_border

                c2 = worksheet.cell(row=start_row, column=2, value=count)
                c2.border = thin_border
                start_row += 1

    # Generate Summary Tables for 601-605
    codes = ["601", "602", "603", "604", "605"]
    titles = {
        "601": "601 - JENIS PRODUK",
        "602": "602 - MASA LAPORAN",
        "603": "603 - PENYEBAB PENGADUAN",
        "604": "604 - NEGATIVE PUBLICATION",
        "605": "605 - PENYELESAIAN SENGKETA"
    }

    green_fill = PatternFill(start_color="008000", end_color="008000", fill_type="solid")
    white_font = Font(color="FFFFFF", bold=True)
    center_align = Alignment(horizontal="center", vertical="center")

    # Style the main table header (row 1)
    for col_idx in range(1, len(df.columns) + 1):
        cell = worksheet.cell(row=1, column=col_idx)
        cell.fill = green_fill
        cell.font = white_font
        cell.alignment = center_align

    start_row = worksheet.max_row + 4

    for code in codes:
        # Get product mapping from db (including deleted so historical data resolves correctly)
        product_table = f"code_{code}"
        products = db.execute(text(f"SELECT product_code, product_name FROM comphand.{product_table}")).mappings().all()
        product_map = {p["product_code"]: p["product_name"] for p in products}

        # Aggregate data
        summary = {} # {product_code: {prob_code: count}}
        unique_probs = set()
        for row in detail_results:
            prod_val = row[f"code_{code}_product"]
            prob_val = row[f"code_{code}_problem"]

            if prod_val and str(prod_val).strip():
                prod_val = str(prod_val).strip()
                if prod_val not in summary:
                    summary[prod_val] = {}

                if prob_val and str(prob_val).strip():
                    prob_val = str(prob_val).strip()
                    unique_probs.add(prob_val)
                    if prob_val not in summary[prod_val]:
                        summary[prod_val][prob_val] = 0
                    summary[prod_val][prob_val] += 1

        if not summary:
            continue

        sorted_probs = sorted(list(unique_probs))

        # Write Header Title
        title_cell = worksheet.cell(row=start_row, column=1, value=titles.get(code, f"{code}"))
        title_cell.fill = green_fill
        title_cell.font = white_font
        title_cell.alignment = center_align
        # Merge across "Keterangan", all problem code columns, and "TOTAL"
        total_columns = len(sorted_probs) + 2
        worksheet.merge_cells(start_row=start_row, start_column=1, end_row=start_row, end_column=total_columns)
        for c in range(1, total_columns + 1):
            worksheet.cell(row=start_row, column=c).border = thin_border

        start_row += 1

        # Write Column Headers
        headers = ["Keterangan"] + sorted_probs + ["TOTAL"]
        for col_idx, header in enumerate(headers, 1):
            cell = worksheet.cell(row=start_row, column=col_idx, value=header)
            cell.fill = green_fill
            cell.font = white_font
            cell.alignment = center_align
            cell.border = thin_border

        start_row += 1

        # Write Data Rows
        sorted_prods = sorted(summary.keys())
        for prod_code in sorted_prods:
            counts = summary[prod_code]
            total = sum(counts.values())
            prod_name = product_map.get(prod_code, "")
            desc = f"{prod_code} - {prod_name}" if prod_name else prod_code

            row_data = [desc]
            for p in sorted_probs:
                row_data.append(counts.get(p, 0))
            row_data.append(total)

            for col_idx, val in enumerate(row_data, 1):
                cell = worksheet.cell(row=start_row, column=col_idx, value=val)
                cell.border = thin_border

            start_row += 1

        # Add an empty row between tables
        start_row += 1

    output.seek(0)

    # Audit Logging
    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "EXPORT",
        "target_type": "COMPLAINT_REPORT",
        "target_id": "EXPORT_EXCEL",
        "detail": "{}"
    })

    db.commit()

    filename = f"Complaint_Handling_Report_{datetime.now().strftime('%Y%m%d%H%M')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/resolution-report")
async def get_resolution_report(
    start_date: str = None,
    end_date: str = None,
    branch_code: str = None,
    download: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    import pandas as pd
    import io
    from fastapi.responses import StreamingResponse
    from datetime import datetime
    import uuid

    date_filter = ""
    params = {}

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            date_filter += " AND DATE(received_date) >= :start_date"
            params["start_date"] = start_dt
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            date_filter += " AND DATE(received_date) <= :end_date"
            params["end_date"] = end_dt
        except ValueError:
            pass

    branch_filter = ""
    if branch_code and branch_code != "all":
        branch_filter = " AND branch_code = :branch_code"
        params["branch_code"] = branch_code

    full_sql = f"""
        SELECT RESULT.BRANCH_CODE, b.branch_name, RESULT.KET, RESULT.FREK, RESULT.RATA FROM (
            SELECT BRANCH_CODE, 'Pending' AS KET, COUNT(REQUEST_ID) AS FREK, 0 AS RATA
            FROM comphand.complaints
            WHERE ISDELETED = 'N' AND COMPLETION_DATE IS NULL
            {date_filter} {branch_filter}
            GROUP BY BRANCH_CODE
            
            UNION ALL
            
            SELECT BRANCH_CODE, 'Resolved' AS KET, COUNT(REQUEST_ID) AS FREK, ROUND(AVG(AGING), 1) AS RATA
            FROM comphand.complaints
            WHERE ISDELETED = 'N' AND COMPLETION_DATE IS NOT NULL
            {date_filter} {branch_filter}
            GROUP BY BRANCH_CODE
        ) RESULT
        LEFT JOIN comphand.branch b ON RESULT.BRANCH_CODE = b.branch_code
        ORDER BY RESULT.BRANCH_CODE
    """

    results = db.execute(text(full_sql), params).mappings().all()

    formatted_results = []
    for row in results:
        formatted_results.append({
            "branchCode": row["branch_code"] or "Unknown",
            "branchName": row["branch_name"] or "Unknown",
            "resolutionStatus": row["ket"],
            "totalComplaints": row["frek"],
            "avgResolutionTime": row["rata"]
        })

    is_download = download and download.lower() == 'true'

    if not is_download:
        return {"data": formatted_results}

    # Excel Generation
    df = pd.DataFrame([{
        "Branch": r["branchCode"],
        "Resolution Status": r["resolutionStatus"],
        "Total Complaint": r["totalComplaints"],
        "Avg. Resolution Time (Days)": r["avgResolutionTime"]
    } for r in formatted_results])

    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Resolution Summary')

    output.seek(0)

    # Audit Logging
    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "EXPORT",
        "target_type": "RESOLUTION_REPORT",
        "target_id": "EXPORT_EXCEL",
        "detail": "{}"
    })

    db.commit()

    filename = f"Complaint_Resolution_Report_{datetime.now().strftime('%Y%m%d%H%M')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/complaints/export")
async def export_complaints_list(
    search: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text
    sql_query = """
        SELECT c.uuid, c.request_id, c.customer_name, ch.channel_name, c.channel,
               c.status, c.incident_checkbox, c.created_at
        FROM comphand.complaints c
        LEFT JOIN comphand.channel ch ON c.channel = ch.channels_code
        WHERE c.isdeleted = 'N'
    """

    params = {}

    if search:
        search_term = f"%{search}%"
        sql_query += """
            AND (
                CAST(c.request_id AS VARCHAR) ILIKE :search
                OR CAST(c.customer_name AS VARCHAR) ILIKE :search
                OR CAST(ch.channel_name AS VARCHAR) ILIKE :search
                OR CAST(c.user_input AS VARCHAR) ILIKE :search
            )
        """
        params["search"] = search_term

    if status:
        if status.lower() == "incident":
            sql_query += " AND c.incident_checkbox = 'Y'"
        elif status.lower() == "complaint":
            sql_query += " AND c.incident_checkbox = 'N'"

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            sql_query += " AND DATE(c.created_at) >= :start_date"
            params["start_date"] = start_dt
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            sql_query += " AND DATE(c.created_at) <= :end_date"
            params["end_date"] = end_dt
        except ValueError:
            pass

    sql_query += " ORDER BY c.created_at DESC"

    results = db.execute(text(sql_query), params).mappings().all()

    formatted_results = []
    for row in results:
        formatted_date = ""
        if row["created_at"]:
            formatted_date = row["created_at"].strftime("%d/%m/%Y %H:%M")

        formatted_results.append({
            "Ticket ID": row["request_id"],
            "Customer Name": decrypt_deterministic(row["customer_name"]) if row.get("customer_name") else "",
            "Subject": row["channel_name"] or row["channel"],
            "Status": row["status"],
            "Priority": "Incident" if row["incident_checkbox"] == "Y" else "Complaint",
            "Created Date": formatted_date
        })

    df = pd.DataFrame(formatted_results)

    # Create an in-memory byte stream for Excel
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Complaints')
    output.seek(0)

    # Audit Logging
    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "EXPORT",
        "target_type": "COMPLAINT_LIST",
        "target_id": "EXPORT_EXCEL",
        "detail": "{}"
    })

    db.commit()

    # Format filename with YYYYMMDDHH24MI
    filename = f"Complaint_Report_{datetime.now().strftime('%Y%m%d%H%M')}.xlsx"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/complaints/otor_list")
async def get_otor_list(
    page: int = 1,
    limit: int = 10,
    search: str = None,
    status: str = None,
    start_date: str = None,
    end_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy import text

    count_params = {"user_id": current_user.user_id}
    total_pending = db.execute(text("SELECT COUNT(*) FROM comphand.complaints_otor WHERE isdeleted = 'N' AND user_input != :user_id"), count_params).scalar()
    total_incident = db.execute(text("SELECT COUNT(*) FROM comphand.complaints_otor WHERE isdeleted = 'N' AND incident_checkbox = 'Y' AND user_input != :user_id"), count_params).scalar()

    sql_query = """
        SELECT c.uuid, c.request_id, c.customer_name, ch.channel_name, c.channel,
               c.status, c.incident_checkbox, c.created_at, c.user_input, c.action
        FROM comphand.complaints_otor c
        LEFT JOIN comphand.channel ch ON c.channel = ch.channels_code
        WHERE c.isdeleted = 'N' AND c.user_input != :user_id
    """

    count_query = """
        SELECT COUNT(*)
        FROM comphand.complaints_otor c
        LEFT JOIN comphand.channel ch ON c.channel = ch.channels_code
        WHERE c.isdeleted = 'N' AND c.user_input != :user_id
    """

    params = {"user_id": current_user.user_id}
    filter_clause = ""

    if search:
        search_term = f"%{search}%"
        encrypted_search = encrypt_deterministic(search)
        filter_clause += """
            AND (
                CAST(c.request_id AS VARCHAR) ILIKE :search
                OR c.customer_name = :encrypted_search
                OR c.atm_card_number = :encrypted_search
                OR CAST(ch.channel_name AS VARCHAR) ILIKE :search
                OR CAST(c.user_input AS VARCHAR) ILIKE :search
            )
        """
        params["search"] = search_term
        params["encrypted_search"] = encrypted_search

    if status:
        if status.lower() == "incident":
            filter_clause += " AND c.incident_checkbox = 'Y'"
        elif status.lower() == "complaint":
            filter_clause += " AND c.incident_checkbox = 'N'"

    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
            filter_clause += " AND DATE(c.created_at) >= :start_date"
            params["start_date"] = start_dt
        except ValueError:
            pass

    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
            filter_clause += " AND DATE(c.created_at) <= :end_date"
            params["end_date"] = end_dt
        except ValueError:
            pass

    sql_query += filter_clause
    count_query += filter_clause

    sql_query += " ORDER BY c.created_at DESC LIMIT :limit OFFSET :offset"

    params_count = params.copy()
    params["limit"] = limit
    params["offset"] = (page - 1) * limit

    total_items = db.execute(text(count_query), params_count).scalar()
    total_pages = (total_items + limit - 1) // limit if total_items else 0

    results = db.execute(text(sql_query), params).mappings().all()

    formatted_results = []
    for row in results:
        formatted_results.append({
            "id": str(row["uuid"]),
            "request_id": row["request_id"],
            "customer_name": decrypt_deterministic(row["customer_name"]) if row.get("customer_name") else "",
            "issue_type": row["channel_name"] or row["channel"],
            "submitter": row["user_input"],
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "status": "Incident" if row["incident_checkbox"] == "Y" else "Complaint",
            "action": row["action"],
        })

    return {
        "data": formatted_results,
        "pagination": {
            "current_page": page,
            "total_pages": total_pages,
            "total_items": total_items,
            "limit": limit
        },
        "stats": {
            "total_pending": total_pending,
            "total_incident": total_incident
        }
    }


@router.get("/download")
async def download_file(
    filepath: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Download a file from the server.
    Expected filepath: e.g., 'ComplainNotOtor/Pengaduan/REQ-2024-8892.pdf'
    """
    if not filepath:
        raise HTTPException(status_code=400, detail="Filepath is required")

    full_path = os.path.join(UPLOAD_DIR, filepath)

    # Security check: ensure path is within UPLOAD_DIR
    if not os.path.abspath(full_path).startswith(os.path.abspath(UPLOAD_DIR)):
        raise HTTPException(status_code=403, detail="Access denied")

    if not os.path.exists(full_path) or not os.path.isfile(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    file_type = "unknown pdf"
    if "Pengaduan" in filepath:
        file_type = "complain pdf"
    elif "Penyelesaian" in filepath:
        file_type = "settlement pdf"
    elif "Perpanjangan" in filepath:
        file_type = "extension pdf"

    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "DOWNLOAD_PDF",
        "target_type": "COMPLAINT_DOCUMENT",
        "target_id": filepath,
        "detail": json.dumps({"file_type": file_type, "filepath": filepath})
    })
    db.commit()

    return FileResponse(
        full_path,
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/complaints/{id}")
async def get_complaint_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    complaint = db.execute(text("""
        SELECT c.*,
               rt.req_name as request_type_desc,
               ch.channel_name as channel_desc,
               ci.city_name as city_desc,
               b.branch_name as branch_desc,
               c601.product_name as reg_product_601_desc,
               c601i.productinfo_name as reg_problem_601_desc,
               c602.product_name as reg_product_602_desc,
               c602i.productinfo_name as reg_problem_602_desc,
               c603.product_name as reg_product_603_desc,
               c603i.productinfo_name as reg_problem_603_desc,
               c604.product_name as reg_product_604_desc,
               c604i.productinfo_name as reg_problem_604_desc,
               c605.product_name as reg_product_605_desc,
               c605i.productinfo_name as reg_problem_605_desc
        FROM comphand.complaints c
        LEFT JOIN comphand.request_type rt ON rt.req_code = c.request_type
        LEFT JOIN comphand.channel ch ON ch.channels_code = c.channel
        LEFT JOIN comphand.city ci ON ci.city_code = c.city_code
        LEFT JOIN comphand.branch b ON b.branch_code = c.branch_code
        LEFT JOIN comphand.code_601 c601 ON c601.product_code = c.code_601_product
        LEFT JOIN comphand.code_601_info c601i ON c601i.productinfo_code = c.code_601_problem
        LEFT JOIN comphand.code_602 c602 ON c602.product_code = c.code_602_product
        LEFT JOIN comphand.code_602_info c602i ON c602i.productinfo_code = c.code_602_problem
        LEFT JOIN comphand.code_603 c603 ON c603.product_code = c.code_603_product
        LEFT JOIN comphand.code_603_info c603i ON c603i.productinfo_code = c.code_603_problem
        LEFT JOIN comphand.code_604 c604 ON c604.product_code = c.code_604_product
        LEFT JOIN comphand.code_604_info c604i ON c604i.productinfo_code = c.code_604_problem
        LEFT JOIN comphand.code_605 c605 ON c605.product_code = c.code_605_product
        LEFT JOIN comphand.code_605_info c605i ON c605i.productinfo_code = c.code_605_problem
        WHERE c.uuid = :id AND c.isdeleted = 'N'
    """), {"id": id}).mappings().first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    data = {
        "request_id": complaint["request_id"],
        "customer_name": decrypt_deterministic(complaint["customer_name"]) if complaint.get("customer_name") else "",
        "amount": float(complaint["amount"]) if complaint.get("amount") else 0.0,
        "location": complaint["location"],
        "city": complaint["city_desc"] if complaint["city_desc"] else complaint["city_code"],
        "branch": complaint["branch_desc"] if complaint["branch_desc"] else complaint["branch_code"],
        "atm_card_number": decrypt_deterministic(complaint["atm_card_number"]) if complaint.get("atm_card_number") else "",
        "description": complaint["description"],
        "received_date": complaint["received_date"].isoformat() if complaint.get("received_date") else None,
        "incident_date": complaint["incident_date"].isoformat() if complaint.get("incident_date") else None,
        "completion_date": complaint["completion_date"].isoformat() if complaint.get("completion_date") else None,
        "channel": complaint["channel_desc"] if complaint["channel_desc"] else complaint["channel"],
        "incident_checkbox": complaint["incident_checkbox"],
        "status": complaint["status"],
        "classification": "Incident" if complaint["incident_checkbox"] == "Y" else "Complaint",
        "request_type": complaint["request_type_desc"] if complaint["request_type_desc"] else complaint["request_type"],
        "request_type_code": complaint["request_type"],
        "channel_source": complaint["comp_source"],
        "address": decrypt_deterministic(complaint["address"]) if complaint.get("address") else "",
        "settlement_number": complaint["settlement_number"],
        "extension_number": complaint["extension_number"],

        "reg_product_601": complaint["reg_product_601_desc"] or complaint["code_601_product"],
        "reg_problem_601": complaint["reg_problem_601_desc"] or complaint["code_601_problem"],
        "reg_product_602": complaint["reg_product_602_desc"] or complaint["code_602_product"],
        "reg_problem_602": complaint["reg_problem_602_desc"] or complaint["code_602_problem"],
        "reg_product_603": complaint["reg_product_603_desc"] or complaint["code_603_product"],
        "reg_problem_603": complaint["reg_problem_603_desc"] or complaint["code_603_problem"],
        "reg_product_604": complaint["reg_product_604_desc"] or complaint["code_604_product"],
        "reg_problem_604": complaint["reg_problem_604_desc"] or complaint["code_604_problem"],
        "reg_product_605": complaint["reg_product_605_desc"] or complaint["code_605_product"],
        "reg_problem_605": complaint["reg_problem_605_desc"] or complaint["code_605_problem"],

        "reg_product_601_code": complaint["code_601_product"],
        "reg_problem_601_code": complaint["code_601_problem"],
        "reg_product_602_code": complaint["code_602_product"],
        "reg_problem_602_code": complaint["code_602_problem"],
        "reg_product_603_code": complaint["code_603_product"],
        "reg_problem_603_code": complaint["code_603_problem"],
        "reg_product_604_code": complaint["code_604_product"],
        "reg_problem_604_code": complaint["code_604_problem"],
        "reg_product_605_code": complaint["code_605_product"],
        "reg_problem_605_code": complaint["code_605_problem"],

        "complaint_file_path": complaint["pengaduan_file_path"],
        "resolution_file_path": complaint["penyelesaian_file_path"],
        "extension_file_path": complaint["perpanjangan_file_path"],

        "aging": complaint["aging"],
        "user_input": complaint["user_input"],
        "user_otor": complaint["user_otor"],
        "action": complaint["action"],
        "created_at": complaint["created_at"].isoformat() if complaint.get("created_at") else None,
    }

    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "VIEW_DETAIL",
        "target_type": "Complaint",
        "target_id": complaint["request_id"],
        "detail": "{}"
    })
    db.commit()

    return {"data": data}


@router.get("/complaints/comp_otor/{id}")
async def get_comp_otor_detail(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otor = db.execute(text("""
        SELECT o.*,
               rt.req_name as request_type_desc,
               ch.channel_name as channel_desc,
               ci.city_name as city_desc,
               b.branch_name as branch_desc,
               c601.product_name as reg_product_601_desc,
               c601i.productinfo_name as reg_problem_601_desc,
               c602.product_name as reg_product_602_desc,
               c602i.productinfo_name as reg_problem_602_desc,
               c603.product_name as reg_product_603_desc,
               c603i.productinfo_name as reg_problem_603_desc,
               c604.product_name as reg_product_604_desc,
               c604i.productinfo_name as reg_problem_604_desc,
               c605.product_name as reg_product_605_desc,
               c605i.productinfo_name as reg_problem_605_desc
        FROM comphand.complaints_otor o
        LEFT JOIN comphand.request_type rt ON rt.req_code = o.request_type
        LEFT JOIN comphand.channel ch ON ch.channels_code = o.channel
        LEFT JOIN comphand.city ci ON ci.city_code = o.city_code
        LEFT JOIN comphand.branch b ON b.branch_code = o.branch_code
        LEFT JOIN comphand.code_601 c601 ON c601.product_code = o.code_601_product
        LEFT JOIN comphand.code_601_info c601i ON c601i.productinfo_code = o.code_601_problem
        LEFT JOIN comphand.code_602 c602 ON c602.product_code = o.code_602_product
        LEFT JOIN comphand.code_602_info c602i ON c602i.productinfo_code = o.code_602_problem
        LEFT JOIN comphand.code_603 c603 ON c603.product_code = o.code_603_product
        LEFT JOIN comphand.code_603_info c603i ON c603i.productinfo_code = o.code_603_problem
        LEFT JOIN comphand.code_604 c604 ON c604.product_code = o.code_604_product
        LEFT JOIN comphand.code_604_info c604i ON c604i.productinfo_code = o.code_604_problem
        LEFT JOIN comphand.code_605 c605 ON c605.product_code = o.code_605_product
        LEFT JOIN comphand.code_605_info c605i ON c605i.productinfo_code = o.code_605_problem
        WHERE o.uuid = :id
    """), {"id": id}).mappings().first()

    if not otor:
        raise HTTPException(status_code=404, detail="Complaint not found")

    data = {
        "request_id": otor["request_id"],
        "customer_name": decrypt_deterministic(otor["customer_name"]) if otor.get("customer_name") else "",
        "amount": float(otor["amount"]) if otor.get("amount") else 0.0,
        "location": otor["location"],
        "city": otor["city_desc"] if otor["city_desc"] else otor["city_code"],
        "branch": otor["branch_desc"] if otor["branch_desc"] else otor["branch_code"],
        "atm_card_number": decrypt_deterministic(otor["atm_card_number"]) if otor.get("atm_card_number") else "",
        "description": otor["description"],
        "received_date": otor["received_date"].isoformat() if otor.get("received_date") else None,
        "incident_date": otor["incident_date"].isoformat() if otor.get("incident_date") else None,
        "completion_date": otor["completion_date"].isoformat() if otor.get("completion_date") else None,
        "channel": otor["channel_desc"] if otor["channel_desc"] else otor["channel"],
        "incident_checkbox": otor["incident_checkbox"],
        "status": "Incident" if otor["incident_checkbox"] == "Y" else "Complaint",
        "request_type": otor["request_type_desc"] if otor["request_type_desc"] else otor["request_type"],
        "request_type_code": otor["request_type"],
        "channel_source": otor["comp_source"],
        "address": decrypt_deterministic(otor["address"]) if otor.get("address") else "",
        "settlement_number": otor["settlement_number"],
        "extension_number": otor["extension_number"],

        "reg_product_601": otor["reg_product_601_desc"] or otor["code_601_product"],
        "reg_problem_601": otor["reg_problem_601_desc"] or otor["code_601_problem"],
        "reg_product_602": otor["reg_product_602_desc"] or otor["code_602_product"],
        "reg_problem_602": otor["reg_problem_602_desc"] or otor["code_602_problem"],
        "reg_product_603": otor["reg_product_603_desc"] or otor["code_603_product"],
        "reg_problem_603": otor["reg_problem_603_desc"] or otor["code_603_problem"],
        "reg_product_604": otor["reg_product_604_desc"] or otor["code_604_product"],
        "reg_problem_604": otor["reg_problem_604_desc"] or otor["code_604_problem"],
        "reg_product_605": otor["reg_product_605_desc"] or otor["code_605_product"],
        "reg_problem_605": otor["reg_problem_605_desc"] or otor["code_605_problem"],

        "reg_product_601_code": otor["code_601_product"],
        "reg_problem_601_code": otor["code_601_problem"],
        "reg_product_602_code": otor["code_602_product"],
        "reg_problem_602_code": otor["code_602_problem"],
        "reg_product_603_code": otor["code_603_product"],
        "reg_problem_603_code": otor["code_603_problem"],
        "reg_product_604_code": otor["code_604_product"],
        "reg_problem_604_code": otor["code_604_problem"],
        "reg_product_605_code": otor["code_605_product"],
        "reg_problem_605_code": otor["code_605_problem"],

        "complaint_file_path": otor["pengaduan_file_path"],
        "resolution_file_path": otor["penyelesaian_file_path"],
        "extension_file_path": otor["perpanjangan_file_path"],

        "aging": otor["aging"],
        "user_input": otor["user_input"],
        "action": otor["action"],
        "created_at": otor["created_at"].isoformat() if otor["created_at"] else None,
    }

    audit_sql = text("""
        INSERT INTO uam.audit_log (
            id, actor_id, action, target_type, target_id, detail, created_at
        ) VALUES (
            :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
        )
    """)

    db.execute(audit_sql, {
        "id": str(uuid.uuid4()),
        "actor_id": current_user.user_id,
        "action": "VIEW_DETAIL",
        "target_type": "ComplaintOtor",
        "target_id": otor["request_id"],
        "detail": "{}"
    })
    db.commit()

    return {"data": data}

# removed duplicate import models.comphand.Complaint

@router.post("/complaints/comp_otor/{id}/approve")
async def approve_complaint_otor(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otor = db.execute(text("SELECT * FROM comphand.complaints_otor WHERE uuid = :id"), {"id": id}).mappings().first()
    if otor:
        request_id = otor["request_id"]
    if not otor:
        raise HTTPException(status_code=404, detail="Complaint authorization data not found")

    otor = dict(otor)
    for i in range(1, 6):
        if otor.get(f"code_60{i}_product") == "": otor[f"code_60{i}_product"] = None
        if otor.get(f"code_60{i}_problem") == "": otor[f"code_60{i}_problem"] = None

    if otor["user_input"] == current_user.user_id:
        try:
            insert_audit_query = """
                INSERT INTO uam.audit_log (
                    id, actor_id, action, target_type, target_id, detail, created_at
                ) VALUES (
                    :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
                )
            """
            db.execute(text(insert_audit_query), {
                "id": str(uuid.uuid4()),
                "actor_id": current_user.user_id,
                "action": "REQ_APPROVE_COMPLAINT_FAILED",
                "target_type": "Complaint",
                "target_id": request_id,
                "detail": json.dumps({
                    "status": "failed",
                    "reason": "Security anomaly: Maker attempted to approve their own request",
                    "action": otor["action"]
                })
            })
            db.commit()
        except Exception as e:
            print(f"FAILED TO INSERT AUDIT LOG: {e}")
            db.rollback()

        raise HTTPException(status_code=403, detail="Maker cannot approve their own request")

    
    try:
        if otor["action"] in ['Add', 'Update', 'Edit']:
            new_paths = {}
            for attr, folder in [('pengaduan_file_path', 'Pengaduan'), ('penyelesaian_file_path', 'Penyelesaian'), ('perpanjangan_file_path', 'Perpanjangan')]:
                old_path = otor[attr]
                if old_path:
                    filename = os.path.basename(old_path)
                    new_rel_path = f"ComplainNotOtor/{folder}/{filename}"
                    new_paths[attr] = new_rel_path

                    old_full = os.path.join(UPLOAD_DIR, old_path.replace('/', os.sep).replace('\\', os.sep))
                    new_full = os.path.join(UPLOAD_DIR, new_rel_path.replace('/', os.sep).replace('\\', os.sep))

                    os.makedirs(os.path.dirname(new_full), exist_ok=True)
                    if os.path.exists(old_full):
                        shutil.move(old_full, new_full)
            
            comp_exists = db.execute(text("SELECT 1 FROM comphand.complaints WHERE request_id = :request_id"), {"request_id": request_id}).scalar()

            changed_fields = {}
            if comp_exists and otor["action"] == "Edit":
                existing_complaint = db.execute(text("SELECT * FROM comphand.complaints WHERE request_id = :request_id"), {"request_id": request_id}).mappings().first()

                def check_change(field_name, old_val, new_val, is_encrypted=False):
                    if is_encrypted:
                        old_val = decrypt_deterministic(old_val) if old_val else ""
                        new_val = decrypt_deterministic(new_val) if new_val else ""
                    old_str = str(old_val) if old_val is not None else ""
                    new_str = str(new_val) if new_val is not None else ""
                    if old_str != new_str:
                        if field_name in ['atm_card_number', 'customer_name', 'address']:
                            changed_fields[field_name] = {"old": mask_sensitive_data(field_name, old_str), "new": mask_sensitive_data(field_name, new_str)}
                        else:
                            changed_fields[field_name] = {"old": old_str, "new": new_str}

                check_change("customer_name", existing_complaint["customer_name"], otor["customer_name"], True)
                check_change("amount", existing_complaint["amount"], otor["amount"])
                check_change("location", existing_complaint["location"], otor["location"])
                check_change("city_code", existing_complaint["city_code"], otor["city_code"])
                check_change("branch_code", existing_complaint["branch_code"], otor["branch_code"])
                check_change("atm_card_number", existing_complaint["atm_card_number"], otor["atm_card_number"], True)
                check_change("description", existing_complaint["description"], otor["description"])
                check_change("received_date", existing_complaint["received_date"], otor["received_date"])
                check_change("incident_date", existing_complaint["incident_date"], otor["incident_date"])
                check_change("completion_date", existing_complaint["completion_date"], otor["completion_date"])
                check_change("channel", existing_complaint["channel"], otor["channel"])
                check_change("incident_checkbox", existing_complaint["incident_checkbox"], otor["incident_checkbox"])
                check_change("request_type", existing_complaint["request_type"], otor["request_type"])
                check_change("comp_source", existing_complaint["comp_source"], otor["comp_source"])
                check_change("address", existing_complaint["address"], otor["address"], True)
                check_change("settlement_number", existing_complaint["settlement_number"], otor["settlement_number"])
                check_change("extension_number", existing_complaint["extension_number"], otor["extension_number"])

                for i in range(1, 6):
                    check_change(f"code_60{i}_product", existing_complaint[f"code_60{i}_product"], otor[f"code_60{i}_product"])
                    check_change(f"code_60{i}_problem", existing_complaint[f"code_60{i}_problem"], otor[f"code_60{i}_problem"])

                check_change("pengaduan_file_path", existing_complaint["pengaduan_file_path"], new_paths.get('pengaduan_file_path', otor["pengaduan_file_path"]))
                check_change("penyelesaian_file_path", existing_complaint["penyelesaian_file_path"], new_paths.get('penyelesaian_file_path', otor["penyelesaian_file_path"]))
                check_change("perpanjangan_file_path", existing_complaint["perpanjangan_file_path"], new_paths.get('perpanjangan_file_path', otor["perpanjangan_file_path"]))

            if comp_exists:
                db.execute(text("""
                    UPDATE comphand.complaints SET
                        customer_name = :customer_name,
                        amount = :amount,
                        location = :location,
                        city_code = :city_code,
                        branch_code = :branch_code,
                        atm_card_number = :atm_card_number,
                        description = :description,
                        received_date = :received_date,
                        incident_date = :incident_date,
                        completion_date = :completion_date,
                        channel = :channel,
                        incident_checkbox = :incident_checkbox,
                        request_type = :request_type,
                        comp_source = :comp_source,
                        address = :address,
                        status = :status,
                        settlement_number = :settlement_number,
                        extension_number = :extension_number,
                        code_601_product = :code_601_product,
                        code_601_problem = :code_601_problem,
                        code_602_product = :code_602_product,
                        code_602_problem = :code_602_problem,
                        code_603_product = :code_603_product,
                        code_603_problem = :code_603_problem,
                        code_604_product = :code_604_product,
                        code_604_problem = :code_604_problem,
                        code_605_product = :code_605_product,
                        code_605_problem = :code_605_problem,
                        pengaduan_file_path = :pengaduan_file_path,
                        penyelesaian_file_path = :penyelesaian_file_path,
                        perpanjangan_file_path = :perpanjangan_file_path,
                        aging = :aging,
                        user_input = :user_input,
                        user_otor = :user_otor,
                        action = :action,
                        isdeleted = :isdeleted,
                        created_at = :created_at,
                        updated_at = NOW()
                    WHERE request_id = :request_id
                """), {
                    "request_id": otor["request_id"],
                    "customer_name": otor["customer_name"],
                    "amount": otor["amount"],
                    "location": otor["location"],
                    "city_code": otor["city_code"],
                    "branch_code": otor["branch_code"],
                    "atm_card_number": otor["atm_card_number"],
                    "description": otor["description"],
                    "received_date": otor["received_date"],
                    "incident_date": otor["incident_date"],
                    "completion_date": otor["completion_date"],
                    "channel": otor["channel"],
                    "incident_checkbox": otor["incident_checkbox"],
                    "request_type": otor["request_type"],
                    "comp_source": otor["comp_source"],
                    "address": otor["address"],
                    "status": otor["status"],
                    "settlement_number": otor["settlement_number"],
                    "extension_number": otor["extension_number"],
                    "code_601_product": otor["code_601_product"],
                    "code_601_problem": otor["code_601_problem"],
                    "code_602_product": otor["code_602_product"],
                    "code_602_problem": otor["code_602_problem"],
                    "code_603_product": otor["code_603_product"],
                    "code_603_problem": otor["code_603_problem"],
                    "code_604_product": otor["code_604_product"],
                    "code_604_problem": otor["code_604_problem"],
                    "code_605_product": otor["code_605_product"],
                    "code_605_problem": otor["code_605_problem"],
                    "pengaduan_file_path": new_paths.get('pengaduan_file_path', otor["pengaduan_file_path"]),
                    "penyelesaian_file_path": new_paths.get('penyelesaian_file_path', otor["penyelesaian_file_path"]),
                    "perpanjangan_file_path": new_paths.get('perpanjangan_file_path', otor["perpanjangan_file_path"]),
                    "aging": otor["aging"],
                    "user_input": otor["user_input"],
                    "user_otor": current_user.user_id,
                    "action": otor["action"],
                    "isdeleted": otor["isdeleted"],
                    "created_at": otor["created_at"]
                })
            else:
                db.execute(text(""" 
                    INSERT INTO comphand.complaints (
                        request_id, customer_name, amount, location, city_code, branch_code,
                        atm_card_number, description, received_date, incident_date, completion_date,
                        channel, incident_checkbox, request_type, comp_source, address, status, 
                        settlement_number, extension_number, 
                        code_601_product, code_601_problem,
                        code_602_product, code_602_problem,
                        code_603_product, code_603_problem,
                        code_604_product, code_604_problem,
                        code_605_product, code_605_problem,
                        pengaduan_file_path, penyelesaian_file_path, perpanjangan_file_path,
                        aging, user_input, user_otor, action, isdeleted, created_at, updated_at
                    ) VALUES (
                        :request_id, :customer_name, :amount, :location, :city_code, :branch_code,
                        :atm_card_number, :description, :received_date, :incident_date, :completion_date, 
                        :channel, :incident_checkbox, :request_type, :comp_source, :address, :status,
                        :settlement_number, :extension_number,
                        :code_601_product, :code_601_problem,
                        :code_602_product, :code_602_problem,
                        :code_603_product, :code_603_problem,
                        :code_604_product, :code_604_problem,
                        :code_605_product, :code_605_problem,
                        :pengaduan_file_path, :penyelesaian_file_path, :perpanjangan_file_path,
                        :aging, :user_input, :user_otor, :action, :isdeleted, :created_at, NOW()
                    )
                """), {
                    "request_id": otor["request_id"],
                    "customer_name": otor["customer_name"],
                    "amount": otor["amount"],
                    "location": otor["location"],
                    "city_code": otor["city_code"],
                    "branch_code": otor["branch_code"],
                    "atm_card_number": otor["atm_card_number"],
                    "description": otor["description"],
                    "received_date": otor["received_date"],
                    "incident_date": otor["incident_date"],
                    "completion_date": otor["completion_date"],
                    "channel": otor["channel"],
                    "incident_checkbox": otor["incident_checkbox"],
                    "request_type": otor["request_type"],
                    "comp_source": otor["comp_source"],
                    "address": otor["address"],
                    "status": otor["status"],
                    "settlement_number": otor["settlement_number"],
                    "extension_number": otor["extension_number"],
                    "code_601_product": otor["code_601_product"],
                    "code_601_problem": otor["code_601_problem"],
                    "code_602_product": otor["code_602_product"],
                    "code_602_problem": otor["code_602_problem"],
                    "code_603_product": otor["code_603_product"],
                    "code_603_problem": otor["code_603_problem"],
                    "code_604_product": otor["code_604_product"],
                    "code_604_problem": otor["code_604_problem"],
                    "code_605_product": otor["code_605_product"],
                    "code_605_problem": otor["code_605_problem"],
                    "pengaduan_file_path": new_paths.get('pengaduan_file_path', otor["pengaduan_file_path"]),
                    "penyelesaian_file_path": new_paths.get('penyelesaian_file_path', otor["penyelesaian_file_path"]),
                    "perpanjangan_file_path": new_paths.get('perpanjangan_file_path', otor["perpanjangan_file_path"]),
                    "aging": otor["aging"],
                    "user_input": otor["user_input"],
                    "user_otor": current_user.user_id,
                    "action": otor["action"],
                    "isdeleted": otor["isdeleted"],
                    "created_at": otor["created_at"]
                })

            db.execute(text("DELETE FROM comphand.complaints_otor WHERE request_id = :request_id"), {"request_id": request_id})

        elif otor["action"] == 'Delete':
            for attr in ['pengaduan_file_path', 'penyelesaian_file_path', 'perpanjangan_file_path']:
                path = otor[attr]
                if path:
                    full_path = os.path.join(UPLOAD_DIR, path.replace('/', '\\'))
                    if os.path.exists(full_path):
                        os.remove(full_path)

            db.execute(text("""
                UPDATE comphand.complaints
                SET isdeleted = 'Y', user_otor = :user_otor, updated_at = NOW()
                WHERE request_id = :request_id
            """), {"user_otor": current_user.user_id, "request_id": request_id})
            db.execute(text("DELETE FROM comphand.complaints_otor WHERE request_id = :request_id"), {"request_id": request_id})

        audit_detail = {"status": "approved", "action": otor["action"]}
        if otor["action"] == "Edit" and 'changed_fields' in locals():
            audit_detail["changed_fields"] = changed_fields

        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """

        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": "REQ_APPROVE_COMPLAINT",
            "target_type": "Complaint",
            "target_id": request_id,
            "detail": json.dumps(audit_detail)
        })

        db.commit()
        return {"message": f"Request {request_id} berhasil di-approve."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/complaints/comp_otor/{id}/reject")
async def reject_complaint_otor(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    otor = db.execute(text("SELECT * FROM comphand.complaints_otor WHERE uuid = :id"), {"id": id}).mappings().first()
    if otor:
        request_id = otor["request_id"]
    if not otor:
        raise HTTPException(status_code=404, detail="Complaint authorization data not found")

    if otor["user_input"] == current_user.user_id:
        try:
            insert_audit_query = """
                INSERT INTO uam.audit_log (
                    id, actor_id, action, target_type, target_id, detail, created_at
                ) VALUES (
                    :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
                )
            """
            db.execute(text(insert_audit_query), {
                "id": str(uuid.uuid4()),
                "actor_id": current_user.user_id,
                "action": "REQ_REJECT_COMPLAINT_FAILED",
                "target_type": "Complaint",
                "target_id": request_id,
                "detail": json.dumps({
                    "status": "failed",
                    "reason": "Security anomaly: Maker attempted to reject their own request",
                    "action": otor["action"]
                })
            })
            db.commit()
        except Exception as e:
            print(f"FAILED TO INSERT AUDIT LOG: {e}")
            db.rollback()

        raise HTTPException(status_code=403, detail="Maker cannot reject their own request")

    try:
        # Cleanup temporary files
        for attr in ['pengaduan_file_path', 'penyelesaian_file_path', 'perpanjangan_file_path']:
            path = otor[attr]
            if path and path.startswith('ComplainNotOtor/'):
                full_path = os.path.join(UPLOAD_DIR, path.replace('/', '\\'))
                if os.path.exists(full_path):
                    os.remove(full_path)

        db.execute(text("DELETE FROM comphand.complaints_otor WHERE request_id = :request_id"), {"request_id": request_id})

        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """

        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": "REQ_REJECT_COMPLAINT",
            "target_type": "Complaint",
            "target_id": request_id,
            "detail": json.dumps({"status": "rejected", "action": otor["action"]})
        })

        db.commit()
        return {"message": f"Request {request_id} berhasil di-reject."}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/master/request")
async def request_add_master_data(
    req: MasterDataRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    req.code1 = req.code1.strip() if req.code1 else req.code1
    req.code2 = req.code2.strip() if req.code2 else req.code2
    req.name = req.name.strip() if req.name else req.name

    try:
        # Validations
        # 1. Existing Data Duplicate depending on action (Skip for Edit)
        if req.type_prs == 'Add':
            if req.action == 'Branch':
                existing_data = db.query(Branch).filter(Branch.branch_code == req.code1).first()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Branch code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action == 'City':
                existing_data = db.query(City).filter(City.city_code == req.code1).first()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"City code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action == 'CompType':
                existing_data = db.query(CompType).filter(CompType.code == req.code1).first()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Complaint type code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action == 'ReqType':
                existing_data = db.query(RequestType).filter(RequestType.req_code == req.code1).first()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Type of Request code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action == 'Issue':
                existing_data = db.query(Channel).filter(Channel.channels_code == req.code1).first()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Issue code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action in ['601Product', '602Product', '603Product', '604Product', '605Product']:
                table_name = f"code_{req.action[:3]}"
                existing_data = db.execute(text(f"SELECT 1 FROM comphand.{table_name} WHERE product_code = :code"), {"code": req.code1}).fetchone()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{req.action} code {req.code1} sudah digunakan pada data existing"
                    )
            elif req.action in ['601Problem', '602Problem', '603Problem', '604Problem', '605Problem']:
                table_name = f"code_{req.action[:3]}_info"
                existing_data = db.execute(text(f"SELECT 1 FROM comphand.{table_name} WHERE productinfo_code = :code"), {"code": req.code1}).fetchone()
                if existing_data:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"{req.action} code {req.code1} sudah digunakan pada data existing"
                    )

        # 2. Pending Request Duplicate
        pending_request = db.query(MasterOtor).filter(
            MasterOtor.code1 == req.code1,
            MasterOtor.action == req.action,
            MasterOtor.type_prs == req.type_prs
        ).first()
        if pending_request:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{req.action} code {req.code1} sudah dalam direquest"
            )

        # 3. Inactive City (Only for Branch)
        if req.action == 'Branch':
            city = db.query(City).filter(
                City.city_code == req.code2,
                City.isdeleted == 'Y'
            ).first()
            if city:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"City code {req.code2} tidak dapat dipilih karena sudah nonaktif"
                )

        # Insert to master_otor (Native Query)
        insert_otor_query = """
            INSERT INTO comphand.master_otor (
                uuid, code1, code2, name, user_input, user_otor, action, type_prs, created_at
            ) VALUES (
                :uuid, :code1, :code2, :name, :user_input, :user_otor, :action, :type_prs, NOW()
            )
        """
        db.execute(text(insert_otor_query), {
            "uuid": str(uuid.uuid4()),
            "code1": req.code1,
            "code2": req.code2,
            "name": req.name,
            "user_input": current_user.user_id,
            "user_otor": "-",
            "action": req.action,
            "type_prs": req.type_prs
        })

        # Insert audit log to uam schema (Native Query)
        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """

        # Setup Audit Log detail
        audit_detail = {"status": "pending", "action": req.action}
        if req.type_prs == 'Edit':
            if req.old_name != req.name:
                audit_detail["old_name"] = req.old_name
                audit_detail["new_name"] = req.name

        if req.action == 'Branch':
            existing_branch = db.query(Branch).filter(Branch.branch_code == req.code1).first()
            if existing_branch and existing_branch.city_code != req.code2:
                audit_detail["old_city_code"] = existing_branch.city_code
                audit_detail["new_city_code"] = req.code2

        elif req.type_prs == 'Delete':
            audit_detail["name"] = req.name

        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": f"REQ_{req.type_prs.upper()}_MST_{req.action.upper()}",
            "target_type": req.action,
            "target_id": req.code1,
            "detail": json.dumps(audit_detail)
        })

        db.commit()
        return {"message": f"Data dengan {req.action} code {req.code1} berhasil request {req.type_prs}."}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/master_otor/pending")
async def get_master_otor_pending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        pending_requests = db.query(MasterOtor)\
            .filter(MasterOtor.user_input != current_user.user_id)\
            .order_by(MasterOtor.created_at.desc())\
            .all()

        return pending_requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


TABLE_MAPPING = {
    "Issue": {"table": "channel", "pk": "channels_code", "name": "channel_name"},
    "ReqType": {"table": "request_type", "pk": "req_code", "name": "req_name"},
    "City": {"table": "city", "pk": "city_code", "name": "city_name"},
    "Branch": {"table": "branch", "pk": "branch_code", "name": "branch_name", "fk": "city_code"},
    "CompType": {"table": "comp_type", "pk": "code", "name": "name"},
    "601Product": {"table": "code_601", "pk": "product_code", "name": "product_name"},
    "601Problem": {"table": "code_601_info", "pk": "productinfo_code", "name": "productinfo_name"},
    "602Product": {"table": "code_602", "pk": "product_code", "name": "product_name"},
    "602Problem": {"table": "code_602_info", "pk": "productinfo_code", "name": "productinfo_name"},
    "603Product": {"table": "code_603", "pk": "product_code", "name": "product_name"},
    "603Problem": {"table": "code_603_info", "pk": "productinfo_code", "name": "productinfo_name"},
    "604Product": {"table": "code_604", "pk": "product_code", "name": "product_name"},
    "604Problem": {"table": "code_604_info", "pk": "productinfo_code", "name": "productinfo_name"},
    "605Product": {"table": "code_605", "pk": "product_code", "name": "product_name"},
    "605Problem": {"table": "code_605_info", "pk": "productinfo_code", "name": "productinfo_name"},
}


@router.post("/master_otor/{id}/approve")
async def approve_master_otor(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    master_req = db.query(MasterOtor).filter(MasterOtor.uuid == id).first()
    if not master_req:
        raise HTTPException(status_code=404, detail="Request not found")

    action = master_req.action
    table_info = TABLE_MAPPING.get(action)
    if not table_info:
        raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")

    table_name = table_info["table"]
    pk_col = table_info["pk"]
    name_col = table_info["name"]
    fk_col = table_info.get("fk")

    type_prs = master_req.type_prs

    try:
        audit_detail = {
            "status": "approved",
            "table": table_name,
            "type": type_prs,
            "code1": master_req.code1,
            "name": master_req.name
        }

        if type_prs == "Add":
            check_query = f"SELECT COUNT(*) FROM comphand.{table_name} WHERE {pk_col} = :code1"
            count = db.execute(text(check_query), {"code1": master_req.code1}).scalar()
            if count > 0:
                raise HTTPException(status_code=400, detail=f"Code {master_req.code1} sudah digunakan pada data existing")

            cols = f"{pk_col}, {name_col}, user_input, user_otor, isdeleted, created_at"
            vals = ":code1, :name, :user_input, :user_otor, 'N', NOW()"
            params = {
                "code1": master_req.code1.strip() if master_req.code1 else master_req.code1,
                "name": master_req.name.strip() if master_req.name else master_req.name,
                "user_input": master_req.user_input,
                "user_otor": current_user.user_id,
            }
            if fk_col:
                cols += f", {fk_col}"
                vals += ", :code2"
                params["code2"] = master_req.code2.strip() if master_req.code2 else master_req.code2

            insert_query = f"INSERT INTO comphand.{table_name} ({cols}) VALUES ({vals})"
            db.execute(text(insert_query), params)

        elif type_prs == "Edit":
            # Fetch old data for audit log
            select_old_query = f"SELECT {name_col} as old_name"
            if fk_col:
                select_old_query += f", {fk_col} as old_fk"
            select_old_query += f" FROM comphand.{table_name} WHERE {pk_col} = :code1"
            old_data = db.execute(text(select_old_query), {"code1": master_req.code1}).mappings().first()

            if old_data:
                if old_data["old_name"] != master_req.name:
                    audit_detail["old_name"] = old_data["old_name"]
                    audit_detail["new_name"] = master_req.name
                if fk_col and old_data["old_fk"] != master_req.code2:
                    audit_detail[f"old_{fk_col}"] = old_data["old_fk"]
                    audit_detail[f"new_{fk_col}"] = master_req.code2

            update_cols = f"{name_col} = :name, user_input = :user_input, user_otor = :user_otor, isdeleted = 'N'"
            params = {
                "code1": master_req.code1.strip() if master_req.code1 else master_req.code1,
                "name": master_req.name.strip() if master_req.name else master_req.name,
                "user_input": master_req.user_input,
                "user_otor": current_user.user_id,
            }
            if fk_col:
                update_cols += f", {fk_col} = :code2"
                params["code2"] = master_req.code2.strip() if master_req.code2 else master_req.code2

            update_query = f"UPDATE comphand.{table_name} SET {update_cols} WHERE {pk_col} = :code1"
            db.execute(text(update_query), params)

        elif type_prs == "Delete":
            delete_query = f"UPDATE comphand.{table_name} SET isdeleted = 'Y' WHERE {pk_col} = :code1"
            db.execute(text(delete_query), {"code1": master_req.code1})

            if action == "City":
                cascade_query = "UPDATE comphand.branch SET isdeleted = 'Y' WHERE city_code = :code1"
                db.execute(text(cascade_query), {"code1": master_req.code1})
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported type_prs: {type_prs}")

        db.delete(master_req)

        audit_action = f"APP_{type_prs.upper()}_MST_{action.upper()}"
        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """
        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": audit_action,
            "target_type": "MasterData",
            "target_id": master_req.code1,
            "detail": json.dumps(audit_detail)
        })

        db.commit()
        return {"message": f"Successfully approved {type_prs} for {action} {master_req.code1}"}

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/master_otor/{id}/reject")
async def reject_master_otor(
    id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    master_req = db.query(MasterOtor).filter(MasterOtor.uuid == id).first()
    if not master_req:
        raise HTTPException(status_code=404, detail="Request not found")

    try:
        action = master_req.action
        type_prs = master_req.type_prs

        table_info = TABLE_MAPPING.get(action)
        table_name = table_info["table"] if table_info else action

        audit_detail = {
            "status": "rejected",
            "table": table_name,
            "type": type_prs,
            "code1": master_req.code1,
            "name": master_req.name
        }

        if table_info and table_info.get("fk"):
            audit_detail[table_info["fk"]] = master_req.code2

        db.delete(master_req)

        audit_action = f"REJ_{type_prs.upper()}_MST_{action.upper()}"
        insert_audit_query = """
            INSERT INTO uam.audit_log (
                id, actor_id, action, target_type, target_id, detail, created_at
            ) VALUES (
                :id, :actor_id, :action, :target_type, :target_id, CAST(:detail AS JSONB), NOW()
            )
        """

        db.execute(text(insert_audit_query), {
            "id": str(uuid.uuid4()),
            "actor_id": current_user.user_id,
            "action": audit_action,
            "target_type": "MasterData",
            "target_id": master_req.code1,
            "detail": json.dumps(audit_detail)
        })

        db.commit()
        return {"message": f"Successfully rejected {type_prs} for {action} {master_req.code1}"}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/audit/log", response_model=PaginatedResponse, dependencies=[require_permission("comphand.audit_log")])
def get_comphand_audit_log(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    actor_id: str | None = Query(None),
    action: str | None = Query(None),
    date_from: datetime | None = Query(None),
    date_to: datetime | None = Query(None),
    db: Session = Depends(get_db),
):
    """Query complain handling audit log with optional filters."""
    target_types = [
        "ComplaintOtor", "Complaint", "MasterData", "MasterDataOtor",
        "COMPLAINT_REPORT", "RESOLUTION_REPORT", "COMPLAINT_LIST", "COMPLAINT_DOCUMENT",
        "Branch", "City", "CompType", "ReqType", "Issue",
        "601Product", "602Product", "603Product", "604Product", "605Product",
        "601Problem", "602Problem", "603Problem", "604Problem", "605Problem"
    ]

    query = db.query(AuditLog).filter(
        AuditLog.target_type.in_(target_types)
    )

    if actor_id:
        query = query.filter(AuditLog.actor_id == actor_id)
    if action:
        query = query.filter(AuditLog.action == action)
    if date_from:
        query = query.filter(AuditLog.created_at >= date_from.replace(hour=0, minute=0, second=0, microsecond=0))
    if date_to:
        query = query.filter(AuditLog.created_at <= date_to.replace(hour=23, minute=59, second=59, microsecond=999999))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    logs = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return PaginatedResponse(
        items=[AuditLogOut.model_validate(log) for log in logs],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )
