"""Factory for ChatOllama instances.

Reads OLLAMA_MODE from settings and returns a configured client for the
requested role ('router' | 'sql' | 'summarize' | 'rag').  In cloud mode
the client points at the Ollama cloud API and includes an Authorization
header; in local mode it points at the local Ollama server.
"""

from __future__ import annotations
import logging

from langchain_ollama import ChatOllama

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_ollama_client(role: str) -> ChatOllama:
    """Return a ChatOllama configured for *role* and the current OLLAMA_MODE."""
    mode = settings.OLLAMA_MODE.strip().lower()

    if mode == "cloud":
        # Cloud mode = local Ollama acting as proxy to Ollama cloud.
        # No Authorization header needed; auth is via `ollama signin` on the host.
        model_map: dict[str, str] = {
            "router": settings.OLLAMA_CLOUD_ROUTER_MODEL,
            "sql": settings.OLLAMA_CLOUD_SQL_MODEL,
            "summarize": settings.OLLAMA_CLOUD_SUMMARIZE_MODEL,
            "rag": settings.OLLAMA_CLOUD_RAG_MODEL,
        }
        model = model_map.get(role, settings.OLLAMA_CLOUD_RAG_MODEL)
        logger.info("Ollama cloud-proxy: role=%s model=%s base_url=%s", role, model, settings.OLLAMA_CLOUD_BASE_URL)
        return ChatOllama(
            base_url=settings.OLLAMA_CLOUD_BASE_URL,
            model=model,
        )

    # local mode
    model_map = {
        "router": settings.OLLAMA_ROUTER_MODEL,
        "sql": settings.OLLAMA_SQL_MODEL,
        "summarize": settings.OLLAMA_SUMMARIZE_MODEL,
        "rag": settings.OLLAMA_RAG_MODEL,
    }
    model = model_map.get(role, settings.OLLAMA_RAG_MODEL)
    logger.info("Ollama local: role=%s model=%s base_url=%s", role, model, settings.OLLAMA_BASE_URL)
    return ChatOllama(
        base_url=settings.OLLAMA_BASE_URL,
        model=model,
    )
