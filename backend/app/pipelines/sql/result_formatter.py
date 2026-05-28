import json
import logging
import time
from langchain_core.messages import SystemMessage, HumanMessage
from app.pipelines.sql.schema import _MAX_ROWS
from app.utils.ollama_client import get_ollama_client

logger = logging.getLogger(__name__)

_SUMMARIZE_SYSTEM = """Ets un assistent de dades de seguretat pública de Catalunya.
Se't dona una pregunta i el resultat d'una consulta a la base de dades.
Respon en català, de forma clara i directa, citant les xifres concretes.
Si hi ha diverses files, fes un resum concís. No mostris SQL ni detalls tècnics."""


def format_result(user_query: str, rows: list[dict], hint: str) -> str:
    print(f"[FORMATTER] Called with {len(rows)} rows, hint={repr(hint)}")

    result_text = json.dumps(rows[:_MAX_ROWS], ensure_ascii=False, default=str)
    print(f"[FORMATTER] Payload size: {len(result_text)} chars")

    llm = get_ollama_client("summarize")
    content = f"Pregunta: {user_query}\n\nResultat:\n{result_text}"

    t0 = time.time()
    try:
        answer = llm.invoke([
            SystemMessage(content=_SUMMARIZE_SYSTEM),
            HumanMessage(content=content),
        ]).content.strip()
        print(f"[FORMATTER] LLM responded in {time.time() - t0:.2f}s")
        print(f"[FORMATTER] FINAL ANSWER:\n{answer}\n")
        return answer
    except Exception as e:
        logger.error("[FORMATTER] LLM failed after %.2fs: %s", time.time() - t0, e)
        cols = list(rows[0].keys())
        lines = [" | ".join(cols), "-" * len(" | ".join(cols))]
        for row in rows[:10]:
            lines.append(" | ".join(str(row.get(c, "")) for c in cols))
        return (f"{hint}\n\n" if hint else "") + "\n".join(lines)
