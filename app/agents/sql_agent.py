from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_ollama import ChatOllama
from app.core.config import settings

db = SQLDatabase.from_uri(settings.DATABASE_URL)

llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0, 
)

sql_agent = create_sql_agent(
    llm=llm,
    db=db,
    agent_type="tool-calling", 
    verbose=True 
)

def query_database(user_query: str) -> str:
    """function to query the database."""
    try:
       
        prompt = (
            f"Ets un analista de dades de seguretat. Respon a la següent "
            f"pregunta consultant les taules de la base de dades: {user_query}"
        )
        
        result = sql_agent.invoke({"input": prompt})
        return result["output"]
    except Exception as e:
        return f"Error consultant la base de dades: {str(e)}"