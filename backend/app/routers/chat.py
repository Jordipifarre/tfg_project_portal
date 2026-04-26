from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.agents.router_agent import get_ai_response
from app.agents.sql_agent import query_database
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/ask")
async def ask_ai(request: ChatRequest):
    """General chat endpoint — routes to SQL agent, RAG, or direct LLM answer."""
    try:
        response = await run_in_threadpool(get_ai_response, request.message)
    except Exception as e:
        logger.error("Chat endpoint error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"user": request.message, "ai": response}


@router.post("/query-db")
async def ask_database(request: ChatRequest):
    """Direct SQL query endpoint, bypasses routing."""
    try:
        response = await run_in_threadpool(query_database, request.message)
    except Exception as e:
        logger.error("Direct DB query error: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return {"user": request.message, "ai_analyst": response}
