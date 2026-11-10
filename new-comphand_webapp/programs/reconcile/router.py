from fastapi import APIRouter, UploadFile, File, Form
import json
import os
import shutil
from fastapi.responses import FileResponse
from .reconcile_engine import reconcile_process
from core_shared.storage_service import storage_service

router = APIRouter()

@router.get("/config")
async def get_config():
    # Adjusted path to the current directory of the module
    config_path = os.path.join(os.path.dirname(__file__), 'biller_config.json')
    with open(config_path, 'r') as f:
        return json.load(f)

@router.post("/reconcile")
async def run_reconciliation(
    biller_id: str = Form(...),
    date: str = Form(...),
    batch: str = Form(...),
    core_file: UploadFile = File(...),
    biller_file: UploadFile = File(...)
):
    os.makedirs("uploads", exist_ok=True)
    
    core_path = f"uploads/{core_file.filename}"
    biller_path = f"uploads/{biller_file.filename}"
    
    with open(core_path, "wb") as buffer:
        shutil.copyfileobj(core_file.file, buffer)
        
    with open(biller_path, "wb") as buffer:
        shutil.copyfileobj(biller_file.file, buffer)
        
    # Upload to Local Storage (replaces OBS)
    storage_core = storage_service.upload_file(core_path, f"input/{biller_id}/{core_file.filename}")
    storage_biller = storage_service.upload_file(biller_path, f"input/{biller_id}/{biller_file.filename}")

    if not storage_core or not storage_biller:
        return {"status": "error", "message": "Failed to upload files to local storage."}

    # Trigger the engine
    reconcile_process(biller_id, batch, date, core_path, biller_path)
    
    return {
        "status": "success",
        "message": f"Reconciliation for {biller_id} completed.",
        "download_url": "http://localhost:8000/download/Result.xlsx"
    }

@router.get("/download/Result.xlsx")
async def download_result():
    return FileResponse("Result.xlsx", media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', filename="Result.xlsx")
