from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.router_agent import get_ai_response
from app.agents.sql_agent import query_database 

router = APIRouter()

class ChatRequest(BaseModel):
    message: str


@router.post("/ask")
async def ask_ai(request: ChatRequest):
    """endpoint for general conversation."""
    response = get_ai_response(request.message)
    if "Error" in response:
        raise HTTPException(status_code=500, detail=response)
    return {"user": request.message, "ai": response}


@router.post("/query-db")
async def ask_database(request: ChatRequest):
    """endpoint for database analytical queries."""
    response = query_database(request.message)
    if "Error" in response:
        raise HTTPException(status_code=500, detail=response)
    return {"user": request.message, "ai_analyst": response}