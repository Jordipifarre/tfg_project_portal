import logging
from langchain_ollama import ChatOllama
from app.agents.sql.schema import db
from app.agents.sql.sql_generator import generate_sql
from app.agents.sql.sql_executor import execute_sql
from app.agents.sql.result_formatter import format_result
from app.core.config import settings

__all__ = ["query_database", "db"]

logger = logging.getLogger(__name__)


def query_database(user_query: str, model: str | None = None) -> str:
    effective_model = model or settings.OLLAMA_SQL_MODEL
    print(f"\n{'#' * 60}")
    print(f"[SQL-CONV] query_database() called")
    print(f"[SQL-CONV] Model: {effective_model}")
    print(f"[SQL-CONV] Query: {user_query}")
    print(f"{'#' * 60}\n")

    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=effective_model,
        temperature=0,
    )

    sql, hint = generate_sql(user_query, llm)

    if not sql:
        print("[SQL-CONV] FAILED: no SQL extracted from LLM output")
        return "No he pogut generar una consulta per a aquesta pregunta. Podries reformular-la amb més detall?"

    if sql.strip() == "SELECT 'no_data'":
        print("[SQL-CONV] LLM signaled no matching table")
        return "No tinc dades relacionades amb aquesta pregunta a la base de dades disponible."

    try:
        rows = execute_sql(sql)
    except Exception as e:
        print(f"[SQL-CONV] SQL EXECUTION ERROR: {e}")
        logger.error("SQL exec error: %s | SQL: %s", e, sql)
        return "No he pogut obtenir les dades per a aquesta pregunta. Podries reformular-la amb altres paraules?"

    if not rows:
        print("[SQL-CONV] 0 rows — returning empty result message")
        return (
            "No he trobat cap registre que coincideixi amb els filtres de la teva pregunta. "
            "Prova amb un any diferent, una altra localitat o sense algun filtre específic."
        )

    return format_result(user_query, rows, hint)
