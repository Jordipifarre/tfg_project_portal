import json
import re
import difflib
import unicodedata
import logging
from langchain_community.utilities import SQLDatabase
from langchain_ollama import ChatOllama
from langchain_core.messages import SystemMessage, HumanMessage
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
db = SQLDatabase.from_uri(db_url)

_MAX_ROWS = 50
_SAMPLE_VALUES = 10
_SCHEMA_CACHE: dict[str, dict] = {}

# ---------------------------------------------------------------------------
# Schema discovery — runs once, fetches column names + sample values
# ---------------------------------------------------------------------------

def _fetch_schema() -> dict[str, dict]:
    """Returns {table: {"columns": [col,...], "samples": {col: [val,...]}}}"""
    out: dict[str, dict] = {}
    try:
        with db._engine.connect() as conn:
            tables = conn.execute(
                text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'")
            ).fetchall()
            for (table,) in tables:
                try:
                    r = conn.execute(text(f'SELECT * FROM "{table}" LIMIT 0'))
                    cols = list(r.keys())
                    samples: dict[str, list] = {}
                    for col in cols:
                        try:
                            vals = conn.execute(text(
                                f'SELECT DISTINCT "{col}" FROM "{table}" '
                                f'WHERE "{col}" IS NOT NULL '
                                f'ORDER BY "{col}" LIMIT {_SAMPLE_VALUES}'
                            )).fetchall()
                            samples[col] = [str(v[0]) for v in vals]
                        except Exception:
                            samples[col] = []
                    out[table] = {"columns": cols, "samples": samples}
                except Exception as e:
                    logger.warning("Schema fetch failed for %s: %s", table, e)
    except Exception as e:
        logger.error("Schema discovery failed: %s", e)
    return out


def _get_schema() -> dict[str, dict]:
    global _SCHEMA_CACHE
    if not _SCHEMA_CACHE:
        _SCHEMA_CACHE = _fetch_schema()
    return _SCHEMA_CACHE


# ---------------------------------------------------------------------------
# Adaptive table selection — weighted keyword scoring
# ---------------------------------------------------------------------------
#
# IMPORTANT — WHY WE USE WORD-BOUNDARY MATCHING:
#   Substring matching caused "vol" (airport keyword) to match inside
#   "evolució", scoring fets_aeroports=3 on every trend query.
#   All lookups now use _kw_in_text() which checks for whole-word matches
#   using Unicode-aware word boundaries (\b doesn't work with accented chars).
#
# WHY WEIGHTS:
#   Topic-specific terms score 3 so they always beat generic terms (score 1).
#   City names are NOT keywords — they appear in queries about any table.
#
# Structure: {table: {keyword: weight}}
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
        # City names removed — "girona", "reus", "lleida", "sabadell" appear
        # in queries about any table. Only unambiguous airport terms here.
        # "vol" / "vols" are kept but now matched as whole words, so
        # "evolució" no longer triggers a false airport match.
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
# \W matches any non-word character; we wrap the keyword so it is only
# found when preceded and followed by a non-alphanumeric character (or
# start/end of string). This handles accented characters correctly because
# we match on the lowercased query string and the keyword itself is ASCII
# or Catalan — the surrounding \W check is enough.
_KW_PATTERNS: dict[str, dict[str, re.Pattern]] = {}

def _build_kw_patterns() -> None:
    for table, kw_weights in _TABLE_KEYWORDS.items():
        _KW_PATTERNS[table] = {}
        for kw in kw_weights:
            # Use a pattern that treats start/end of string and any
            # non-alphanumeric character as a word boundary.
            escaped = re.escape(kw)
            _KW_PATTERNS[table][kw] = re.compile(
                rf"(?<![^\W_]){escaped}(?![^\W_])",
                re.IGNORECASE | re.UNICODE,
            )

_build_kw_patterns()


def _select_relevant_tables(question: str) -> list[str]:
    """Return the 1-2 most relevant table names for this question.

    Uses whole-word weighted keyword scoring.  The second table is only
    included when its score is at least half the winner's score — prevents
    a weak match from tagging along with a clearly dominant winner.
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


# ---------------------------------------------------------------------------
# Phase 1 — Text-to-SQL prompt + generation
# ---------------------------------------------------------------------------

_SQL_SYSTEM_STATIC = """You are a PostgreSQL expert. Convert the user question into a SQL SELECT query.

═══ GEOGRAPHIC FILTERING ═══
Tables fets_penals_detencions, fets_transport_public, fets_aeroports have NO municipality column.
Use "regió_policial_rp" for city/province filters:
  Barcelona → ILIKE '%%Metropolitana Barcelona%%'
  Girona    → ILIKE '%%Girona%%'
  Tarragona → ILIKE '%%Tarragona%%'
  Lleida    → ILIKE '%%Ponent%%'
  Terres de l'Ebre → ILIKE '%%Terres de l%%'
  Catalunya (all) → omit filter

fets_odi_discriminacio: filter on "municipi" ILIKE '%%city%%' or "província".

═══ AGGREGATION ═══
PRE-AGGREGATED tables — use SUM not COUNT(*):
  fets_penals_detencions → SUM(CAST("coneguts" AS NUMERIC)), SUM(CAST("resolts" AS NUMERIC)), SUM(CAST("detencions" AS NUMERIC))
  fets_aeroports         → SUM(CAST("nombre" AS NUMERIC))
  fets_transport_public  → SUM(CAST("<mode>" AS NUMERIC)) where mode = "autobús"|"metro"|"taxi"|"tren"
  fets_odi_discriminacio → COUNT(*) or SUM(CAST("nombre_víctimes" AS NUMERIC))

═══ RULES ═══
1. Return ONLY raw JSON — no markdown, no explanation:
   {"sql": "SELECT ...", "summary_hint": "<catalan sentence ≤15 words describing what the query returns>"}

2. Double-quote ALL identifiers. Never use backticks. "any" is reserved — always quote it as "any".

3. Match filter values to the sample values in the schema. Use ILIKE '%%stem%%' for text columns.
   Never invent values not shown in samples.

4. Keep every filter the user mentioned (year, location, type, channel…).

5. LIMIT {max_rows}. Never SELECT *.

6. No matching table → {"sql": "SELECT 'no_data'", "summary_hint": ""}

EXAMPLES:
User: "Quants robatoris amb força a Barcelona el 2019"
{"sql": "SELECT SUM(CAST(\\"coneguts\\" AS NUMERIC)) AS total FROM \\"fets_penals_detencions\\" WHERE \\"any\\" = '2019' AND \\"tipus_de_fet\\" ILIKE '%%Robatori amb força%%' AND \\"regió_policial_rp\\" ILIKE '%%Metropolitana Barcelona%%'", "summary_hint": "Total de robatoris amb força a Barcelona el 2019"}

User: "Quants fets d'odi a Girona el 2020"
{"sql": "SELECT COUNT(*) AS total FROM \\"fets_odi_discriminacio\\" WHERE \\"any\\" = '2020' AND \\"municipi\\" ILIKE '%%Girona%%'", "summary_hint": "Total de fets d'odi a Girona el 2020"}

User: "Evolució dels fets d'odi a Girona de 2020 a 2024"
{"sql": "SELECT \\"any\\", COUNT(*) AS total FROM \\"fets_odi_discriminacio\\" WHERE \\"municipi\\" ILIKE '%%Girona%%' AND \\"any\\" BETWEEN '2020' AND '2024' GROUP BY \\"any\\" ORDER BY \\"any\\" LIMIT 50", "summary_hint": "Evolució anual dels fets d'odi a Girona de 2020 a 2024"}

User: "Compara fets d'odi presencial amb internet a Girona el 2020"
{"sql": "SELECT \\"canal_dels_fets\\", COUNT(*) AS total FROM \\"fets_odi_discriminacio\\" WHERE \\"any\\" = '2020' AND \\"municipi\\" ILIKE '%%Girona%%' GROUP BY \\"canal_dels_fets\\" LIMIT 50", "summary_hint": "Comparació de fets d'odi per canal a Girona el 2020"}
"""


def _make_sql_system_prompt(tables: list[str]) -> str:
    schema_block = _schema_string(tables)
    prompt = _SQL_SYSTEM_STATIC.replace("{max_rows}", str(_MAX_ROWS))
    return (
        f"DATABASE SCHEMA (only relevant tables shown):\n"
        f"{schema_block}\n\n{prompt}"
    )


def _extract_sql_and_hint(raw: str) -> tuple[str | None, str]:
    raw = raw.strip()
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict) and "sql" in obj:
            return obj["sql"].strip(), obj.get("summary_hint", "")
    except json.JSONDecodeError:
        pass

    m = re.search(r'\{[^{}]*"sql"[^{}]*\}', raw, re.DOTALL)
    if m:
        try:
            obj = json.loads(m.group(0))
            if "sql" in obj:
                return obj["sql"].strip(), obj.get("summary_hint", "")
        except Exception:
            pass

    sel = re.search(r'(SELECT\s.+?;)', raw, re.IGNORECASE | re.DOTALL)
    if sel:
        return sel.group(1).strip(), ""

    return None, ""


_BACKTICK_RE = re.compile(r'`([^`]+)`')
_QUOTED_IDENT_RE = re.compile(r'"([^"]+)"')


def _sanitize_sql(sql: str) -> str:
    sql = _BACKTICK_RE.sub(lambda m: f'"{m.group(1)}"', sql)
    sql = re.sub(r'(?<!")\bany\b(?!")', '"any"', sql, flags=re.IGNORECASE)
    return sql


def _best_column_match(col: str, real_cols_lower: dict[str, str]) -> str | None:
    c = col.lower()
    if c in real_cols_lower:
        return real_cols_lower[c]
    prefix = [k for k in real_cols_lower if k.startswith(c)]
    if len(prefix) == 1:
        return real_cols_lower[prefix[0]]
    substr = [k for k in real_cols_lower if c in k]
    if len(substr) == 1:
        return real_cols_lower[substr[0]]
    close = difflib.get_close_matches(c, real_cols_lower.keys(), n=1, cutoff=0.5)
    if close:
        return real_cols_lower[close[0]]
    return None


def _fix_column_names(sql: str) -> str:
    schema = _get_schema()
    from_match = re.search(r'FROM\s+"([^"]+)"', sql, re.IGNORECASE)
    if not from_match:
        return sql
    table = from_match.group(1)
    if table not in schema:
        return sql

    real_cols = schema[table]["columns"]
    real_cols_lower = {c.lower(): c for c in real_cols}

    def _replace(m: re.Match) -> str:
        ident = m.group(1)
        if ident == table:
            return f'"{ident}"'
        corrected = _best_column_match(ident, real_cols_lower)
        if corrected and corrected != ident:
            print(f"[SQL-CONV] COLUMN CORRECTION: '{ident}' → '{corrected}'")
            logger.info("Column correction: '%s' → '%s'", ident, corrected)
            return f'"{corrected}"'
        return f'"{ident}"'

    fixed = _QUOTED_IDENT_RE.sub(_replace, sql)
    if fixed != sql:
        print(f"[SQL-CONV] AFTER COLUMN FIX: {fixed}")
    return fixed


_ILIKE_COLS = {
    "aeroport", "municipi", "comarca", "província",
    "àrea_bàsica_policial_abp", "àrea_regional_de_trànsit_art__àrea_bàsica_policial_abp",
    "regió_policial_rp", "tipus_de_fet", "títol_codi_penal", "tipus_de_lloc_dels_fets",
}

_FILTER_RE = re.compile(
    r'"([^"]+)"\s*(=|ILIKE)\s*\'((?:[^\'\\]|\\.)*?)\'',
    re.IGNORECASE,
)


def _fix_filter_values(sql: str) -> str:
    schema = _get_schema()
    from_match = re.search(r'FROM\s+"([^"]+)"', sql, re.IGNORECASE)
    if not from_match:
        return sql
    table = from_match.group(1)
    if table not in schema:
        return sql
    samples = schema[table]["samples"]

    def _replace_filter(m: re.Match) -> str:
        col, val = m.group(1), m.group(3)
        col_samples = samples.get(col, [])
        val_lower = val.lower()
        col_lower = col.lower()

        exact = any(s.lower() == val_lower for s in col_samples)
        force_ilike = col_lower in _ILIKE_COLS

        if exact and not force_ilike:
            return m.group(0)

        clean_val = val.strip('%').strip()

        if exact and force_ilike:
            new_filter = f'"{col}" ILIKE \'%%{clean_val}%%\''
            if new_filter != m.group(0):
                print(f"[SQL-CONV] VALUE→ILIKE: \"{col}\" = '{val}' → ILIKE '%%{clean_val}%%'")
            return new_filter

        partial_match = next(
            (s for s in col_samples if val_lower in s.lower() or s.lower() in val_lower),
            None,
        )
        if partial_match:
            print(f"[SQL-CONV] VALUE FIX: \"{col}\" '{val}' → ILIKE '%%{clean_val}%%' (sample: '{partial_match}')")
        else:
            print(f"[SQL-CONV] VALUE WARN: \"{col}\" '{val}' has no sample match — using ILIKE")
        return f'"{col}" ILIKE \'%%{clean_val}%%\''

    fixed = _FILTER_RE.sub(_replace_filter, sql)
    if fixed != sql:
        logger.info("Filter value fix applied: %s", fixed)
    return fixed


def _generate_sql(user_query: str, llm: ChatOllama) -> tuple[str | None, str]:
    relevant_tables = _select_relevant_tables(user_query)
    system_prompt = _make_sql_system_prompt(relevant_tables)

    print("\n" + "=" * 60)
    print(f"[SQL-CONV] TABLES IN PROMPT: {relevant_tables}")
    print(f"[SQL-CONV] PROMPT LENGTH (chars): {len(system_prompt)}")
    print(f"[SQL-CONV] USER QUERY: {user_query}")
    print("=" * 60 + "\n")

    msgs = [SystemMessage(content=system_prompt), HumanMessage(content=user_query)]
    try:
        print("[SQL-CONV] Calling LLM for SQL generation...")
        raw = llm.invoke(msgs).content
        print(f"[SQL-CONV] RAW LLM OUTPUT:\n{raw}\n")
        logger.info("SQL gen raw output: %s", raw)

        sql, hint = _extract_sql_and_hint(raw)
        print(f"[SQL-CONV] EXTRACTED SQL:  {sql}")
        print(f"[SQL-CONV] SUMMARY HINT:   {hint}")

        if sql:
            sql = _sanitize_sql(sql)
            print(f"[SQL-CONV] AFTER SANITIZE: {sql}")
            sql = _fix_column_names(sql)
            print(f"[SQL-CONV] AFTER COL FIX:  {sql}")
            sql = _fix_filter_values(sql)
            print(f"[SQL-CONV] FINAL SQL:       {sql}\n")
            logger.info("Final SQL: %s", sql)
        else:
            print("[SQL-CONV] WARNING: Could not extract SQL from LLM output\n")

        return sql, hint

    except Exception as e:
        print(f"[SQL-CONV] ERROR generating SQL: {e}")
        logger.error("SQL generation failed: %s", e)
        return None, ""


# ---------------------------------------------------------------------------
# Phase 2 — SQL execution with auto-retry on UndefinedColumn
# ---------------------------------------------------------------------------

def _normalize(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )


_CASE_EXPR_RE = re.compile(
    r',\s*(CASE\s+WHEN\s+.+?\s+END(?:\s+AS\s+\w+)?)',
    re.IGNORECASE | re.DOTALL,
)


def _wrap_alias_case_as_subquery(sql: str) -> str:
    case_exprs = _CASE_EXPR_RE.findall(sql)
    if not case_exprs:
        return sql
    inner_sql = _CASE_EXPR_RE.sub('', sql).strip()
    outer_cases = ", ".join(case_exprs)
    return f"SELECT *, {outer_cases} FROM ({inner_sql}) AS _sub"


def _execute_sql(sql: str) -> list[dict]:
    schema = _get_schema()
    norm_map: dict[str, str] = {}
    for info in schema.values():
        for col in info["columns"]:
            norm_map[_normalize(col)] = col

    for attempt in range(3):
        print(f"[SQL-CONV] EXECUTING SQL (attempt {attempt + 1}):\n  {sql}\n")
        try:
            with db._engine.connect() as conn:
                result = conn.execute(text(sql))
                keys = list(result.keys())
                rows = result.fetchmany(_MAX_ROWS)
                dicts = [dict(zip(keys, row)) for row in rows]
                print(f"[SQL-CONV] ROWS RETURNED: {len(dicts)}")
                if dicts:
                    print(f"[SQL-CONV] FIRST ROW SAMPLE: {dicts[0]}")
                else:
                    print("[SQL-CONV] WARNING: Query returned 0 rows")
                print()
                return dicts
        except Exception as e:
            err = str(e)
            if "UndefinedColumn" not in type(e).__name__ and "undefined_column" not in err and "does not exist" not in err:
                raise

            bad_match = re.search(r'column "([^"]+)" does not exist', err)
            if not bad_match:
                bad_match = re.search(r'column (\S+) does not exist', err)
            if not bad_match:
                raise

            bad_col = bad_match.group(1).strip('"')

            hint_match = re.search(r'reference the column "([^"]+)"', err)
            if hint_match:
                real = hint_match.group(1).split(".")[-1]
            else:
                real = norm_map.get(_normalize(bad_col))

            if not real:
                is_alias = bool(re.search(
                    rf'\bAS\s+{re.escape(bad_col)}\b', sql, re.IGNORECASE
                ))
                if is_alias:
                    rewritten = _wrap_alias_case_as_subquery(sql)
                    if rewritten != sql:
                        print(f"[SQL-CONV] ALIAS REWRITE: '{bad_col}' is a SELECT alias → wrapping in subquery")
                        logger.info("Alias reference rewrite triggered by '%s'", bad_col)
                        sql = rewritten
                        continue
                print(f"[SQL-CONV] RETRY FAILED: '{bad_col}' is neither a column nor rewritable alias")
                raise

            print(f"[SQL-CONV] RETRY {attempt + 1}: '{bad_col}' → '{real}'")
            logger.info("Column retry correction: '%s' → '%s'", bad_col, real)
            sql = re.sub(
                rf'(?<!["\w]){re.escape(bad_col)}(?!["\w])',
                f'"{real}"',
                sql,
            )

    raise RuntimeError("SQL execution failed after 3 attempts")


# ---------------------------------------------------------------------------
# Phase 3 — Result formatting
#
# Strategy (hybrid):
#   • 1 row, 1 column  → programmatic — no LLM (COUNT/SUM single value)
#   • 1 row, N columns → programmatic — no LLM (key-value breakdown)
#   • N rows           → full LLM summarise — trends, comparisons, rankings
#                        need narrative that a plain text table can't convey
# ---------------------------------------------------------------------------

_SUMMARIZE_SYSTEM = """Ets un assistent de dades de seguretat pública de Catalunya.
Se't dona una pregunta i el resultat d'una consulta a la base de dades.
Respon en català, de forma clara i directa, citant les xifres concretes.
Si hi ha diverses files, fes un resum concís. No mostris SQL ni detalls tècnics."""


def _format_result(user_query: str, rows: list[dict], hint: str, llm: ChatOllama) -> str:
    print(f"[SQL-CONV] FORMATTING {len(rows)} rows")

    # ── Single-value (COUNT / SUM): no LLM needed ──
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

    # ── Single row, multiple columns: no LLM needed ──
    if len(rows) == 1:
        parts = [f"**{k}**: {v}" for k, v in rows[0].items()]
        prefix = f"{hint}\n\n" if hint else ""
        result = prefix + "\n".join(parts)
        print(f"[SQL-CONV] FINAL ANSWER (programmatic):\n{result}\n")
        return result

    # ── Multiple rows: LLM summarise for readable narrative ──
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
        # Graceful fallback: plain text table
        cols = list(rows[0].keys())
        lines = [" | ".join(cols), "-" * len(" | ".join(cols))]
        for row in rows[:10]:
            lines.append(" | ".join(str(row.get(c, "")) for c in cols))
        return (f"{hint}\n\n" if hint else "") + "\n".join(lines)


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

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

    sql, hint = _generate_sql(user_query, llm)

    if not sql:
        print("[SQL-CONV] FAILED: no SQL extracted from LLM output")
        return "No he pogut generar una consulta per a aquesta pregunta. Podries reformular-la amb més detall?"

    if sql.strip() == "SELECT 'no_data'":
        print("[SQL-CONV] LLM signaled no matching table")
        return "No tinc dades relacionades amb aquesta pregunta a la base de dades disponible."

    try:
        rows = _execute_sql(sql)
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

    return _format_result(user_query, rows, hint, llm)