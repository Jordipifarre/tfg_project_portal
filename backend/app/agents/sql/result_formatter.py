import json
import logging
import time
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.sql.schema import _MAX_ROWS
from app.core.config import settings

logger = logging.getLogger(__name__)

_SUMMARIZE_SYSTEM = """Ets un assistent de dades de seguretat pública de Catalunya.
Se't dona una pregunta i el resultat d'una consulta a la base de dades.
Respon en català, de forma clara i directa, citant les xifres concretes.
Si hi ha diverses files, fes un resum concís. No mostris SQL ni detalls tècnics."""


def format_result(user_query: str, rows: list[dict], hint: str) -> str:
    model = settings.OLLAMA_SUMMARIZE_MODEL
    print(f"[FORMATTER] Called with {len(rows)} rows, hint={repr(hint)}")
    print(f"[FORMATTER] Summarize model: {model}")

    result_text = json.dumps(rows[:_MAX_ROWS], ensure_ascii=False, default=str)
    print(f"[FORMATTER] Payload size: {len(result_text)} chars")
    print(f"[FORMATTER] Payload preview:\n{result_text[:500]}\n")

    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=model,
        temperature=0,
    )
    content = f"Pregunta: {user_query}\n\nResultat:\n{result_text}"

    print(f"[FORMATTER] Invoking LLM ({model})...")
    t0 = time.time()
    try:
        print(f"[FORMATTER] Inside try/catch\n")
        answer = llm.invoke([
            SystemMessage(content=_SUMMARIZE_SYSTEM),
            HumanMessage(content=content),
        ]).content.strip()
        elapsed = time.time() - t0
        print(f"[FORMATTER] LLM responded in {elapsed:.2f}s")
        print(f"[FORMATTER] FINAL ANSWER:\n{answer}\n")
        return answer
    except Exception as e:
        elapsed = time.time() - t0
        logger.error("[FORMATTER] LLM failed after %.2fs: %s", elapsed, e)
        print(f"[FORMATTER] LLM FAILED after {elapsed:.2f}s: {e}")
        cols = list(rows[0].keys())
        lines = [" | ".join(cols), "-" * len(" | ".join(cols))]
        for row in rows[:10]:
            lines.append(" | ".join(str(row.get(c, "")) for c in cols))
        return (f"{hint}\n\n" if hint else "") + "\n".join(lines)
