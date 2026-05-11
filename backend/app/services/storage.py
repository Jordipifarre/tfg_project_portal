from supabase import create_client, Client
from app.core.config import settings


def _make_storage_client() -> Client:
    """
    Uses Service Role Key when available (bypasses RLS for private buckets).
    Falls back to anon key — works only if bucket policies allow public read.
    """
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    return create_client(settings.SUPABASE_URL, key)


class StorageService:
    def __init__(self):
        try:
            self.client: Client = _make_storage_client()
            self.bucket: str = settings.SUPABASE_STORAGE_BUCKET
            print(f"✅ Storage client ready. Bucket: '{self.bucket}'")
        except Exception as e:
            print(f"❌ Error creating Storage client: {e}")
            self.client = None
            self.bucket = settings.SUPABASE_STORAGE_BUCKET

    def list_files(self, folder: str = "") -> list[dict]:
        """Lists files inside `folder` (empty string = bucket root)."""
        return self.client.storage.from_(self.bucket).list(folder)

    def get_signed_url(self, path: str, expires_in: int = 3600) -> str:
        """Returns a temporary signed URL for private file access."""
        response = self.client.storage.from_(self.bucket).create_signed_url(
            path, expires_in
        )
        return response["signedURL"]

    def get_public_url(self, path: str) -> str:
        """Returns the public URL — only works if bucket is public."""
        return self.client.storage.from_(self.bucket).get_public_url(path)

    def download(self, path: str) -> bytes:
        """Downloads and returns raw file bytes."""
        return self.client.storage.from_(self.bucket).download(path)


storage_service = StorageService()
