import json
import re
import difflib
import logging
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import SystemMessage, HumanMessage
from app.pipelines.sql.schema import _get_schema, _MAX_ROWS
from app.pipelines.sql.table_selector import _select_relevant_tables, _schema_string

logger = logging.getLogger(__name__)

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

_BACKTICK_RE = re.compile(r'`([^`]+)`')
_QUOTED_IDENT_RE = re.compile(r'"([^"]+)"')
_ILIKE_COLS = {
    "aeroport", "municipi", "comarca", "província",
    "àrea_bàsica_policial_abp", "àrea_regional_de_trànsit_art__àrea_bàsica_policial_abp",
    "regió_policial_rp", "tipus_de_fet", "títol_codi_penal", "tipus_de_lloc_dels_fets",
}
_FILTER_RE = re.compile(
    r'"([^"]+)"\s*(=|ILIKE)\s*\'((?:[^\'\\]|\\.)*?)\'',
    re.IGNORECASE,
)


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


def generate_sql(user_query: str, llm: BaseChatModel) -> tuple[str | None, str]:
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
        logger.error("SQL generation failed: %s", e, exc_info=True)
        return None, ""
