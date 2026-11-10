from fastapi import APIRouter

router = APIRouter()

# Placeholder for Payroll Service endpoints
@router.get("/payroll/status")
async def payroll_status():
    return {"module": "payroll", "status": "active"}
