from langchain.agents import Tool, AgentExecutor, create_react_agent
from langchain import hub
from langchain_ollama import ChatOllama
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
        description="Utilitza aquesta eina per respondre preguntes relacionades amb la base de dades. La consulta ha de ser en format SQL i ha de ser clara i concisa."
    ),
    Tool(
        name="Cercador_Articles",
        func=lambda x: "Aquí anirà la lògica del RAG quan la tinguis", #TODO: implementar la lògica del RAG
        description="Útil per respondre preguntes sobre lleis, definicions d'odi, articles de premsa o informació teòrica."
    )
]

prompt = hub.pull("hwchase17/react")

agent = create_react_agent(llm=llm, tools=tools, prompt=prompt)

agent_executor = AgentExecutor(
    agent=agent,
    tools=tools,
    verbose=True,
    handle_parsing_errors=True
)

def get_ai_response(user_message: str) -> str:
    try:
        result = agent_executor.invoke({"input": user_message})
        return result["output"]
    except Exception as e:
        return f"Error en l'orquestrador: {str(e)}"