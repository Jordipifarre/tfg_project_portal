import logging
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.sql_converter import query_database
from app.agents.rag_agent import answer_from_documents
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# LLMs
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

_CLASSIFY_SYSTEM = """Ets un classificador de consultes. Respon ÚNICAMENT amb una d'aquestes paraules: sql, rag, general

sql → preguntes que busquen xifres, estadístiques o registres de la base de dades:
  recomptes, totals, tendències, comparatives, incidents concrets, anys, territoris.
  Exemples: "quants crims hi ha?", "evolució del transport el 2022", "top delictes per comarca"

rag → preguntes sobre el contingut d'informes o documents:
  definicions, metodologia, procediments, normatives, marc legal, context teòric.
  Exemples: "com es defineix un crim d'odi?", "quins protocols hi ha?", "que diu l'informe sobre...?"

general → salutacions, presentació, preguntes sobre la plataforma, o qualsevol consulta que no encaixi en sql ni rag.

Una sola paraula. Sense explicació."""

# Fast keyword shortcuts — avoid an LLM call for unambiguous cases
_SQL_KEYWORDS = {
    "quant", "quants", "quantes", "total", "nombre", "estadística",
    "any", "anys", "incident", "incidents", "crim", "crims",
    "detenc", "arrest", "resolts", "aeroport", "transport", "metro",
    "autobús", "bus", "tren", "taxi", "odi", "discrimin", "penal",
    "mossos", "seguretat", "dades", "registre", "suma", "percentatge",
    "evolució", "tendència", "comparar",
}

_RAG_KEYWORDS = {
    "informe", "article", "document", "defineix", "definició",
    "protocol", "normativa", "llei", "reglament", "decret", "manual",
    "guia", "metodologia", "procediment", "estableix", "preveu",
    "disposa", "regulació", "marc teòric", "que és", "com funciona",
    "explica", "descriu",
}


def _classify(question: str) -> str:
    """Return 'sql', 'rag', or 'general'. Keyword shortcuts first, LLM as fallback."""
    q_lower = question.lower()

    if any(kw in q_lower for kw in _SQL_KEYWORDS):
        return "sql"
    if any(kw in q_lower for kw in _RAG_KEYWORDS):
        return "rag"

    try:
        msgs = [SystemMessage(content=_CLASSIFY_SYSTEM), HumanMessage(content=question)]
        raw = _router_llm.invoke(msgs).content.strip().lower()
        if raw in {"sql", "rag", "general"}:
            return raw
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
Si et pregunten sobre dades concretes (nombres, estadístiques), indica que pots consultar la base de dades.
Si et pregunten sobre el contingut de documents o informes, indica que pots cercar als documents disponibles.
No inventis xifres ni informació."""


def _answer_general(question: str) -> str:
    try:
        msgs = [SystemMessage(content=_GENERAL_SYSTEM), HumanMessage(content=question)]
        return _general_llm.invoke(msgs).content.strip()
    except Exception as e:
        logger.error("General LLM failed: %s", e)
        return "Ho sento, no he pogut generar una resposta. Torna-ho a intentar."


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
        return answer_from_documents(user_message)
    else:
        return _answer_general(user_message)
