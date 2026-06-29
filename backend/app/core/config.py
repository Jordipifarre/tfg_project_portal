from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- PROJECT ---
    PROJECT_NAME: str = "TFG Portal IA"
    API_V1_STR: str = "/api/v1"

    # --- SUPABASE ---
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "RAG Docs"

    # --- DATABASE (PostgreSQL / pgvector) ---
    DATABASE_URL: str

    # --- OLLAMA: mode switch ---
    # "local"  → use local Ollama server (default)
    # "cloud"  → use Ollama cloud API
    OLLAMA_MODE: str = "local"

    # --- OLLAMA: local settings ---
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "qwen2.5-coder:3b"
    OLLAMA_ROUTER_MODEL: str = "qwen2.5-coder:7b"
    OLLAMA_SQL_MODEL: str = "qwen2.5-coder:3b"
    OLLAMA_SUMMARIZE_MODEL: str = "qwen2.5:7b"
    OLLAMA_RAG_MODEL: str = "qwen2.5:7b"
    # OLLAMA_EMBED_MODEL kept for backwards-compat; embeddings now use local model
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    
    # --- Embeddings hugging face---
    EMBEDDING_MODEL_PATH: str = r"your path to the local embedding model directory (e.g., onnx/model.onnx)"

    # --- OLLAMA: cloud settings (used when OLLAMA_MODE=cloud) ---
    # "cloud" mode = local Ollama acting as proxy to Ollama cloud.
    # Model names must have the :cloud suffix (pulled via `ollama pull <model>:cloud`).
    # No API key needed here — auth is handled by `ollama signin` on the host machine.
    OLLAMA_CLOUD_BASE_URL: str = "http://localhost:11434"
    OLLAMA_CLOUD_ROUTER_MODEL: str = "ministral-3:14b-cloud"
    OLLAMA_CLOUD_SQL_MODEL: str = "qwen3-coder-next:cloud"
    OLLAMA_CLOUD_SUMMARIZE_MODEL: str = "ministral-3:14b-cloud"
    OLLAMA_CLOUD_RAG_MODEL: str = "deepseek-v4-pro:cloud"

    # --- OLLAMA: direct cloud API (optional, bypasses local Ollama entirely) ---
    # Point OLLAMA_DIRECT_URL to https://ollama.com and set OLLAMA_API_KEY.
    # Only used if you call get_ollama_client() with role="direct".
    OLLAMA_API_KEY: str = ""

    # --- Routing (kept for backwards-compat, no longer used by the agent) ---
    ENABLE_DYNAMIC_ROUTING: bool = True
    ROUTING_MODE: str = "dynamic"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
