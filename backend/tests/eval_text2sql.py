#!/usr/bin/env python3
"""
Avaluació del pipeline Text-to-SQL.
Executa preguntes NL contra el pipeline real (Ollama + BD reals) i genera
un informe quantitatiu en CSV i Markdown.

Execució (des de backend/ amb el venv actiu):
    poetry run python tests/eval_text2sql.py
    poetry run python tests/eval_text2sql.py --csv tests/fixtures/test_text2sql_20preguntes.csv
"""

import sys
import csv
import io
import re
import time
import json
import argparse
import logging
import contextlib
import threading
import statistics
from decimal import Decimal
from pathlib import Path
from typing import Optional

# Afegim backend/ al path perquè els imports de `app.*` funcionin
# independentment del directori de treball actual.
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.pipelines.sql.table_selector import _select_relevant_tables
from app.pipelines.sql.sql_generator import generate_sql
from app.pipelines.sql.sql_executor import execute_sql
from app.pipelines.sql.result_formatter import format_result
from app.utils.ollama_client import get_ollama_client

logging.basicConfig(level=logging.WARNING)

# ─── CSV output columns ───────────────────────────────────────────────────────

DETAIL_COLS = [
    "id", "pregunta_nl", "dataset_esperat", "taula_seleccionada",
    "taula_correcta", "sql_final", "num_correccions_columna",
    "num_correccions_filtre", "num_intents_execucio", "num_files_retornades",
    "valor_extret", "resultat_esperat", "estat_comparacio", "categoria_error",
    "resposta_final_nl", "temps_total_s", "error_excepcio",
]

# ─── Value extraction & comparison ───────────────────────────────────────────


def _is_numeric(val) -> bool:
    return isinstance(val, (int, float, Decimal)) and not isinstance(val, bool)


def _to_float(val) -> float:
    return float(val)


def _extract_first_numeric(row: dict) -> Optional[float]:
    """Primer valor de tipus numèric en la fila; fallback a parsing de string."""
    for val in row.values():
        if val is not None and _is_numeric(val):
            return _to_float(val)
    for val in row.values():
        try:
            return float(str(val))
        except (ValueError, TypeError):
            continue
    return None


def _parse_expected_multirow(s: str) -> dict[str, float]:
    """'2019=46010; 2020=40424' → {'2019': 46010.0, '2020': 40424.0}"""
    result = {}
    for part in s.split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            result[k.strip()] = float(v.strip())
    return result


def _build_rows_dict(rows: list[dict]) -> dict[str, float]:
    """
    Construeix {clau: valor} a partir de les files retornades.

    Cas 1 — una sola fila i totes les columnes són numèriques (p.ex. Q05):
        els NOMS de columna fan de clau i els valors fan de valor.

    Cas 2 — cas general multi-fila (GROUP BY):
        la PRIMERA columna de cada fila fa de clau (convertida a str,
        funciona tant si és text com si és bigint/any), i la primera
        columna numèrica de les restants fa de valor.
    """
    if not rows:
        return {}

    # Cas 1: fila única amb tots els valors numèrics → noms de columna com a claus
    if len(rows) == 1:
        row0 = rows[0]
        if all(_is_numeric(v) for v in row0.values() if v is not None):
            return {k: _to_float(v) for k, v in row0.items() if v is not None}

    # Cas 2: primera columna = clau (str), primera numèrica de la resta = valor
    result: dict[str, float] = {}
    for row in rows:
        vals = list(row.items())
        if not vals:
            continue
        key_col = str(vals[0][1]) if vals[0][1] is not None else None
        if key_col is None:
            continue
        num_val = next(
            (_to_float(v) for _, v in vals[1:] if v is not None and _is_numeric(v)),
            None,
        )
        if num_val is not None:
            result[key_col] = num_val
    return result


def _compare_scalar(rows: list[dict], expected: float) -> tuple[str, str]:
    """Retorna (estat, valor_extret_str)."""
    if not rows:
        return "RESULTAT_BUIT", ""
    extracted = _extract_first_numeric(rows[0])
    if extracted is None:
        return "NO_MATCH", ""
    val_str = str(int(extracted)) if extracted == int(extracted) else str(extracted)
    return ("MATCH_EXACTE" if extracted == expected else "NO_MATCH"), val_str


def _compare_multirow(
    rows: list[dict], expected: dict[str, float]
) -> tuple[str, str, str]:
    """Retorna (estat, diff_notes, valor_extret_json)."""
    if not rows:
        return "RESULTAT_BUIT", "", "{}"

    rows_dict = _build_rows_dict(rows)
    exp_keys = set(expected.keys())
    got_keys = set(rows_dict.keys())

    missing = sorted(exp_keys - got_keys)
    extra = sorted(got_keys - exp_keys)
    wrong = {
        k: {"got": rows_dict[k], "expected": expected[k]}
        for k in exp_keys & got_keys
        if rows_dict[k] != expected[k]
    }

    if not missing and not extra and not wrong:
        estat = "MATCH_EXACTE"
    elif exp_keys & got_keys:
        estat = "MATCH_PARCIAL"
    else:
        estat = "NO_MATCH"

    # Fallback per a files úniques amb aliases diferent: si tots els valors coincideixen
    # (independentment del nom de la columna), es considera MATCH_EXACTE.
    if estat == "NO_MATCH" and not wrong and len(rows) == 1:
        if sorted(rows_dict.values()) == sorted(expected.values()):
            estat = "MATCH_EXACTE"
            missing, extra, diff_parts = [], [], []

    diff_parts = []
    if missing:
        diff_parts.append(f"missing={missing}")
    if extra:
        diff_parts.append(f"extra={extra}")
    if wrong:
        diff_parts.append(f"wrong={wrong}")

    return estat, "; ".join(diff_parts), json.dumps(rows_dict, ensure_ascii=False, default=str)


# ─── Stdout marker parsing ────────────────────────────────────────────────────


def _parse_stdout_markers(text: str) -> dict:
    lines = text.splitlines()
    col_corrections = sum(1 for ln in lines if "[SQL-CONV] COLUMN CORRECTION:" in ln)
    filter_corrections = sum(
        1 for ln in lines
        if "[SQL-CONV] VALUE FIX:" in ln or "[SQL-CONV] VALUE→ILIKE:" in ln
    )
    retries = len(re.findall(r"\[SQL-CONV\] RETRY \d+:", text))
    return {
        "num_correccions_columna": col_corrections,
        "num_correccions_filtre": filter_corrections,
        "num_intents_execucio": retries,
    }


# ─── Error classification ─────────────────────────────────────────────────────


def _classify_error(
    estat: str,
    taula_correcta: bool,
    sql: Optional[str],
    execution_error: Optional[str],
    col_corrections: int,
    filter_corrections: int,
) -> str:
    if estat == "MATCH_EXACTE":
        return ""

    cats = []
    if not taula_correcta:
        cats.append("E1_seleccio_taula")
    elif sql is None:
        cats.append("E2_sql_no_generat")
    elif execution_error:
        cats.append("E3_error_execucio")
    elif estat == "RESULTAT_BUIT":
        cats.append("E4_resultat_buit")
    elif estat in ("NO_MATCH", "MATCH_PARCIAL"):
        cats.append("E5_valor_incorrecte")

    if col_corrections > 0 or filter_corrections > 0:
        cats.append("E6_correccio_necessaria")

    return "; ".join(cats)


# ─── Core processing ──────────────────────────────────────────────────────────


def _empty_result(q: dict, error_msg: str = "") -> dict:
    return {
        "id": q["id"],
        "pregunta_nl": q["pregunta_nl"],
        "dataset_esperat": q["dataset"],
        "taula_seleccionada": "",
        "taula_correcta": False,
        "sql_final": "",
        "num_correccions_columna": 0,
        "num_correccions_filtre": 0,
        "num_intents_execucio": 0,
        "num_files_retornades": 0,
        "valor_extret": "",
        "resultat_esperat": q["resultat_esperat"],
        "estat_comparacio": "ERROR_EXECUCIO",
        "categoria_error": "E3_error_execucio",
        "resposta_final_nl": "",
        "temps_total_s": 0.0,
        "error_excepcio": error_msg,
    }


def process_question(q: dict, llm) -> dict:
    t0 = time.perf_counter()
    res = _empty_result(q)
    sql: Optional[str] = None
    hint: str = ""
    rows: list[dict] = []
    execution_error: Optional[str] = None

    # Step a: selecció de taula (fora del redirect — la sortida va a consola)
    tables = _select_relevant_tables(q["pregunta_nl"])
    res["taula_seleccionada"] = ", ".join(tables)
    taula_correcta = q["dataset"] in tables
    res["taula_correcta"] = taula_correcta

    # Steps b-d: generació SQL + execució + formatejat (stdout capturat)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        # Step b
        sql, hint = generate_sql(q["pregunta_nl"], llm)
        res["sql_final"] = sql or ""

        # Step c
        if sql:
            try:
                rows = execute_sql(sql)
            except Exception as exc:
                execution_error = str(exc)
                res["error_excepcio"] = str(exc)

        # Step d — només si hi ha files
        if rows:
            try:
                res["resposta_final_nl"] = format_result(q["pregunta_nl"], rows, hint)
            except Exception:
                pass

    markers = _parse_stdout_markers(buf.getvalue())
    res.update(markers)
    res["num_files_retornades"] = len(rows)

    # Determinar estat i valor extret
    if not taula_correcta:
        estat = "TAULA_INCORRECTA"
        res["valor_extret"] = ""
    elif sql is None:
        estat = "SQL_NO_GENERAT"
        res["valor_extret"] = ""
    elif execution_error:
        estat = "ERROR_EXECUCIO"
        res["valor_extret"] = ""
    else:
        expected_str = q["resultat_esperat"].strip()
        if ";" in expected_str:
            expected_dict = _parse_expected_multirow(expected_str)
            estat, diff_notes, rows_json = _compare_multirow(rows, expected_dict)
            res["valor_extret"] = rows_json
            if diff_notes and estat != "MATCH_EXACTE":
                res["error_excepcio"] = diff_notes
        else:
            expected_float = float(expected_str)
            estat, val_str = _compare_scalar(rows, expected_float)
            res["valor_extret"] = val_str

    res["estat_comparacio"] = estat
    res["categoria_error"] = _classify_error(
        estat, taula_correcta, sql, execution_error,
        markers["num_correccions_columna"], markers["num_correccions_filtre"],
    )
    res["temps_total_s"] = round(time.perf_counter() - t0, 2)
    return res


def _process_with_timeout(q: dict, llm, timeout: int = 60) -> dict:
    result_holder: list = [None]
    exc_holder: list = [None]

    def worker():
        try:
            result_holder[0] = process_question(q, llm)
        except Exception as exc:
            exc_holder[0] = exc

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        r = _empty_result(q, f"TIMEOUT (>{timeout}s)")
        r["temps_total_s"] = float(timeout)
        return r

    if exc_holder[0] is not None:
        return _empty_result(q, str(exc_holder[0]))

    return result_holder[0]


# ─── Summary report ───────────────────────────────────────────────────────────


def _pct(num: int, den: int) -> str:
    return f"{100 * num / den:.1f}%" if den else "—"


def generate_report(results: list[dict], questions: list[dict]) -> str:
    n = len(results)
    lines: list[str] = []

    # 1. Precisió selecció de taula
    taula_ok = sum(1 for r in results if r["taula_correcta"])
    datasets: dict[str, dict] = {}
    for r, q in zip(results, questions):
        ds = q["dataset"]
        datasets.setdefault(ds, {"ok": 0, "total": 0})
        datasets[ds]["total"] += 1
        if r["taula_correcta"]:
            datasets[ds]["ok"] += 1

    lines += [
        "# Informe d'avaluació Text-to-SQL\n",
        "## 1. Precisió selecció de taula\n",
        f"**Global: {_pct(taula_ok, n)} ({taula_ok}/{n})**\n",
        "| Dataset | OK | Total | % |",
        "|---------|-----|-------|---|",
    ]
    for ds, info in sorted(datasets.items()):
        lines.append(f"| {ds} | {info['ok']} | {info['total']} | {_pct(info['ok'], info['total'])} |")
    lines.append("")

    # 2. MATCH_EXACTE per tipus_consulta
    match_exacte = sum(1 for r in results if r["estat_comparacio"] == "MATCH_EXACTE")
    tipus_map: dict[str, dict] = {}
    for r, q in zip(results, questions):
        tc = q.get("tipus_consulta", "?")
        tipus_map.setdefault(tc, {"match": 0, "total": 0})
        tipus_map[tc]["total"] += 1
        if r["estat_comparacio"] == "MATCH_EXACTE":
            tipus_map[tc]["match"] += 1

    lines += [
        "## 2. Precisió resultats (MATCH\\_EXACTE)\n",
        f"**Global: {_pct(match_exacte, n)} ({match_exacte}/{n})**\n",
        "| Tipus consulta | MATCH | Total | % |",
        "|----------------|-------|-------|---|",
    ]
    for tc, info in sorted(tipus_map.items()):
        lines.append(f"| {tc} | {info['match']} | {info['total']} | {_pct(info['match'], info['total'])} |")
    lines.append("")

    # 3. Distribució d'estats
    estat_counts: dict[str, int] = {}
    for r in results:
        estat_counts[r["estat_comparacio"]] = estat_counts.get(r["estat_comparacio"], 0) + 1

    lines += [
        "## 3. Distribució d'estats\n",
        "| Estat | N | % |",
        "|-------|---|---|",
    ]
    for estat, cnt in sorted(estat_counts.items(), key=lambda x: -x[1]):
        lines.append(f"| {estat} | {cnt} | {_pct(cnt, n)} |")
    lines.append("")

    # 4. Categories d'error
    cat_counts: dict[str, int] = {}
    for r in results:
        for cat in r["categoria_error"].split("; "):
            cat = cat.strip()
            if cat:
                cat_counts[cat] = cat_counts.get(cat, 0) + 1

    lines += [
        "## 4. Categories d'error\n",
        "| Categoria | N | % preguntes |",
        "|-----------|---|-------------|",
    ]
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        lines.append(f"| {cat} | {cnt} | {_pct(cnt, n)} |")
    lines.append("")

    # 5. Correccions SQL
    need_corr = sum(
        1 for r in results
        if r["num_correccions_columna"] > 0 or r["num_correccions_filtre"] > 0
    )
    lines += [
        "## 5. Correccions SQL\n",
        f"**{need_corr}/{n} preguntes ({_pct(need_corr, n)}) han necessitat correccions de columna o filtre.**\n",
    ]

    # 6. Temps
    times = [r["temps_total_s"] for r in results]
    avg_t = statistics.mean(times) if times else 0.0
    p95_idx = min(int(0.95 * len(times)), len(times) - 1)
    p95_t = sorted(times)[p95_idx] if times else 0.0

    lines += [
        "## 6. Temps de resposta\n",
        f"- Temps mitjà: **{avg_t:.1f}s**",
        f"- P95: **{p95_t:.1f}s**\n",
    ]

    # 7. Preguntes problemàtiques
    problematic = [
        r for r in results
        if r["estat_comparacio"] in ("NO_MATCH", "ERROR_EXECUCIO", "MATCH_PARCIAL")
    ]
    lines += ["## 7. Preguntes problemàtiques (NO\\_MATCH / MATCH\\_PARCIAL / ERROR)\n"]
    if not problematic:
        lines.append("Cap pregunta problemàtica.\n")
    else:
        lines += [
            "| ID | Estat | Categoria | SQL / Error |",
            "|----|-------|-----------|-------------|",
        ]
        for r in problematic:
            detail = (r["sql_final"] or r["error_excepcio"] or "").replace("\n", " ")[:120]
            lines.append(
                f"| {r['id']} | {r['estat_comparacio']} | {r['categoria_error']} | `{detail}` |"
            )

    return "\n".join(lines) + "\n"


# ─── Entry point ─────────────────────────────────────────────────────────────


def main() -> None:
    parser = argparse.ArgumentParser(description="Avaluació del pipeline Text-to-SQL")
    parser.add_argument(
        "--csv",
        default="tests/fixtures/test_text2sql_20preguntes.csv",
        help="Path al CSV de test (relatiu a backend/)",
    )
    parser.add_argument(
        "--output-dir",
        default="tests/results/",
        help="Directori de sortida (relatiu a backend/)",
    )
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        csv_path = BACKEND_DIR / csv_path

    output_dir = Path(args.output_dir)
    if not output_dir.is_absolute():
        output_dir = BACKEND_DIR / output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    if not csv_path.exists():
        sys.exit(f"ERROR: No s'ha trobat el CSV de test: {csv_path}")

    with open(csv_path, encoding="utf-8") as f:
        questions = list(csv.DictReader(f))

    total = len(questions)
    print(f"Carregades {total} preguntes de {csv_path}\n")

    llm = get_ollama_client("sql")
    results: list[dict] = []

    for i, q in enumerate(questions, 1):
        preview = q["pregunta_nl"][:55] + ("…" if len(q["pregunta_nl"]) > 55 else "")
        print(f"[{i:02d}/{total}] {q['id']}  {preview}", end="", flush=True)

        r = _process_with_timeout(q, llm, timeout=60)
        results.append(r)

        estat = r["estat_comparacio"]
        marker = "✓" if estat == "MATCH_EXACTE" else "✗"
        print(f"  →  {marker} {estat}  ({r['temps_total_s']:.1f}s)")

        if r["error_excepcio"] and "TIMEOUT" not in r["error_excepcio"]:
            print(f"        ↳ {r['error_excepcio'][:100]}")

    # CSV de detall
    detail_path = output_dir / "eval_text2sql_detall.csv"
    with open(detail_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DETAIL_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(f"\nDetall CSV guardat: {detail_path}")

    # Resum Markdown
    report = generate_report(results, questions)
    resum_path = output_dir / "eval_text2sql_resum.md"
    resum_path.write_text(report, encoding="utf-8")

    sep = "─" * 60
    print(f"\n{sep}\n{report}\n{sep}")
    print(f"Resum Markdown guardat: {resum_path}")


if __name__ == "__main__":
    main()
