import logging
from langchain_community.utilities import SQLDatabase
from sqlalchemy import text
from app.core.config import settings

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://")
db = SQLDatabase.from_uri(db_url)

_MAX_ROWS = 50
_SAMPLE_VALUES = 10
_SCHEMA_CACHE: dict[str, dict] = {}


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
