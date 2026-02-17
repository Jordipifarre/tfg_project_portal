from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_ollama import ChatOllama
from app.core.config import settings


db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
db = SQLDatabase.from_uri(db_url)


llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0,
)


CUSTOM_PREFIX = """
Ets un analista de dades expert en SQL. 
IMPORTANT: Quan demanis el esquema d'una taula, veuràs 3 files de mostra. 
Aquestes 3 files NO són el total de la taula, són només EXEMPLES.
Per saber el nombre total de registres o fer càlculs, SEMPRE has d'executar una consulta SQL real (SELECT COUNT, SELECT SUM, etc.).
Respon sempre en català.
"""


sql_agent = create_sql_agent(
    llm=llm,
    db=db,
    agent_type="zero-shot-react-description",
    prefix=CUSTOM_PREFIX, 
    verbose=True,
    handle_parsing_errors=True
)

def query_database(user_query: str) -> str:
    """Funció per consultar la base de dades."""
    try:
        
        result = sql_agent.invoke({"input": user_query})
        return result["output"]
    except Exception as e:
        return f"Error consultant la base de dades: {str(e)}"