"""LangGraph-based agentic chat pipeline.

The agent has three tools it can reason over:
  • query_database             – runs the SQL pipeline
  • search_documents           – runs the pgvector RAG pipeline
  • query_database_and_summarize – SQL pipeline with an explicit summarisation hint

It replaces the old keyword-classifier + separate pipeline calls.
ROUTING_MODE and ENABLE_DYNAMIC_ROUTING env vars are kept in settings for
backwards-compatibility but are no longer used by this module.
"""

from __future__ import annotations

import logging
import threading

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.prebuilt import create_react_agent

from app.utils.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tools
# ---------------------------------------------------------------------------

@tool
def query_database(natural_language_query: str) -> str:
    """
    Executes a SQL query against the citizen security database.
    Use this when the user asks about statistics, counts, comparisons,
    trends, or specific records from the datasets (crime, transport,
    airports, discrimination incidents).
    Returns the query results as formatted text.
    """
    from app.pipelines.sql_converter import query_database as _run_sql
    return _run_sql(natural_language_query)


@tool
def search_documents(query: str) -> str:
    """
    Searches the document knowledge base (PDF reports, normative documents)
    using semantic search.
    Use this when the user asks about reports, policies, analysis,
    or context that would be found in official documents rather than raw data.
    Returns relevant excerpts with source attribution.
    """
    from app.pipelines.rag_pipeline import answer_from_documents
    return answer_from_documents(query)


@tool
def query_database_and_summarize(natural_language_query: str) -> str:
    """
    Executes a SQL query and returns a natural language summary of the results.
    Use this for complex analytical questions that need both data retrieval
    and explanation (trends, comparisons, rankings).
    """
    from app.pipelines.sql_converter import query_database as _run_sql
    return _run_sql(natural_language_query)


# ---------------------------------------------------------------------------
# Agent construction (lazy singleton)
# ---------------------------------------------------------------------------

_AGENT_SYSTEM = """Ets l'assistent de SeguretatCat, una plataforma de transparència de seguretat pública de Catalunya.

Respon sempre en català, de forma clara, concisa i factual.

Eines disponibles:
- query_database: per preguntes sobre xifres, estadístiques, incidents, tendències o registres concrets de la base de dades (crim, transport, aeroports, discriminació).
- search_documents: per preguntes sobre informes, normatives, polítiques, metodologies o context que es trobi en documents oficials.
- query_database_and_summarize: per preguntes analítiques complexes que requereixen dades i explicació (tendències, comparatives, rànquings).

Instruccions:
1. Si la pregunta és sobre dades concretes (nombres, anys, territoris), utilitza query_database.
2. Si la pregunta és sobre el contingut de documents o informes, utilitza search_documents.
3. Si la pregunta requereix tant dades com context documental, utilitza les dues eines.
4. No inventis xifres ni informació que no provingui de les eines.
5. Si no trobes la informació, indica-ho honestament.
6. Quan cridis search_documents, passa com a query la PREGUNTA REAL de l'usuari (per exemple "quines dades hi ha sobre delictes de odi?"), mai el nom del fitxer ni el títol del document. El sistema ja sap quins documents té indexats.
"""

_TOOLS = [query_database, search_documents, query_database_and_summarize]

_agent = None
_agent_lock = threading.Lock()


def _get_agent():
    global _agent
    if _agent is None:
        with _agent_lock:
            if _agent is None:
                llm = get_ollama_client("rag")
                _agent = create_react_agent(
                    model=llm,
                    tools=_TOOLS,
                    prompt=_AGENT_SYSTEM,
                )
    return _agent


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

async def get_ai_response(user_message: str) -> str:
    """Invoke the ReAct agent and return the final answer string."""
    logger.info("=== Agent invocation START | query: %r ===", user_message)
    agent = _get_agent()
    try:
        result = await agent.ainvoke(
            {"messages": [HumanMessage(content=user_message)]},
            config={"recursion_limit": 6},
        )
    except Exception as e:
        logger.error("Agent invocation failed: %s", e, exc_info=True)
        return "Ho sento, no he pogut processar la teva consulta. Torna-ho a intentar."

    messages = result.get("messages", [])
    logger.info("Agent produced %d messages total", len(messages))
    for i, msg in enumerate(messages):
        msg_type = type(msg).__name__
        content = getattr(msg, "content", "")
        tool_calls = getattr(msg, "tool_calls", None)
        if tool_calls:
            logger.info(
                "  [%d] %s → tool_calls: %s",
                i, msg_type,
                [{"name": tc.get("name"), "args": tc.get("args")} for tc in tool_calls],
            )
        else:
            preview = (content[:120] + "…") if len(content) > 120 else content
            logger.info("  [%d] %s → %r", i, msg_type, preview)

    for msg in reversed(messages):
        content = getattr(msg, "content", "")
        if content and not isinstance(msg, HumanMessage):
            logger.info("=== Agent invocation END | returning %d chars ===", len(content))
            return content.strip()

    logger.warning("Agent returned no usable content in any message")
    return "No he pogut generar una resposta."
