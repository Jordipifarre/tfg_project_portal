from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from app.services.storage import storage_service

router = APIRouter()


@router.get("/files")
def list_files(folder: str = Query(default="", description="Subcarpeta dins del bucket")):
    """Lists files inside the configured bucket (or a subfolder)."""
    try:
        files = storage_service.list_files(folder)
        return {
            "bucket": storage_service.bucket,
            "folder": folder or "/",
            "count": len(files),
            "files": files,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signed-url")
def get_signed_url(
    path: str = Query(..., description="Ruta del fitxer dins del bucket, p.ex. 'subdir/doc.pdf'"),
    expires_in: int = Query(default=3600, description="Validesa de l'URL en segons"),
):
    """Returns a temporary signed URL to access a private file."""
    try:
        url = storage_service.get_signed_url(path, expires_in)
        return {"signed_url": url, "expires_in_seconds": expires_in}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download")
def download_file(path: str = Query(..., description="Ruta del fitxer dins del bucket")):
    """Downloads a file and streams it as application/octet-stream."""
    try:
        data = storage_service.download(path)
        filename = path.split("/")[-1]
        return Response(
            content=data,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
