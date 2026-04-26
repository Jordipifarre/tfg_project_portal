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
_SAMPLE_VALUES = 10   # distinct values to fetch per column for the prompt
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


def _schema_string() -> str:
    lines = []
    for table, info in _get_schema().items():
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

def _make_sql_system_prompt() -> str:
    return f"""You are a PostgreSQL expert. Your only job is to convert a user question into a SQL SELECT query.

DATABASE SCHEMA (PostgreSQL, public schema):
{_schema_string()}

═══ GEOGRAPHIC FILTERING ═══
Three tables (fets_penals_detencions, fets_transport_public, fets_aeroports) do NOT have a
municipality column. They only have "regió_policial_rp" and "àrea_bàsica_policial_abp".

When the user mentions a city or province, map it to the correct region:
  Barcelona         → "regió_policial_rp" ILIKE '%%Metropolitana Barcelona%%'
  Girona            → "regió_policial_rp" ILIKE '%%Girona%%'
  Tarragona         → "regió_policial_rp" ILIKE '%%Tarragona%%'
  Lleida            → "regió_policial_rp" ILIKE '%%Ponent%%'
  Terres de l'Ebre  → "regió_policial_rp" ILIKE '%%Terres de l%%'
  Catalunya (global)→ omit the region filter entirely

For "fets_odi_discriminacio", prefer filtering on "municipi" ILIKE '%%city%%' or "província" when available.

═══ TABLE-SPECIFIC AGGREGATION ═══
The following tables are PRE-AGGREGATED (one row = a group of incidents, not one incident).
You MUST use SUM, not COUNT(*), to get totals:

  fets_penals_detencions:
    - "coneguts"   = total known crimes      → SUM(CAST("coneguts" AS NUMERIC))
    - "resolts"    = total resolved crimes   → SUM(CAST("resolts" AS NUMERIC))
    - "detencions" = total arrests           → SUM(CAST("detencions" AS NUMERIC))
    - "tipus_de_fet" = specific crime category (use this for crime type filters)
    - "títol_codi_penal" = broad legal chapter (only use if user asks for a broad category)

  fets_aeroports:
    - "nombre" = total incidents             → SUM(CAST("nombre" AS NUMERIC))
    - "tipus_de_fet" = crime type at airport

  fets_transport_public:
    - "autobús", "metro", "taxi", "tren" = incident counts per mode → SUM(CAST("col" AS NUMERIC))

  fets_odi_discriminacio:
    - "nombre_fets_o_infraccions" = one row per incident → COUNT(*) or SUM is both valid
    - "nombre_víctimes" = victim count per row → SUM(CAST("nombre_víctimes" AS NUMERIC))

═══ CRITICAL RULES ═══
1. Respond with ONLY a JSON object: {{"sql": "SELECT ..."}}
   No explanation, no markdown, no code blocks. Raw JSON only.

2. ALWAYS double-quote identifiers: "table"."column"
   NEVER use backticks (`). "any" is a reserved word — always write it as "any".

3. FILTER VALUES — always match to the sample values shown in the schema, not the user's exact words.
   - Find the closest sample value and use its ROOT in ILIKE.
   - IMPORTANT: the user may use plural or different forms. Always extract the stem from the sample.
     Examples:
       user "furts"    → sample shows 'Furt'           → use ILIKE '%%Furt%%'
       user "robatoris"→ sample shows 'Robatori...'    → use ILIKE '%%Robatori%%'
       user "presencial"→ sample shows 'Presencial'    → use = 'Presencial'
   - For "tipus_de_fet" columns: ALWAYS use ILIKE '%%stem%%' (not =) to capture all subtypes.
     E.g. ILIKE '%%Furt%%' matches 'Furt', 'Furt (lleu)', 'Furt interior vehicle', etc.
   - Never use a word that does not appear in the sample values of that column.

4. Extract EVERY filter: year ("any"), location (mapped to region), type, channel, etc.
   Never drop a filter. Never invent values not shown in the schema samples.

5. LIMIT {_MAX_ROWS} rows. Select only columns needed — never SELECT *.
6. If no table matches: {{"sql": "SELECT 'no_data'"}}

EXAMPLES:
"Quants robatoris amb força a Barcelona el 2019":
{{"sql": "SELECT SUM(CAST(\\"coneguts\\" AS NUMERIC)) AS total FROM \\"fets_penals_detencions\\" WHERE \\"any\\" = '2019' AND \\"tipus_de_fet\\" ILIKE '%%robatori amb força%%' AND \\"regió_policial_rp\\" ILIKE '%%Metropolitana Barcelona%%'"}}

"Quants fets d'odi a Girona el 2020":
{{"sql": "SELECT COUNT(*) AS total FROM \\"fets_odi_discriminacio\\" WHERE \\"any\\" = '2020' AND \\"municipi\\" ILIKE '%%Girona%%'"}}
"""


_SQL_RE = re.compile(r'\{[^{}]*"sql"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}', re.DOTALL)


def _extract_sql(raw: str) -> str | None:
    raw = raw.strip()
    # Direct JSON parse
    try:
        obj = json.loads(raw)
        if isinstance(obj, dict) and "sql" in obj:
            return obj["sql"].strip()
    except json.JSONDecodeError:
        pass
    # Regex fallback — handles surrounding text
    m = _SQL_RE.search(raw)
    if m:
        try:
            obj = json.loads(m.group(0))
            return obj["sql"].strip()
        except Exception:
            pass
    # Last resort: bare SELECT statement
    sel = re.search(r'(SELECT\s.+?;)', raw, re.IGNORECASE | re.DOTALL)
    if sel:
        return sel.group(1).strip()
    return None


_BACKTICK_RE = re.compile(r'`([^`]+)`')
_QUOTED_IDENT_RE = re.compile(r'"([^"]+)"')


def _sanitize_sql(sql: str) -> str:
    """Backtick → double-quote; ensure `any` reserved word is quoted."""
    sql = _BACKTICK_RE.sub(lambda m: f'"{m.group(1)}"', sql)
    sql = re.sub(r'(?<!")\bany\b(?!")', '"any"', sql, flags=re.IGNORECASE)
    return sql


def _best_column_match(col: str, real_cols_lower: dict[str, str]) -> str | None:
    """Find the best real column for an abbreviated/hallucinated name.

    Priority:
      1. Exact match (case-insensitive)
      2. Prefix match — col is a prefix of exactly one real column (e.g. "canal" → "canal_dels_fets")
      3. Substring match — col appears inside exactly one real column
      4. difflib fuzzy (cutoff 0.5)
    Returns None if nothing good is found.
    """
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
    """Auto-correct abbreviated/hallucinated column names against the real schema."""
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


# Columns where = should always become ILIKE (location/name text fields)
_ILIKE_COLS = {
    "aeroport", "municipi", "comarca", "província",
    "àrea_bàsica_policial_abp", "àrea_regional_de_trànsit_art__àrea_bàsica_policial_abp",
    "regió_policial_rp", "tipus_de_fet", "títol_codi_penal", "tipus_de_lloc_dels_fets",
}

# Pattern: "col" = 'value'  or  "col" ILIKE '%%value%%'
_FILTER_RE = re.compile(
    r'"([^"]+)"\s*(=|ILIKE)\s*\'((?:[^\'\\]|\\.)*?)\'',
    re.IGNORECASE,
)


def _fix_filter_values(sql: str) -> str:
    """Validate and fix filter values against real schema sample values.

    For each "col" = 'value' or "col" ILIKE '%%value%%':
    - If the value matches a sample exactly (case-insensitive) → keep as-is (use = or ILIKE).
    - If no exact match but a sample contains the value as substring → convert to ILIKE '%%value%%'.
    - For columns in _ILIKE_COLS: always use ILIKE regardless of original operator.
    """
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

        # Check exact match (case-insensitive) against samples
        exact = any(s.lower() == val_lower for s in col_samples)

        # Force ILIKE for location/name columns
        force_ilike = col_lower in _ILIKE_COLS

        if exact and not force_ilike:
            # Keep original filter unchanged
            return m.group(0)

        # Strip %% wrappers the model might have added before re-wrapping
        clean_val = val.strip('%').strip()

        if exact and force_ilike:
            # Exact value found but column should use ILIKE for robustness
            new_filter = f'"{col}" ILIKE \'%%{clean_val}%%\''
            if new_filter != m.group(0):
                print(f"[SQL-CONV] VALUE→ILIKE: \"{col}\" = '{val}' → ILIKE '%%{clean_val}%%'")
            return new_filter

        # No exact match — try substring match against samples
        partial_match = next((s for s in col_samples if val_lower in s.lower() or s.lower() in val_lower), None)
        if partial_match:
            print(f"[SQL-CONV] VALUE FIX: \"{col}\" '{val}' → ILIKE '%%{clean_val}%%' (sample: '{partial_match}')")
        else:
            print(f"[SQL-CONV] VALUE WARN: \"{col}\" '{val}' has no sample match — using ILIKE")
        return f'"{col}" ILIKE \'%%{clean_val}%%\''

    fixed = _FILTER_RE.sub(_replace_filter, sql)
    if fixed != sql:
        logger.info("Filter value fix applied: %s", fixed)
    return fixed


def _generate_sql(user_query: str, llm: ChatOllama) -> str | None:
    system_prompt = _make_sql_system_prompt()
    print("\n" + "="*60)
    print("[SQL-CONV] SCHEMA SENT TO LLM:")
    print(_schema_string())
    print("="*60)
    print(f"[SQL-CONV] USER QUERY: {user_query}")
    print("="*60 + "\n")

    msgs = [SystemMessage(content=system_prompt), HumanMessage(content=user_query)]
    try:
        print("[SQL-CONV] Calling LLM for SQL generation...")
        raw = llm.invoke(msgs).content
        print(f"[SQL-CONV] RAW LLM OUTPUT:\n{raw}\n")
        logger.info("SQL gen raw output: %s", raw)

        sql = _extract_sql(raw)
        print(f"[SQL-CONV] EXTRACTED SQL: {sql}")

        if sql:
            sql = _sanitize_sql(sql)
            print(f"[SQL-CONV] AFTER SANITIZE:  {sql}")
            sql = _fix_column_names(sql)
            print(f"[SQL-CONV] AFTER COL FIX:   {sql}")
            sql = _fix_filter_values(sql)
            print(f"[SQL-CONV] FINAL SQL:        {sql}\n")
            logger.info("Final SQL: %s", sql)
        else:
            print("[SQL-CONV] WARNING: Could not extract SQL from LLM output\n")
        return sql
    except Exception as e:
        print(f"[SQL-CONV] ERROR generating SQL: {e}")
        logger.error("SQL generation failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Phase 2 — Direct SQL execution with auto-retry on UndefinedColumn
# ---------------------------------------------------------------------------

def _normalize(s: str) -> str:
    """Lowercase + strip accents for fuzzy column matching."""
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )


_CASE_EXPR_RE = re.compile(
    r',\s*(CASE\s+WHEN\s+.+?\s+END(?:\s+AS\s+\w+)?)',
    re.IGNORECASE | re.DOTALL,
)


def _wrap_alias_case_as_subquery(sql: str) -> str:
    """Move CASE WHEN expressions that reference SELECT aliases into an outer SELECT.

    PostgreSQL disallows: SELECT COUNT(*) AS n, CASE WHEN n = 0 ...
    This rewrites it as:  SELECT *, CASE WHEN n = 0 ... FROM (SELECT COUNT(*) AS n ...) _s
    """
    case_exprs = _CASE_EXPR_RE.findall(sql)
    if not case_exprs:
        return sql
    inner_sql = _CASE_EXPR_RE.sub('', sql).strip()
    outer_cases = ", ".join(case_exprs)
    return f"SELECT *, {outer_cases} FROM ({inner_sql}) AS _sub"


def _execute_sql(sql: str) -> list[dict]:
    """Execute SQL, retrying up to 2 times on UndefinedColumn errors.

    On each failure: extract the bad identifier from the error message,
    find the real column via accent-normalized lookup or PostgreSQL's HINT,
    substitute it with a properly quoted name, then retry.
    """
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
            # Only retry on UndefinedColumn
            if "UndefinedColumn" not in type(e).__name__ and "undefined_column" not in err and "does not exist" not in err:
                raise

            # Extract the bad column name from the error message
            bad_match = re.search(r'column "([^"]+)" does not exist', err)
            if not bad_match:
                # Try unquoted form: column nombre_victimes does not exist
                bad_match = re.search(r'column (\S+) does not exist', err)
            if not bad_match:
                raise

            bad_col = bad_match.group(1).strip('"')

            # 1. Try PostgreSQL's own HINT first ("perhaps you meant X")
            hint_match = re.search(r'reference the column "([^"]+)"', err)
            if hint_match:
                real = hint_match.group(1).split(".")[-1]
            else:
                # 2. Normalize and look up in our schema map
                real = norm_map.get(_normalize(bad_col))

            if not real:
                # Check if the bad identifier is actually a SELECT alias used in
                # a CASE WHEN — PostgreSQL forbids referencing same-level aliases.
                is_alias = bool(re.search(
                    rf'\bAS\s+{re.escape(bad_col)}\b', sql, re.IGNORECASE
                ))
                if is_alias:
                    rewritten = _wrap_alias_case_as_subquery(sql)
                    if rewritten != sql:
                        print(f"[SQL-CONV] ALIAS REWRITE: '{bad_col}' is a SELECT alias → wrapping in subquery")
                        logger.info("Alias reference rewrite triggered by '%s'", bad_col)
                        sql = rewritten
                        continue  # retry with the rewritten SQL
                print(f"[SQL-CONV] RETRY FAILED: '{bad_col}' is neither a column nor rewritable alias")
                raise

            print(f"[SQL-CONV] RETRY {attempt + 1}: '{bad_col}' → '{real}'")
            logger.info("Column retry correction: '%s' → '%s'", bad_col, real)

            # Replace the bad identifier (quoted or unquoted) with the real name
            sql = re.sub(
                rf'(?<!["\w]){re.escape(bad_col)}(?!["\w])',
                f'"{real}"',
                sql,
            )

    raise RuntimeError(f"SQL execution failed after 3 attempts")


# ---------------------------------------------------------------------------
# Phase 3 — Summarize result in Catalan
# ---------------------------------------------------------------------------

_SUMMARIZE_SYSTEM = """Ets un assistent de dades de seguretat pública de Catalunya.
Se't dona una pregunta i el resultat d'una consulta a la base de dades.
Respon en català, de forma clara i directa, citant les xifres concretes.
Si hi ha diverses files, fes un resum concís. No mostris SQL ni tècnics detalls."""


def _summarize(user_query: str, rows: list[dict], llm: ChatOllama) -> str:
    result_text = json.dumps(rows, ensure_ascii=False, default=str)
    print(f"[SQL-CONV] SUMMARIZING {len(rows)} rows")
    print(f"[SQL-CONV] RAW RESULT SENT TO SUMMARIZER:\n{result_text[:500]}\n")
    content = f"Pregunta: {user_query}\n\nResultat:\n{result_text}"
    try:
        answer = llm.invoke([
            SystemMessage(content=_SUMMARIZE_SYSTEM),
            HumanMessage(content=content),
        ]).content.strip()
        print(f"[SQL-CONV] FINAL ANSWER:\n{answer}\n")
        return answer
    except Exception as e:
        logger.error("Summarize failed: %s", e)
        return f"Resultat de la consulta: {result_text}"


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------

def query_database(user_query: str, model: str | None = None) -> str:
    effective_model = model or settings.OLLAMA_SQL_MODEL
    print(f"\n{'#'*60}")
    print(f"[SQL-CONV] query_database() called")
    print(f"[SQL-CONV] Model: {effective_model}")
    print(f"[SQL-CONV] Query: {user_query}")
    print(f"{'#'*60}\n")

    llm = ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=effective_model,
        temperature=0,
    )

    sql = _generate_sql(user_query, llm)
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
        return "No he trobat cap registre que coincideixi amb els filtres de la teva pregunta. Prova amb un any diferent, una altra localitat o sense algun filtre específic."

    return _summarize(user_query, rows, llm)
