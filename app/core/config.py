from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # --- INFO PROJECT ---
    PROJECT_NAME: str = "TFG Portal IA"
    API_V1_STR: str = "/api/v1"

    # --- SUPABASE ---
    SUPABASE_URL: str
    SUPABASE_KEY: str
    
    # --- DATABASE ---
    DATABASE_URL: str

    # --- IA (OLLAMA) ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:7b"

    # Pydantic Settings Config
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore" 
    )

# Global settings instance
settings = Settings()