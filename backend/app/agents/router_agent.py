from langchain.agents import create_agent
from langchain_ollama import ChatOllama
from langchain_core.tools import Tool
from app.agents.sql_agent import query_database
from app.core.config import settings


llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_MODEL,
    temperature=0,
)


tools = [
    Tool(
        name="query_database",
        func=query_database,
        description="Consulta la base de dades SQL de seguretat."
    ),
    Tool(
        name="cercador_articles",
        func=lambda x: "Lògica RAG pendent",
        description="Consulta documents i lleis."
    )
]


agent_executor = create_agent(llm, tools)

def get_ai_response(user_message: str) -> str:
    try:
       
        inputs = {"messages": [("user", user_message)]}
        result = agent_executor.invoke(inputs)
        
        
        return result["messages"][-1].content
    except Exception as e:
        return f"Error en l'orquestrador modern: {str(e)}"