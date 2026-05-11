import logging
from fastapi import FastAPI
from app.core.config import settings
from app.services.database import supabase
from fastapi.middleware.cors import CORSMiddleware
from app.routers import chat
from app.routers import data
from app.routers import stats
from app.routers import storage

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    description="API for TFG Portal",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat.router, prefix="/chat", tags=["IA Chat"])
app.include_router(data.router, prefix="/data", tags=["Data Access"])
app.include_router(stats.router, prefix="/data", tags=["Stats"])
app.include_router(storage.router, prefix="/storage", tags=["Storage"])

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
    
