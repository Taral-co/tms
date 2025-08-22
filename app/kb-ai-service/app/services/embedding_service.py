import logging
from typing import List, Optional

import numpy as np
from sentence_transformers import SentenceTransformer

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings."""
    
    def __init__(self):
        self.model: Optional[SentenceTransformer] = None
        self.model_name = settings.EMBEDDING_MODEL
        
    async def initialize(self) -> None:
        """Initialize the embedding model."""
        try:
            logger.info(f"Loading embedding model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self.model:
            del self.model
            self.model = None
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding for a single text."""
        if not self.model:
            raise RuntimeError("Embedding model not initialized")
        
        # Clean and truncate text
        cleaned_text = self._clean_text(text)
        
        # Generate embedding
        embedding = self.model.encode(cleaned_text, convert_to_numpy=True)
        
        return embedding.tolist()
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts."""
        if not self.model:
            raise RuntimeError("Embedding model not initialized")
        
        # Clean and truncate texts
        cleaned_texts = [self._clean_text(text) for text in texts]
        
        # Generate embeddings
        embeddings = self.model.encode(cleaned_texts, convert_to_numpy=True)
        
        return embeddings.tolist()
    
    def compute_similarity(self, embedding1: List[float], embedding2: List[float]) -> float:
        """Compute cosine similarity between two embeddings."""
        vec1 = np.array(embedding1)
        vec2 = np.array(embedding2)
        
        # Compute cosine similarity
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        similarity = dot_product / (norm1 * norm2)
        return float(similarity)
    
    def _clean_text(self, text: str) -> str:
        """Clean and truncate text for embedding."""
        if not text:
            return ""
        
        # Remove extra whitespace
        cleaned = " ".join(text.split())
        
        # Truncate if too long
        if len(cleaned) > settings.MAX_CONTENT_LENGTH:
            cleaned = cleaned[:settings.MAX_CONTENT_LENGTH]
        
        return cleaned
    
    def chunk_text(self, text: str, chunk_size: Optional[int] = None, overlap: Optional[int] = None) -> List[str]:
        """Split text into chunks for embedding."""
        chunk_size = chunk_size or settings.CHUNK_SIZE
        overlap = overlap or settings.CHUNK_OVERLAP
        
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to break at word boundary
            if end < len(text):
                # Find the last space before the end
                last_space = text.rfind(' ', start, end)
                if last_space > start:
                    end = last_space
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            # Move start position with overlap
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
