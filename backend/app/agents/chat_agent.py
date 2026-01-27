from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from app.core.config import settings

# Configuration of the Ollama LLM using settings from config.py

llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0,
)

def get_ai_response(user_input: str) -> str:
    """Generates a response from the AI model based on user input."""
    try:
        # 2. Definim el context (System) i la pregunta (Human)
        messages = [
            SystemMessage(content="Ets un assistent tècnic especialitzat en bases de dades."),
            HumanMessage(content=user_input)
        ]
        
        # 3. Invoquem el model
        response = llm.invoke(messages)
        
        # 4. El resultat és un objecte AIMessage, en traiem el contingut
        return response.content
    except Exception as e:
        return f"Error en el model de xat: {str(e)}"
    