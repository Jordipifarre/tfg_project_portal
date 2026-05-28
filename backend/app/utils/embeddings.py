"""FastEmbed wrapper compatible with LangChain's Embeddings interface.

Uses nomic-ai/nomic-embed-text-v1.5 (768 dimensions) — matches the
vector(768) column in document_chunks. The model is downloaded once
on first use and cached locally by fastembed.
"""

from __future__ import annotations
import logging
import threading

from fastembed import TextEmbedding
from langchain_core.embeddings import Embeddings

logger = logging.getLogger(__name__)

_MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"


class FastEmbeddings(Embeddings):
    """CPU-optimised embeddings via FastEmbed (no Ollama required)."""

    def __init__(self, model_name: str = _MODEL_NAME) -> None:
        self._model_name = model_name
        self._model = None
        self._lock = threading.Lock()

    def _get_model(self):
        if self._model is None:
            with self._lock:
                if self._model is None:
                    logger.info("Loading FastEmbed model '%s' …", self._model_name)
                    self._model = TextEmbedding(model_name=self._model_name)
        return self._model

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        return [list(v) for v in model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        model = self._get_model()
        return list(next(model.embed([text])))
