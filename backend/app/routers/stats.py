import unicodedata
from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.agents.sql_converter import db
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_tables(conn) -> list[str]:
    r = conn.execute(
        text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'")
    )
    return [row[0] for row in r]


def _get_cols(conn, table: str) -> list[str]:
    """Fetch column names via a zero-row query — avoids information_schema permissions."""
    r = conn.execute(text(f'SELECT * FROM "{table}" LIMIT 0'))
    return list(r.keys())


def _find_table(tables: list[str], *keywords: str) -> str | None:
    for kw in keywords:
        for t in tables:
            if kw.lower() in t.lower():
                return t
    return None


def _strip_accents(s: str) -> str:
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    )


def _find_col(cols: list[str], *keywords: str) -> str | None:
    """Find the first column whose name contains any keyword.
    Comparison is accent-insensitive so 'ictim' matches 'víctimes'."""
    for kw in keywords:
        kw_norm = _strip_accents(kw).lower()
        for c in cols:
            if kw_norm in _strip_accents(c).lower():
                return c
    return None


def _q(col: str) -> str:
    """Double-quote a column name for safe use in SQL."""
    return f'"{col}"'


def _safe_sum(col: str) -> str:
    """SUM with text→numeric cast so it works whether the column is stored as
    integer, float, or varchar (Supabase sometimes infers text for CSV imports)."""
    return (
        f"SUM(CASE WHEN {_q(col)}::text ~ '^[0-9]+(\\.[0-9]+)?$' "
        f"THEN CAST({_q(col)}::text AS NUMERIC) ELSE 0 END)"
    )


# ---------------------------------------------------------------------------
# Debug endpoint — call /data/stats/debug to inspect the live schema
# ---------------------------------------------------------------------------

@router.get("/stats/debug")
async def debug_schema():
    """Returns every public table with its column names. Use to diagnose mismatches."""
    try:
        out: dict = {}
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            for t in tables:
                try:
                    out[t] = _get_cols(conn, t)
                except Exception as e:
                    out[t] = f"ERROR: {e}"
        return out
    except Exception as e:
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

@router.get("/stats/overview")
async def overview_stats():
    """Aggregated KPIs across all four datasets. Each category is wrapped in its
    own try/except so a failure in one section never kills the whole response."""
    result: dict = {"tables": {}, "errors": {}}

    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)

            penal_t    = _find_table(tables, "penal", "detencion")
            airport_t  = _find_table(tables, "aeroport")
            hate_t     = _find_table(tables, "odi", "discrimin")
            transport_t = _find_table(tables, "transport")

            result["tables"] = {
                "penal": penal_t,
                "airports": airport_t,
                "hate_crimes": hate_t,
                "transport": transport_t,
            }

            # ── Penal ──────────────────────────────────────────────────────
            if penal_t:
                try:
                    cols = _get_cols(conn, penal_t)
                    kc = _find_col(cols, "coneg")
                    rc = _find_col(cols, "resolt")
                    ac = _find_col(cols, "detenc")
                    if kc and rc and ac:
                        row = conn.execute(text(
                            f'SELECT {_safe_sum(kc)}, {_safe_sum(rc)}, {_safe_sum(ac)}'
                            f' FROM "{penal_t}"'
                        )).fetchone()
                        result["penal"] = {
                            "total_known":    int(row[0] or 0),
                            "total_resolved": int(row[1] or 0),
                            "total_arrests":  int(row[2] or 0),
                        }
                    else:
                        result["errors"]["penal"] = f"Columns not found (known={kc}, resolved={rc}, arrests={ac})"
                except Exception as e:
                    logger.error("Penal overview: %s", e)
                    result["errors"]["penal"] = str(e)

            # ── Airports ───────────────────────────────────────────────────
            if airport_t:
                try:
                    cols = _get_cols(conn, airport_t)
                    nc = _find_col(cols, "nombre", "nomb")
                    if nc:
                        val = conn.execute(text(
                            f'SELECT {_safe_sum(nc)} FROM "{airport_t}"'
                        )).scalar()
                        result["airports"] = {"total": int(val or 0)}
                    else:
                        result["errors"]["airports"] = f"'Nombre' column not found in {airport_t}"
                except Exception as e:
                    logger.error("Airport overview: %s", e)
                    result["errors"]["airports"] = str(e)

            # ── Hate crimes ────────────────────────────────────────────────
            if hate_t:
                try:
                    cols = _get_cols(conn, hate_t)
                    ic = _find_col(cols, "nombre fets", "infraccions", "fets o")
                    vc = _find_col(cols, "ictim")
                    if ic:
                        victim_sel = f", {_safe_sum(vc)}" if vc else ", 0"
                        row = conn.execute(text(
                            f'SELECT {_safe_sum(ic)}{victim_sel} FROM "{hate_t}"'
                        )).fetchone()
                        result["hate_crimes"] = {
                            "total_incidents": int(row[0] or 0),
                            "total_victims":   int(row[1] or 0),
                        }
                    else:
                        result["errors"]["hate_crimes"] = f"Incidents column not found in {hate_t}"
                except Exception as e:
                    logger.error("Hate crimes overview: %s", e)
                    result["errors"]["hate_crimes"] = str(e)

            # ── Transport ──────────────────────────────────────────────────
            if transport_t:
                try:
                    cols = _get_cols(conn, transport_t)
                    mode_kws = ["autob", "metro", "taxi", "tren"]
                    parts = []
                    for kw in mode_kws:
                        c = _find_col(cols, kw)
                        if c:
                            parts.append(
                                f"CASE WHEN {_q(c)}::text ~ '^[0-9]+(\\.[0-9]+)?$'"
                                f" THEN CAST({_q(c)}::text AS NUMERIC) ELSE 0 END"
                            )
                    if parts:
                        val = conn.execute(text(
                            f'SELECT SUM({" + ".join(parts)}) FROM "{transport_t}"'
                        )).scalar()
                        result["transport"] = {"total": int(val or 0)}
                    else:
                        result["errors"]["transport"] = f"No mode columns found in {transport_t}. Cols: {cols}"
                except Exception as e:
                    logger.error("Transport overview: %s", e)
                    result["errors"]["transport"] = str(e)

    except Exception as e:
        logger.error("Overview connection error: %s", e)
        raise HTTPException(500, str(e))

    return result


# ---------------------------------------------------------------------------
# Penal
# ---------------------------------------------------------------------------

@router.get("/stats/penal")
async def penal_stats():
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table = _find_table(tables, "penal", "detencion")
            if not table:
                raise HTTPException(404, "Penal table not found")

            cols = _get_cols(conn, table)
            yc = _find_col(cols, "any")
            kc = _find_col(cols, "coneg")
            rc = _find_col(cols, "resolt")
            ac = _find_col(cols, "detenc")
            tc = _find_col(cols, "tipus de fet", "tipus")

            trend: list = []
            if yc and kc and rc and ac:
                r = conn.execute(text(
                    f'SELECT {_q(yc)}, {_safe_sum(kc)}, {_safe_sum(rc)}, {_safe_sum(ac)}'
                    f' FROM "{table}" GROUP BY {_q(yc)} ORDER BY {_q(yc)}'
                ))
                trend = [
                    {"year": str(row[0]), "known": int(row[1] or 0),
                     "resolved": int(row[2] or 0), "arrests": int(row[3] or 0)}
                    for row in r
                ]

            top_crimes: list = []
            if tc and kc:
                r = conn.execute(text(
                    f'SELECT {_q(tc)}, {_safe_sum(kc)} AS total'
                    f' FROM "{table}" GROUP BY {_q(tc)} ORDER BY total DESC LIMIT 10'
                ))
                top_crimes = [{"type": str(row[0]), "total": int(row[1] or 0)} for row in r]

            return {"trend": trend, "top_crimes": top_crimes}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Penal stats: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Airports
# ---------------------------------------------------------------------------

@router.get("/stats/airports")
async def airport_stats():
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table = _find_table(tables, "aeroport")
            if not table:
                raise HTTPException(404, "Airport table not found")

            cols = _get_cols(conn, table)
            yc = _find_col(cols, "any")
            ac = _find_col(cols, "aeroport")
            tc = _find_col(cols, "tipus de fet", "tipus")
            nc = _find_col(cols, "nombre", "nomb")

            trend: list = []
            if yc and nc:
                r = conn.execute(text(
                    f'SELECT {_q(yc)}, {_safe_sum(nc)}'
                    f' FROM "{table}" GROUP BY {_q(yc)} ORDER BY {_q(yc)}'
                ))
                trend = [{"year": str(row[0]), "total": int(row[1] or 0)} for row in r]

            by_airport: list = []
            if ac and nc:
                r = conn.execute(text(
                    f'SELECT {_q(ac)}, {_safe_sum(nc)} AS total'
                    f' FROM "{table}" GROUP BY {_q(ac)} ORDER BY total DESC'
                ))
                by_airport = [{"airport": str(row[0]), "total": int(row[1] or 0)} for row in r]

            by_type: list = []
            if tc and nc:
                r = conn.execute(text(
                    f'SELECT {_q(tc)}, {_safe_sum(nc)} AS total'
                    f' FROM "{table}" GROUP BY {_q(tc)} ORDER BY total DESC LIMIT 10'
                ))
                by_type = [{"type": str(row[0]), "total": int(row[1] or 0)} for row in r]

            return {"trend": trend, "by_airport": by_airport, "by_type": by_type}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Airport stats: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Hate crimes
# ---------------------------------------------------------------------------

@router.get("/stats/hate-crimes")
async def hate_crimes_stats():
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table = _find_table(tables, "odi", "discrimin")
            if not table:
                raise HTTPException(404, "Hate crimes table not found")

            cols = _get_cols(conn, table)
            yc  = _find_col(cols, "any")
            ic  = _find_col(cols, "nombre fets", "infraccions", "fets o")
            vc  = _find_col(cols, "ictim")
            cc  = _find_col(cols, "canal")
            sc  = _find_col(cols, "mbit fet", "mbit")

            trend: list = []
            if yc and ic:
                victim_sel = f", {_safe_sum(vc)}" if vc else ", 0"
                r = conn.execute(text(
                    f'SELECT {_q(yc)}, {_safe_sum(ic)}{victim_sel}'
                    f' FROM "{table}" GROUP BY {_q(yc)} ORDER BY {_q(yc)}'
                ))
                trend = [
                    {"year": str(row[0]), "incidents": int(row[1] or 0), "victims": int(row[2] or 0)}
                    for row in r
                ]

            by_channel: list = []
            if cc and ic:
                r = conn.execute(text(
                    f'SELECT {_q(cc)}, {_safe_sum(ic)} AS total'
                    f' FROM "{table}" GROUP BY {_q(cc)} ORDER BY total DESC'
                ))
                by_channel = [{"channel": str(row[0]), "total": int(row[1] or 0)} for row in r]

            by_scope: list = []
            if sc and ic:
                r = conn.execute(text(
                    f'SELECT {_q(sc)}, {_safe_sum(ic)} AS total'
                    f' FROM "{table}" GROUP BY {_q(sc)} ORDER BY total DESC LIMIT 10'
                ))
                by_scope = [{"scope": str(row[0]), "total": int(row[1] or 0)} for row in r]

            return {"trend": trend, "by_channel": by_channel, "by_scope": by_scope}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Hate crimes stats: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Hate crimes — geographic map aggregation
# ---------------------------------------------------------------------------

@router.get("/stats/hate-crimes/map")
async def hate_crimes_map(granularity: str = "comarca"):
    if granularity not in {"provincia", "comarca"}:
        raise HTTPException(400, "granularity must be 'provincia' or 'comarca'")

    geo_keywords: dict[str, list[str]] = {
        "provincia": ["provincia"],
        "comarca":   ["comarca"],
    }

    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table = _find_table(tables, "odi", "discrimin")
            if not table:
                raise HTTPException(404, "Hate crimes table not found")

            cols = _get_cols(conn, table)
            ic = _find_col(cols, "nombre fets", "infraccions", "fets o")
            vc = _find_col(cols, "ictim")
            gc = _find_col(cols, *geo_keywords[granularity])

            if not gc:
                raise HTTPException(
                    422,
                    f"No column found for granularity '{granularity}'. Available columns: {cols}"
                )
            if not ic:
                raise HTTPException(422, "Incidents column not found")

            victim_sel = f", {_safe_sum(vc)}" if vc else ", 0"
            r = conn.execute(text(
                f'SELECT {_q(gc)}, {_safe_sum(ic)}{victim_sel}'
                f' FROM "{table}"'
                f' WHERE {_q(gc)} IS NOT NULL AND {_q(gc)}::text <> \'\''
                f' GROUP BY {_q(gc)}'
                f' ORDER BY 2 DESC'
            ))
            regions = [
                {"name": str(row[0]), "incidents": int(row[1] or 0), "victims": int(row[2] or 0)}
                for row in r
            ]
            return {"regions": regions, "granularity": granularity}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Hate crimes map: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Penal offenses — geographic map aggregation with optional filters
# ---------------------------------------------------------------------------

@router.get("/stats/penal/map")
async def penal_map(
    year:       str | None = None,
    month:      str | None = None,
    crime_type: str | None = None,
):
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table  = _find_table(tables, "penal", "detencion")
            if not table:
                raise HTTPException(404, "Penal table not found")

            cols = _get_cols(conn, table)
            rp_col = _find_col(cols, "policial")      # Regió Policial (RP)
            yc     = _find_col(cols, "any")
            mc     = _find_col(cols, "nom mes")        # Nom mes (text name)
            mes_nc = _find_col(cols, "mes")            # Mes (numeric, for ordering)
            tc     = _find_col(cols, "tipus de fet", "tipus")
            kc     = _find_col(cols, "coneg")
            resc   = _find_col(cols, "resolt")
            ac     = _find_col(cols, "detenc")

            if not rp_col:
                raise HTTPException(422, f"Regió Policial column not found. Cols: {cols}")

            # ── Filter options (always full set, independent of active filters) ──
            years: list[str] = []
            if yc:
                r = conn.execute(text(
                    f'SELECT DISTINCT {_q(yc)} FROM "{table}"'
                    f' WHERE {_q(yc)} IS NOT NULL ORDER BY {_q(yc)}'
                ))
                years = [str(row[0]) for row in r]

            months: list[dict] = []
            if mc and mes_nc:
                r = conn.execute(text(
                    f'SELECT DISTINCT {_q(mes_nc)}, {_q(mc)} FROM "{table}"'
                    f' WHERE {_q(mc)} IS NOT NULL AND {_q(mc)}::text <> \'\''
                    f' ORDER BY {_q(mes_nc)}::integer'
                ))
                months = [{"num": int(row[0]), "name": str(row[1])} for row in r]
            elif mc:
                r = conn.execute(text(
                    f'SELECT DISTINCT {_q(mc)} FROM "{table}"'
                    f' WHERE {_q(mc)} IS NOT NULL ORDER BY {_q(mc)}'
                ))
                months = [{"num": 0, "name": str(row[0])} for row in r]

            crime_types: list[str] = []
            if tc:
                r = conn.execute(text(
                    f'SELECT DISTINCT {_q(tc)} FROM "{table}"'
                    f' WHERE {_q(tc)} IS NOT NULL AND {_q(tc)}::text <> \'\''
                    f' ORDER BY {_q(tc)}'
                ))
                crime_types = [str(row[0]) for row in r]

            # ── WHERE clause for map aggregation ─────────────────────────
            where_parts = [
                f"TRIM({_q(rp_col)}::text) IS NOT NULL",
                f"TRIM({_q(rp_col)}::text) <> ''",
                f"LOWER(TRIM({_q(rp_col)}::text)) NOT LIKE '%virtual%'",
            ]
            params: dict = {}

            if year and yc:
                where_parts.append(f"{_q(yc)}::text = :year")
                params["year"] = year
            if month and mc:
                where_parts.append(f"LOWER({_q(mc)}::text) = LOWER(:month)")
                params["month"] = month
            if crime_type and tc:
                where_parts.append(f"{_q(tc)}::text = :crime_type")
                params["crime_type"] = crime_type

            where = " AND ".join(where_parts)

            # ── Map aggregation ───────────────────────────────────────────
            regions: list = []
            if kc and resc and ac:
                r = conn.execute(
                    text(
                        f'SELECT TRIM({_q(rp_col)}::text),'
                        f'  {_safe_sum(kc)}, {_safe_sum(resc)}, {_safe_sum(ac)}'
                        f' FROM "{table}"'
                        f' WHERE {where}'
                        f' GROUP BY TRIM({_q(rp_col)}::text)'
                        f' ORDER BY 2 DESC'
                    ),
                    params,
                )
                regions = [
                    {
                        "name":     str(row[0]),
                        "known":    int(row[1] or 0),
                        "resolved": int(row[2] or 0),
                        "arrests":  int(row[3] or 0),
                    }
                    for row in r
                ]

            return {
                "regions": regions,
                "filter_options": {
                    "years":       years,
                    "months":      months,
                    "crime_types": crime_types,
                },
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Penal map: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Transport — geographic map aggregation with optional year filter
# ---------------------------------------------------------------------------

@router.get("/stats/transport/map")
async def transport_map(year: str | None = None):
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table  = _find_table(tables, "transport")
            if not table:
                raise HTTPException(404, "Transport table not found")

            cols   = _get_cols(conn, table)
            rp_col = _find_col(cols, "policial")
            yc     = _find_col(cols, "any")
            bus_c  = _find_col(cols, "autob")
            met_c  = _find_col(cols, "metro")
            tax_c  = _find_col(cols, "taxi")
            trn_c  = _find_col(cols, "tren")

            if not rp_col:
                raise HTTPException(422, f"Regió Policial column not found. Cols: {cols}")

            # ── Filter options ────────────────────────────────────────────
            years: list[str] = []
            if yc:
                r = conn.execute(text(
                    f'SELECT DISTINCT {_q(yc)} FROM "{table}"'
                    f' WHERE {_q(yc)} IS NOT NULL ORDER BY {_q(yc)}'
                ))
                years = [str(row[0]) for row in r]

            # ── WHERE clause ──────────────────────────────────────────────
            where_parts = [
                f"TRIM({_q(rp_col)}::text) IS NOT NULL",
                f"TRIM({_q(rp_col)}::text) <> ''",
            ]
            params: dict = {}
            if year and yc:
                where_parts.append(f"{_q(yc)}::text = :year")
                params["year"] = year
            where = " AND ".join(where_parts)

            # ── Aggregation ───────────────────────────────────────────────
            mode_cols = {
                "bus":   bus_c,
                "metro": met_c,
                "taxi":  tax_c,
                "train": trn_c,
            }
            present = {k: v for k, v in mode_cols.items() if v}

            regions: list = []
            if present:
                sel_parts = [f"TRIM({_q(rp_col)}::text)"] + [
                    f"{_safe_sum(v)} AS {k}" for k, v in present.items()
                ]
                r = conn.execute(
                    text(
                        f'SELECT {", ".join(sel_parts)}'
                        f' FROM "{table}"'
                        f' WHERE {where}'
                        f' GROUP BY TRIM({_q(rp_col)}::text)'
                        f' ORDER BY 2 DESC'
                    ),
                    params,
                )
                for row in r:
                    entry: dict = {"name": str(row[0])}
                    total = 0
                    for i, k in enumerate(present.keys()):
                        val = int(row[i + 1] or 0)
                        entry[k] = val
                        total += val
                    # Fill any missing modes with 0
                    for k in mode_cols:
                        entry.setdefault(k, 0)
                    entry["total"] = total
                    regions.append(entry)

            return {
                "regions": regions,
                "filter_options": {"years": years},
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transport map: %s", e)
        raise HTTPException(500, str(e))


# ---------------------------------------------------------------------------
# Transport
# ---------------------------------------------------------------------------

@router.get("/stats/transport")
async def transport_stats():
    try:
        with db._engine.connect() as conn:
            tables = _get_tables(conn)
            table = _find_table(tables, "transport")
            if not table:
                raise HTTPException(404, "Transport table not found")

            cols = _get_cols(conn, table)
            yc = _find_col(cols, "any")

            mode_map = {
                "bus":   _find_col(cols, "autob"),
                "metro": _find_col(cols, "metro"),
                "taxi":  _find_col(cols, "taxi"),
                "train": _find_col(cols, "tren"),
            }
            active_modes = {k: v for k, v in mode_map.items() if v}

            trend: list = []
            if yc and active_modes:
                cast_parts = [
                    f"SUM(CASE WHEN {_q(v)}::text ~ '^[0-9]+(\\.[0-9]+)?$'"
                    f" THEN CAST({_q(v)}::text AS NUMERIC) ELSE 0 END) AS {k}"
                    for k, v in active_modes.items()
                ]
                r = conn.execute(text(
                    f'SELECT {_q(yc)}, {", ".join(cast_parts)}'
                    f' FROM "{table}" GROUP BY {_q(yc)} ORDER BY {_q(yc)}'
                ))
                for row in r:
                    entry: dict = {"year": str(row[0])}
                    for i, k in enumerate(active_modes.keys()):
                        entry[k] = int(row[i + 1] or 0)
                    trend.append(entry)

            by_mode: list = []
            labels = {"bus": "Autobús", "metro": "Metro", "taxi": "Taxi", "train": "Tren"}
            for mk, col in active_modes.items():
                val = conn.execute(text(
                    f"SELECT SUM(CASE WHEN {_q(col)}::text ~ '^[0-9]+(\\.[0-9]+)?$'"
                    f" THEN CAST({_q(col)}::text AS NUMERIC) ELSE 0 END)"
                    f' FROM "{table}"'
                )).scalar()
                by_mode.append({"mode": labels[mk], "total": int(val or 0)})

            return {"trend": trend, "by_mode": by_mode}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Transport stats: %s", e)
        raise HTTPException(500, str(e))
