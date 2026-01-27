from supabase import create_client, Client
from app.core.config import settings

class SupabaseService:
    def __init__(self):
        try:
            self.client: Client = create_client(
                settings.SUPABASE_URL, 
                settings.SUPABASE_KEY
            )
            print("✅ Supabase client created successfully.")
        except Exception as e:
            print(f"❌ Error creating Supabase client: {e}")
            self.client = None
    
    def get_client(self) -> Client:
        return self.client
    
db_service = SupabaseService()
supabase = db_service.get_client()