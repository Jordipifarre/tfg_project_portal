"""FastEmbed wrapper that loads the model from a local directory.

Uses nomic-ai/nomic-embed-text-v1.5 (768 dimensions).
The ONNX model is loaded from settings.EMBEDDING_MODEL_PATH
(expects an onnx/model.onnx file inside that directory) — no network required.

The model is loaded once and kept in memory (singleton in rag_pipeline.py).
"""

from __future__ import annotations
import logging
import threading
import time

from fastembed import TextEmbedding
from langchain_core.embeddings import Embeddings

from app.core.config import settings

logger = logging.getLogger(__name__)

_MODEL_NAME = "nomic-ai/nomic-embed-text-v1.5"


class FastEmbeddings(Embeddings):
    """CPU-optimised embeddings via FastEmbed, loaded from a local ONNX model."""

    def __init__(self, model_path: str | None = None) -> None:
        path = model_path or settings.EMBEDDING_MODEL_PATH
        logger.info("Loading FastEmbed model from local path: %s", path)
        t0 = time.time()
        self._model = TextEmbedding(
            model_name=_MODEL_NAME,
            specific_model_path=path,
        )
        logger.info("FastEmbed model ready in %.1f s", time.time() - t0)
        self._lock = threading.Lock()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        with self._lock:
            return [list(v) for v in self._model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        with self._lock:
            return list(next(self._model.embed([text])))
