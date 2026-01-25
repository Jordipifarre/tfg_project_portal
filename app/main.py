from fastapi import FastAPI
from app.core.config import settings
from app.services.database import supabase

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="API for TFG Portal",
)

@app.get("/")
async def root():
    return {
        "message": f"Benvigut a {settings.PROJECT_NAME}",
        "status": "Running",
        "api_version": "v1"
    }

@app.get("/health")
async def health_check():    
    try:
        return {"status": "ok", "database": "connected" if supabase else "disconnected"}
    except Exception as e:
        return {"status": "error", "message": str(e)}