import re
import logging
from app.pipelines.sql.schema import _get_schema

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Adaptive table selection — weighted keyword scoring
#
# IMPORTANT — WHY WE USE WORD-BOUNDARY MATCHING:
#   Substring matching caused "vol" (airport keyword) to match inside
#   "evolució", scoring fets_aeroports=3 on every trend query.
#   All lookups now use whole-word matching via compiled patterns.
#
# WHY WEIGHTS:
#   Topic-specific terms score 3 so they always beat generic terms (score 1).
#   City names are NOT keywords — they appear in queries about any table.
# ---------------------------------------------------------------------------

_TABLE_KEYWORDS: dict[str, dict[str, int]] = {
    "fets_penals_detencions": {
        "penal": 3, "penals": 3, "detencions": 3, "detenció": 3,
        "arrest": 3, "arrests": 3, "crim": 3, "crims": 3,
        "delicte": 3, "delictes": 3, "robatori": 3, "robatoris": 3,
        "furt": 3, "furts": 3, "homicidi": 3, "lesions": 3,
        "violació": 3, "estafa": 3, "resolts": 3,
        "coneguts": 1, "denuncia": 1, "denúncia": 1,
        "mossos": 1, "seguretat": 1, "incidents": 1, "incident": 1,
    },
    "fets_transport_public": {
        "transport": 3, "metro": 3, "autobús": 3, "autobus": 3,
        "bus": 3, "tren": 3, "taxi": 3, "ferrocarril": 3,
        "rodalies": 3, "fgc": 3, "tmb": 3,
    },
    "fets_aeroports": {
        "aeroport": 3, "aeroports": 3, "aeri": 3,
        "vol": 3, "vols": 3, "terminal": 3, "prat": 3,
    },
    "fets_odi_discriminacio": {
        "odi": 3, "discriminació": 3, "discriminacio": 3,
        "racisme": 3, "xenofobia": 3, "xenofòbia": 3,
        "lgbtifòbia": 3, "lgbtifobia": 3, "antisemitisme": 3,
        "islamofobia": 3, "islamofòbia": 3, "aporofobia": 3,
        "víctimes": 2, "victimes": 2,
        "infraccions": 1, "presencial": 1, "xarxes": 1, "internet": 1,
    },
}

# Pre-compile one pattern per keyword for whole-word matching.
_KW_PATTERNS: dict[str, dict[str, re.Pattern]] = {}


def _build_kw_patterns() -> None:
    for table, kw_weights in _TABLE_KEYWORDS.items():
        _KW_PATTERNS[table] = {}
        for kw in kw_weights:
            escaped = re.escape(kw)
            _KW_PATTERNS[table][kw] = re.compile(
                rf"(?<![^\W_]){escaped}(?![^\W_])",
                re.IGNORECASE | re.UNICODE,
            )


_build_kw_patterns()


def _select_relevant_tables(question: str) -> list[str]:
    """Return the 1-2 most relevant table names for this question.

    The second table is only included when its score is at least half the
    winner's score — prevents a weak match from tagging along.
    """
    q_lower = question.lower()
    scores: dict[str, int] = {}
    for table, kw_weights in _TABLE_KEYWORDS.items():
        score = sum(
            w for kw, w in kw_weights.items()
            if _KW_PATTERNS[table][kw].search(q_lower)
        )
        if score > 0:
            scores[table] = score

    if scores:
        ranked = sorted(scores, key=scores.get, reverse=True)
        winner_score = scores[ranked[0]]
        selected = [ranked[0]]
        if len(ranked) > 1 and scores[ranked[1]] >= winner_score / 2:
            selected.append(ranked[1])

        logger.info("Table selection: %s (scores: %s)", selected, scores)
        print(f"[SQL-CONV] TABLE SELECTION: {selected} from scores {scores}")
        return selected

    logger.warning("No table keywords matched — sending full schema")
    print("[SQL-CONV] TABLE SELECTION: no match, sending full schema")
    return list(_get_schema().keys())


def _schema_string(tables: list[str] | None = None) -> str:
    """Build the schema string, optionally restricted to specific tables."""
    schema = _get_schema()
    if tables:
        schema = {t: v for t, v in schema.items() if t in tables}
    lines = []
    for table, info in schema.items():
        col_lines = []
        for col in info["columns"]:
            vals = info["samples"].get(col, [])
            sample_str = ", ".join(f"'{v}'" for v in vals) if vals else "(no samples)"
            col_lines.append(f'    "{col}" — sample values: {sample_str}')
        lines.append(f'Table: "{table}"\n' + "\n".join(col_lines))
    return "\n\n".join(lines)
