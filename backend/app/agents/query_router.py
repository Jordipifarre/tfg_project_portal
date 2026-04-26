import logging
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.sql_converter import query_database
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLMs — one per role; instantiated once at module load
# ---------------------------------------------------------------------------

_router_llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_ROUTER_MODEL,
    temperature=0,
)

_general_llm = ChatOllama(
    base_url=settings.OLLAMA_BASE_URL,
    model=settings.OLLAMA_RAG_MODEL,
    temperature=0.3,
)

# ---------------------------------------------------------------------------
# Classification
# ---------------------------------------------------------------------------

_CLASSIFY_SYSTEM = """Ets un classificador de consultes. Respon ÚNICAMENT amb una d'aquestes paraules exactes: sql, rag, general

sql → preguntes sobre dades, estadístiques, nombres, recomptes, crims, incidents, anys, tendències, comparatives
rag → preguntes sobre lleis, normatives, articles jurídics, procediments legals, documents oficials
general → salutacions, presentacions, preguntes sobre la plataforma, preguntes que no requereixen dades

Cap altra paraula. Cap explicació. Una sola paraula."""

_SQL_KEYWORDS = {
    "quant", "quants", "quantes", "total", "nombre", "estadística", "any", "anys",
    "incident", "incidents", "crim", "crims", "detenc", "arrest", "resolts",
    "aeroport", "transport", "metro", "autobús", "bus", "tren", "taxi",
    "odi", "discrimin", "penal", "mossos", "seguretat", "dades", "registre",
    "suma", "percentatge", "evolució", "tendència", "comparar",
}


def _classify(question: str) -> str:
    """Return 'sql', 'rag', or 'general'. Keyword fallback if LLM gives unexpected output."""
    q_lower = question.lower()

    # Fast keyword shortcut — avoids an LLM call for obvious SQL questions
    if any(kw in q_lower for kw in _SQL_KEYWORDS):
        return "sql"

    try:
        msgs = [SystemMessage(content=_CLASSIFY_SYSTEM), HumanMessage(content=question)]
        raw = _router_llm.invoke(msgs).content.strip().lower()
        if raw in {"sql", "rag", "general"}:
            return raw
        # If LLM returns extra text, look for a keyword inside it
        for label in ("sql", "rag", "general"):
            if label in raw:
                return label
    except Exception as e:
        logger.warning("Classifier LLM failed: %s", e)

    return "general"


# ---------------------------------------------------------------------------
# General answer
# ---------------------------------------------------------------------------

_GENERAL_SYSTEM = """Ets l'assistent de Safecast AI, una plataforma de transparència de seguretat pública de Catalunya.
Respon en català, de forma breu i amable.
Si et pregunten sobre dades concretes (nombres, estadístiques, incidents), indica que pots consultar la base de dades si reformulen la pregunta amb més detall.
No inventis xifres."""


def _answer_general(question: str) -> str:
    try:
        msgs = [SystemMessage(content=_GENERAL_SYSTEM), HumanMessage(content=question)]
        return _general_llm.invoke(msgs).content.strip()
    except Exception as e:
        logger.error("General LLM failed: %s", e)
        return "Ho sento, no he pogut generar una resposta. Torna-ho a intentar."


# ---------------------------------------------------------------------------
# RAG stub
# ---------------------------------------------------------------------------

def _answer_rag(question: str) -> str:
    return (
        "La consulta de documents jurídics i normatives és una funció en desenvolupament. "
        "De moment pots preguntar-me sobre les estadístiques de seguretat a la base de dades."
    )


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def get_ai_response(user_message: str) -> str:
    if settings.ENABLE_DYNAMIC_ROUTING:
        query_type = _classify(user_message)
    else:
        query_type = "sql"

    logger.info("Query classified as '%s': %s", query_type, user_message[:80])

    if query_type == "sql":
        return query_database(user_message, model=settings.OLLAMA_SQL_MODEL)
    elif query_type == "rag":
        return _answer_rag(user_message)
    else:
        return _answer_general(user_message)
