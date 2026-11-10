from __future__ import annotations
"""
Internal Web - Backend API
Single FastAPI application serving all sub-programs.
UAM (auth, users, roles, audit) + Reconciliation + future modules.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError
import logging
import os
import sys

# Ensure the core_shared directory is in the Python path so local modules like 'routers' can be found
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# UAM Routers from core_shared
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.roles import router as roles_router
from routers.permissions import router as permissions_router
from routers.audit import router as audit_router

# Program Routers
from programs.reconcile.router import router as reconcile_router
# from programs.reconcile.router_telkom import router as reconcile_telkom_router  # Disabled
from programs.comphand.router import router as comphand_router
from programs.lld.router import router as lld_router
from programs.payroll.router import router as payroll_router

app = FastAPI(
    title="Internal Web API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS - restrict to frontend origin
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount UAM Routers ---
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(roles_router)
app.include_router(permissions_router)
app.include_router(audit_router)

# --- Mount Program Routers ---
app.include_router(reconcile_router, prefix="/api")
# app.include_router(reconcile_telkom_router, prefix="/api")  # Disabled
app.include_router(comphand_router)
app.include_router(lld_router)
app.include_router(payroll_router)

# --- Global Exception Handlers ---
@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logging.error(f"Database connection error: {exc}")
    return JSONResponse(
        status_code=503,
        content={"detail": "Service is temporarily unavailable due to a database connection issue. Please try again later."}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred."}
    )

if __name__ == "__main__":
    import uvicorn
    # Make sure to run this from the project root!
    uvicorn.run("core_shared.main:app", host="0.0.0.0", port=8000, reload=True)