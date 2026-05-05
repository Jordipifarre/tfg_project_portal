import json
import logging
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from app.agents.sql.schema import _MAX_ROWS

logger = logging.getLogger(__name__)

_SUMMARIZE_SYSTEM = """Ets un assistent de dades de seguretat pública de Catalunya.
Se't dona una pregunta i el resultat d'una consulta a la base de dades.
Respon en català, de forma clara i directa, citant les xifres concretes.
Si hi ha diverses files, fes un resum concís. No mostris SQL ni detalls tècnics."""


def format_result(user_query: str, rows: list[dict], hint: str, llm: ChatOllama) -> str:
    print(f"[SQL-CONV] FORMATTING {len(rows)} rows")

    # Single-value (COUNT / SUM): no LLM needed
    if len(rows) == 1 and len(rows[0]) == 1:
        val = list(rows[0].values())[0]
        try:
            val_num = float(val)
            val_str = str(int(val_num)) if val_num == int(val_num) else f"{val_num:,.2f}"
        except (TypeError, ValueError):
            val_str = str(val)
        result = f"{hint}: **{val_str}**" if hint else f"El resultat de la consulta és **{val_str}**."
        print(f"[SQL-CONV] FINAL ANSWER (programmatic):\n{result}\n")
        return result

    # Single row, multiple columns: no LLM needed
    if len(rows) == 1:
        parts = [f"**{k}**: {v}" for k, v in rows[0].items()]
        prefix = f"{hint}\n\n" if hint else ""
        result = prefix + "\n".join(parts)
        print(f"[SQL-CONV] FINAL ANSWER (programmatic):\n{result}\n")
        return result

    # Multiple rows: LLM summarise for readable narrative
    result_text = json.dumps(rows[:_MAX_ROWS], ensure_ascii=False, default=str)
    print(f"[SQL-CONV] SUMMARIZING {len(rows)} rows with LLM")
    print(f"[SQL-CONV] RAW RESULT SENT TO SUMMARIZER:\n{result_text[:500]}\n")
    content = f"Pregunta: {user_query}\n\nResultat:\n{result_text}"
    try:
        answer = llm.invoke([
            SystemMessage(content=_SUMMARIZE_SYSTEM),
            HumanMessage(content=content),
        ]).content.strip()
        print(f"[SQL-CONV] FINAL ANSWER (LLM summarise):\n{answer}\n")
        return answer
    except Exception as e:
        logger.error("Summarize LLM failed: %s", e)
        cols = list(rows[0].keys())
        lines = [" | ".join(cols), "-" * len(" | ".join(cols))]
        for row in rows[:10]:
            lines.append(" | ".join(str(row.get(c, "")) for c in cols))
        return (f"{hint}\n\n" if hint else "") + "\n".join(lines)
