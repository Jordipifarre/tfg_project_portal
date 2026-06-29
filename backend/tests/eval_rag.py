#!/usr/bin/env python3
"""
Avaluació del pipeline RAG (Retrieval-Augmented Generation).
Executa preguntes NL contra el pipeline real (pgvector + Ollama) i genera
un informe quantitatiu en CSV i Markdown.

# MODE D'EXECUCIÓ: LOCAL (OLLAMA_MODE)
# Tots els models s'executen localment via Ollama (get_ollama_client("rag")).
# Per reproduir, cal tenir Ollama en marxa amb el model configurat a "rag".
# Les cerques vectorials es fan contra pgvector (Supabase PostgreSQL).

Execució (des de backend/ amb el venv actiu):
    poetry run python tests/eval_rag.py
    poetry run python tests/eval_rag.py --csv tests/fixtures/gold_standard_rag_20preguntes.csv
"""

import sys
import csv
import re
import time
import unicodedata
import argparse
import logging
import statistics
import threading
from pathlib import Path
from typing import Optional

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.pipelines.rag_pipeline import _hybrid_search, _count_chunks
from app.utils.ollama_client import get_ollama_client
from langchain_core.messages import HumanMessage, SystemMessage

logging.basicConfig(level=logging.WARNING)

# ─── Constants ────────────────────────────────────────────────────────────────

TIMEOUT_S = 60
CONTROL_NEGATIU_ID = "R20"

# Expressions que indiquen que el sistema declina respondre (per al control negatiu R20).
# Normalitzades per _normalize() en el moment de la comparació.
NO_RESPONSE_EXPRS = [
    "no he trobat",
    "no disposo",
    "no es troba",
    "no tinc",
    "no he pogut trobar",
    "no hi ha informació",
    "no hi ha informacio",
    "no hi ha cap",
    "no hi ha dades",
    "no esta disponible",
    "no está disponible",
    "no puc respondre",
    "aquesta informació no",
    "aquesta informacio no",
    "no es troba als documents",
]

# Replica del prompt de sistema del pipeline real (app/pipelines/rag_pipeline.py)
_RAG_SYSTEM = (
    "Ets un assistent especialitzat en documentació oficial catalana sobre seguretat pública.\n"
    "Respon ÚNICAMENT basant-te en els fragments de context proporcionats.\n"
    "Si la resposta no es troba al context, respon: "
    "\"No he trobat aquesta informació als documents disponibles.\"\n"
    "Respon sempre en català. Cita el nom del document i la pàgina quan sigui possible."
)

# ─── CSV output columns ───────────────────────────────────────────────────────

DETAIL_COLS = [
    "id", "document_font", "pagina_esperada", "tipus_consulta", "pregunta",
    "resposta_esperada_resum", "paraules_clau_obligatories",
    "resposta_generada", "fonts_citades",
    "recuperacio_correcta", "cobertura_paraules_clau",
    "num_fragments_recuperats", "estat_final", "categoria_error",
    "temps_resposta_s", "error_excepcio",
]

# ─── Text normalisation ───────────────────────────────────────────────────────

def _normalize(text: str) -> str:
    """NFKD sense accents, lowercase — idèntic a la normalització de CataloniaMap.tsx."""
    nfkd = unicodedata.normalize("NFKD", text)
    return nfkd.encode("ascii", "ignore").decode("ascii").lower()


def _keyword_coverage(keywords_str: str, response: str) -> float:
    """Fracció de termes de keywords_str que apareixen a response (case-insensitive, sense accents)."""
    terms = [t.strip() for t in keywords_str.split(";") if t.strip()]
    if not terms:
        return 1.0
    resp_norm = _normalize(response)
    hits = sum(1 for t in terms if _normalize(t) in resp_norm)
    return round(hits / len(terms), 3)


def _detect_no_response(response: str) -> bool:
    """True si la resposta conté una expressió de 'no sé / no disposo d'informació'."""
    resp_norm = _normalize(response)
    return any(_normalize(expr) in resp_norm for expr in NO_RESPONSE_EXPRS)


# ─── Source extraction ────────────────────────────────────────────────────────

def _extract_cited_sources(response: str) -> list[tuple[str, str]]:
    """Extreu parells (document, pàgina) citats al text amb patró [doc, p.N]."""
    return re.findall(r"\[([^\],]+),\s*p\.?(\d+)\]", response)


def _check_source_retrieved(
    doc_font: str,
    hits: list,
    cited_in_text: list[tuple[str, str]],
) -> Optional[bool]:
    """
    Retorna True si el document esperat apareix entre els fragments recuperats o
    citats al text, False si no, i None (NA) per al control negatiu (doc_font='cap').

    Per a 'multi', accepta si ALMENYS UN dels dos documents rellevants és present.
    """
    if doc_font.lower() == "cap":
        return None

    # Noms de fonts recuperades pel vector store
    retrieved_norms: set[str] = set()
    for doc in hits:
        src = doc.metadata.get("source", "")
        if src:
            retrieved_norms.add(_normalize(src).replace(".pdf", ""))
    # Afegir noms de fonts citats explícitament al text
    for name, _ in cited_in_text:
        retrieved_norms.add(_normalize(name.strip()).replace(".pdf", ""))

    if doc_font.lower() == "multi":
        # Prefixes normalitzats dels noms reals de fitxer al bucket (sense .pdf, sense accents).
        targets = ["informe_generat_seguritat_catalunya", "resum_codi_seguretat"]
        return any(
            any(t in rn for t in targets)
            for rn in retrieved_norms
        )

    target = _normalize(doc_font).replace(".pdf", "")
    return any(target in rn or rn in target for rn in retrieved_norms)


# ─── Error taxonomy ───────────────────────────────────────────────────────────

def _classify_error(
    estat: str,
    recuperacio_correcta,
    cobertura: float,
) -> str:
    """
    Taxonomia R1–R6 (paral·lela a E1–E8 del Text-to-SQL però adaptada a RAG).
      R1_recuperacio_incorrecta  — document esperat no recuperat
      R2_resposta_buida_o_generica — cobertura=0, sense contingut rellevant
      R3_citacio_font_absent     — resposta correcta però sense citació de font
      R4_cobertura_insuficient   — MATCH_PARCIAL o NO_MATCH
      R5_allucinacio             — control negatiu: sistema inventa una xifra
      R6_timeout_o_excepcio      — TIMEOUT o ERROR_EXECUCIO
    """
    if estat == "MATCH_COMPLET":
        return ""
    if estat in ("TIMEOUT", "ERROR_EXECUCIO"):
        return "R6_timeout_o_excepcio"
    if estat == "AL·LUCINACIO_DETECTADA":
        return "R5_allucinacio"

    cats = []
    if recuperacio_correcta is False:
        cats.append("R1_recuperacio_incorrecta")
    if cobertura == 0.0:
        cats.append("R2_resposta_buida_o_generica")
    elif cobertura < 0.8:
        cats.append("R4_cobertura_insuficient")
    return "; ".join(cats) if cats else "R3_citacio_font_absent"


# ─── Core processing ──────────────────────────────────────────────────────────

def _empty_result(q: dict, error_msg: str = "") -> dict:
    return {
        "id": q["id"],
        "document_font": q["document_font"],
        "pagina_esperada": q["pagina_esperada"],
        "tipus_consulta": q["tipus_consulta"],
        "pregunta": q["pregunta"],
        "resposta_esperada_resum": q["resposta_esperada_resum"],
        "paraules_clau_obligatories": q["paraules_clau_obligatories"],
        "resposta_generada": "",
        "fonts_citades": "",
        "recuperacio_correcta": "NA",
        "cobertura_paraules_clau": 0.0,
        "num_fragments_recuperats": None,
        "estat_final": "ERROR_EXECUCIO",
        "categoria_error": "R6_timeout_o_excepcio",
        "temps_resposta_s": 0.0,
        "error_excepcio": error_msg,
    }


def process_question(q: dict) -> dict:
    t0 = time.perf_counter()
    res = _empty_result(q)
    is_control_negatiu = q["id"] == CONTROL_NEGATIU_ID

    try:
        # Step 1 — hybrid retrieval (semàntic + keyword via pgvector)
        hits = _hybrid_search(q["pregunta"])
        res["num_fragments_recuperats"] = len(hits)

        # Step 2 — fonts recuperades (per CSV de detall)
        all_sources = [
            f"{doc.metadata.get('source', '?')}:p{doc.metadata.get('page', '?')}"
            for doc in hits
        ]
        res["fonts_citades"] = "; ".join(all_sources[:8])

        # Step 3 — generació de resposta (replica _RAG_SYSTEM del pipeline real)
        if not hits:
            response_text = (
                "No he trobat informació rellevant als documents disponibles per a aquesta pregunta."
            )
        else:
            context = "\n\n---\n\n".join(
                f"[{d.metadata.get('source', '?')}, p.{d.metadata.get('page', '?')}]\n{d.page_content}"
                for d in hits
            )
            llm = get_ollama_client("rag")
            msgs = [
                SystemMessage(content=_RAG_SYSTEM),
                HumanMessage(content=f"Context:\n{context}\n\nPregunta: {q['pregunta']}"),
            ]
            response_text = llm.invoke(msgs).content.strip()

        res["resposta_generada"] = response_text

        # Step 4 — extreure fonts citades al text (per millorar la detecció de recuperació)
        cited_in_text = _extract_cited_sources(response_text)

        # Step 5 — recuperació correcta (objectiu: el document esperat ha estat trobat)
        recup = _check_source_retrieved(q["document_font"], hits, cited_in_text)
        res["recuperacio_correcta"] = "NA" if recup is None else recup

        # Step 6 — cobertura de paraules clau (mètrica objectiva sense LLM-jutge)
        if is_control_negatiu:
            # R20: cobertura=1.0 si el sistema declina correctament, 0.0 si al·lucina
            cobertura = 1.0 if _detect_no_response(response_text) else 0.0
        else:
            cobertura = _keyword_coverage(q["paraules_clau_obligatories"], response_text)
        res["cobertura_paraules_clau"] = cobertura

        # Step 7 — estat final
        if is_control_negatiu:
            estat = "MATCH_COMPLET" if cobertura == 1.0 else "AL·LUCINACIO_DETECTADA"
        elif cobertura >= 0.8 and recup is not False:
            estat = "MATCH_COMPLET"
        elif cobertura > 0.0:
            estat = "MATCH_PARCIAL"
        else:
            estat = "NO_MATCH"

        res["estat_final"] = estat
        res["categoria_error"] = _classify_error(estat, recup, cobertura)
        res["error_excepcio"] = ""

    except Exception as exc:
        res["error_excepcio"] = str(exc)[:300]
        res["estat_final"] = "ERROR_EXECUCIO"
        res["categoria_error"] = "R6_timeout_o_excepcio"

    res["temps_resposta_s"] = round(time.perf_counter() - t0, 2)
    return res


def _process_with_timeout(q: dict, timeout: int = TIMEOUT_S) -> dict:
    result_holder: list = [None]
    exc_holder: list = [None]

    def worker():
        try:
            result_holder[0] = process_question(q)
        except Exception as exc:
            exc_holder[0] = exc

    t = threading.Thread(target=worker, daemon=True)
    t.start()
    t.join(timeout)

    if t.is_alive():
        r = _empty_result(q, f"TIMEOUT (>{timeout}s)")
        r["estat_final"] = "TIMEOUT"
        r["categoria_error"] = "R6_timeout_o_excepcio"
        r["temps_resposta_s"] = float(timeout)
        return r

    if exc_holder[0] is not None:
        return _empty_result(q, str(exc_holder[0]))

    return result_holder[0]


# ─── Summary report ───────────────────────────────────────────────────────────

def _pct(num, den: int) -> str:
    return f"{100 * num / den:.1f}%" if den else "—"


def generate_report(results: list[dict], questions: list[dict]) -> str:
    # Parells result+question, separant el control negatiu
    pairs = list(zip(results, questions))
    normal_pairs = [(r, q) for r, q in pairs if r["id"] != CONTROL_NEGATIU_ID]
    r20 = next((r for r in results if r["id"] == CONTROL_NEGATIU_ID), None)
    n = len(normal_pairs)

    lines: list[str] = ["# Informe d'avaluació RAG\n"]

    # 1. Precisió de recuperació de font global i per tipus
    recup_ok = sum(1 for r, _ in normal_pairs if r["recuperacio_correcta"] is True)
    recup_total = sum(1 for r, _ in normal_pairs if r["recuperacio_correcta"] != "NA")

    lines += [
        "## 1. Precisió de recuperació de font\n",
        f"**Global: {_pct(recup_ok, recup_total)} ({recup_ok}/{recup_total})**\n",
        "| Tipus consulta | Recuperació OK | Total | % |",
        "|----------------|----------------|-------|---|",
    ]
    tipus_recup: dict[str, dict] = {}
    for r, q in normal_pairs:
        tc = q.get("tipus_consulta", "?")
        tipus_recup.setdefault(tc, {"ok": 0, "total": 0})
        tipus_recup[tc]["total"] += 1
        if r["recuperacio_correcta"] is True:
            tipus_recup[tc]["ok"] += 1
    for tc, info in sorted(tipus_recup.items()):
        lines.append(f"| {tc} | {info['ok']} | {info['total']} | {_pct(info['ok'], info['total'])} |")
    lines.append("")

    # 2. Cobertura de paraules clau per tipus
    tipus_cob: dict[str, list[float]] = {}
    for r, q in normal_pairs:
        tc = q.get("tipus_consulta", "?")
        tipus_cob.setdefault(tc, [])
        cob = r["cobertura_paraules_clau"]
        if isinstance(cob, (int, float)):
            tipus_cob[tc].append(float(cob))

    all_cobs = [c for cs in tipus_cob.values() for c in cs]
    avg_global = statistics.mean(all_cobs) if all_cobs else 0.0

    lines += [
        "## 2. Cobertura de paraules clau\n",
        f"**Cobertura mitjana global (R01–R19): {avg_global:.1%}**\n",
        "| Tipus consulta | Cobertura mitjana |",
        "|----------------|-------------------|",
    ]
    for tc, cobs in sorted(tipus_cob.items()):
        avg = statistics.mean(cobs) if cobs else 0.0
        lines.append(f"| {tc} | {avg:.1%} |")
    lines.append("")

    # 3. Distribució d'estats (exclou R20)
    estat_counts: dict[str, int] = {}
    for r, _ in normal_pairs:
        estat_counts[r["estat_final"]] = estat_counts.get(r["estat_final"], 0) + 1

    lines += [
        "## 3. Distribució d'estats (R01–R19, sense control negatiu)\n",
        "| Estat | N | % |",
        "|-------|---|---|",
    ]
    for estat, cnt in sorted(estat_counts.items(), key=lambda x: -x[1]):
        lines.append(f"| {estat} | {cnt} | {_pct(cnt, n)} |")
    lines.append("")

    # 4. Categories d'error
    cat_counts: dict[str, int] = {}
    for r, _ in normal_pairs:
        for cat in r["categoria_error"].split("; "):
            cat = cat.strip()
            if cat:
                cat_counts[cat] = cat_counts.get(cat, 0) + 1

    lines += [
        "## 4. Categories d'error (R1–R6)\n",
        "| Categoria | N | % preguntes |",
        "|-----------|---|-------------|",
    ]
    for cat, cnt in sorted(cat_counts.items(), key=lambda x: -x[1]):
        lines.append(f"| {cat} | {cnt} | {_pct(cnt, n)} |")
    lines.append("")

    # 5. Control negatiu R20 — tractat sempre a part (mesura robustesa, no recall)
    lines += ["## 5. Control negatiu R20 (robustesa enfront de l'al·lucinació)\n"]
    if r20:
        estat_r20 = r20["estat_final"]
        veredicte = (
            "CORRECTE — el sistema ha declinat respondre correctament (cap al·lucinació detectada)."
            if estat_r20 == "MATCH_COMPLET"
            else "FALLADA — el sistema ha generat una resposta no present al corpus (al·lucinació)."
        )
        fragment = r20["resposta_generada"][:200].replace("\n", " ")
        lines += [
            f"- **Estat:** `{estat_r20}`",
            f"- **Veredicte:** {veredicte}",
            f"- **Temps:** {r20['temps_resposta_s']}s",
            f"- **Fragment de resposta:** `{fragment}…`",
            "",
            "> **Nota metodològica:** R20 no s'inclou mai a les mitjanes de cobertura ni de recuperació",
            "> perquè mesura robustesa davant l'al·lucinació, no la capacitat de recall del sistema.",
            "",
        ]
    else:
        lines.append("R20 no trobat als resultats.\n")

    # 6. Temps de resposta
    times_normal = [
        r["temps_resposta_s"] for r, _ in normal_pairs
        if isinstance(r["temps_resposta_s"], (int, float))
    ]
    avg_t = statistics.mean(times_normal) if times_normal else 0.0
    p95_idx = min(int(0.95 * len(times_normal)), len(times_normal) - 1)
    p95_t = sorted(times_normal)[p95_idx] if times_normal else 0.0
    t_r20 = r20["temps_resposta_s"] if r20 else "—"

    lines += [
        "## 6. Temps de resposta\n",
        f"- Temps mitjà (R01–R19): **{avg_t:.1f}s**",
        f"- P95 (R01–R19): **{p95_t:.1f}s**",
        f"- R20 (control negatiu): **{t_r20}s**\n",
    ]

    # 7. Preguntes problemàtiques
    problematic = [
        r for r, _ in normal_pairs
        if r["estat_final"] in ("NO_MATCH", "ERROR_EXECUCIO", "MATCH_PARCIAL", "TIMEOUT")
    ]
    lines += ["## 7. Preguntes problemàtiques\n"]
    if not problematic:
        lines.append("Cap pregunta problemàtica detectada.\n")
    else:
        lines += [
            "| ID | Estat | Categoria | Cob. KW | Fragment de resposta |",
            "|----|-------|-----------|---------|----------------------|",
        ]
        for r in problematic:
            detail = (r["resposta_generada"] or r["error_excepcio"] or "").replace("\n", " ")[:100]
            lines.append(
                f"| {r['id']} | {r['estat_final']} | {r['categoria_error']} "
                f"| {r['cobertura_paraules_clau']:.0%} | `{detail}` |"
            )

    return "\n".join(lines) + "\n"


# ─── Entry point ─────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Avaluació del pipeline RAG")
    parser.add_argument(
        "--csv",
        default="tests/fixtures/gold_standard_rag_20preguntes.csv",
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

    # Comprovació prèvia: l'índex pgvector existeix?
    try:
        chunk_count = _count_chunks()
        print(f"Fragments indexats al pgvector: {chunk_count}")
        if chunk_count == 0:
            print("ADVERTÈNCIA: no hi ha fragments indexats. El RAG retornarà respostes buides.")
        print()
    except Exception as e:
        print(f"ADVERTÈNCIA: no s'ha pogut comprovar el recompte de chunks: {e}\n")

    results: list[dict] = []
    for i, q in enumerate(questions, 1):
        preview = q["pregunta"][:55] + ("…" if len(q["pregunta"]) > 55 else "")
        print(f"[{i:02d}/{total}] {q['id']}  {preview}", end="", flush=True)

        r = _process_with_timeout(q, timeout=TIMEOUT_S)
        results.append(r)

        estat = r["estat_final"]
        if estat == "MATCH_COMPLET":
            marker = "✓"
        elif estat == "MATCH_PARCIAL":
            marker = "⚠"
        else:
            marker = "✗"
        print(f"  →  {marker} {estat}  ({r['temps_resposta_s']:.1f}s)")

        if r["error_excepcio"]:
            print(f"        ↳ {r['error_excepcio'][:120]}")

    # CSV de detall
    detail_path = output_dir / "eval_rag_detall.csv"
    with open(detail_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=DETAIL_COLS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)
    print(f"\nDetall CSV guardat: {detail_path}")

    # Resum Markdown
    report = generate_report(results, questions)
    resum_path = output_dir / "eval_rag_resum.md"
    resum_path.write_text(report, encoding="utf-8")

    sep = "─" * 60
    print(f"\n{sep}\n{report}\n{sep}")
    print(f"Resum Markdown guardat: {resum_path}")


if __name__ == "__main__":
    main()
