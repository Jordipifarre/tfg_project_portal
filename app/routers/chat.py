from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.chat_agent import get_ai_response

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/ask")
async def ask_ai(request: ChatRequest):
    """Endpoint to interact with the AI chat agent."""
    response = get_ai_response(request.message)
    if "Error" in response:
        raise HTTPException(status_code=500, detail=response)
    return {"user": request.message, "ai": response}
            