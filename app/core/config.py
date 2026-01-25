from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # --- INFO PROJECT ---
    PROJECT_NAME: str = "TFG Portal IA"
    API_V1_STR: str = "/api/v1"

    # --- SUPABASE ---
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # Per a l'Agent SQL necessitarem la Connection String (Postgres)
    # Recorda que al .env l'has de posar així: 
    # DATABASE_URL="postgresql://postgres.[ID]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
    DATABASE_URL: str

    # --- IA (OLLAMA) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    # Configuració de Pydantic per llegir el fitxer .env
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore" # Ignora altres variables que puguis tenir al .env
    )

# Instància global que importarem des de tota l'app
settings = Settings()