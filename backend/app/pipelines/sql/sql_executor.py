import re
import unicodedata
import logging
from sqlalchemy import text
from app.pipelines.sql.schema import db, _get_schema, _MAX_ROWS

logger = logging.getLogger(__name__)

_CASE_EXPR_RE = re.compile(
    r',\s*(CASE\s+WHEN\s+.+?\s+END(?:\s+AS\s+\w+)?)',
    re.IGNORECASE | re.DOTALL,
)


def _normalize(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s.lower())
        if unicodedata.category(c) != 'Mn'
    )


def _wrap_alias_case_as_subquery(sql: str) -> str:
    case_exprs = _CASE_EXPR_RE.findall(sql)
    if not case_exprs:
        return sql
    inner_sql = _CASE_EXPR_RE.sub('', sql).strip()
    outer_cases = ", ".join(case_exprs)
    return f"SELECT *, {outer_cases} FROM ({inner_sql}) AS _sub"


def execute_sql(sql: str) -> list[dict]:
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
