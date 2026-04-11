from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from app.agents.sql_agent import db 

router = APIRouter()

@router.get("/tables")
async def get_tables():
    """Retorna la llista de taules disponibles."""
    try:
       
        query = text("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';")
        with db._engine.connect() as connection:
            result = connection.execute(query)
            tables = [row[0] for row in result]
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tables/{table_name}")
async def get_table_data(table_name: str, page: int = 1, page_size: int = 20):
    """Retorna les dades d'una taula paginades."""
    try:
        offset = (page - 1) * page_size
        
        with db._engine.connect() as connection:
            
            count_query = text(f"SELECT COUNT(*) FROM {table_name}")
            total_rows = connection.execute(count_query).scalar()
            
            
            data_query = text(f"SELECT * FROM {table_name} LIMIT :limit OFFSET :offset")
            result = connection.execute(data_query, {"limit": page_size, "offset": offset})
            
            rows = [dict(row._mapping) for row in result]
            
        return {
            "columns": list(rows[0].keys()) if rows else [],
            "data": rows,
            "total": total_rows,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_rows + page_size - 1) // page_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")