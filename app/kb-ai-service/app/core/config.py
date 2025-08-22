import os
from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # Server settings
    PORT: int = int(os.getenv("PORT", "8081"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Database settings
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_NAME: str = os.getenv("DB_NAME", "tms")
    DB_USER: str = os.getenv("DB_USER", "tms")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "tms123")
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
    
    # Redis settings
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    
    # Elasticsearch settings
    ELASTICSEARCH_URL: str = os.getenv("ELASTICSEARCH_URL", "http://localhost:9200")
    
    # Ollama settings
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    
    # Qdrant settings
    QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    
    # AI model settings
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-minilm-l6-v2")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama2:7b")
    
    # CORS settings
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:8080",
    ]
    
    # Cache settings
    CACHE_TTL: int = int(os.getenv("CACHE_TTL", "3600"))  # 1 hour
    
    # Embeddings settings
    EMBEDDING_DIMENSION: int = 384  # all-minilm-l6-v2 dimension
    MAX_CONTENT_LENGTH: int = 8000
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50
    
    # Search settings
    MAX_SEARCH_RESULTS: int = 50
    MIN_SEARCH_SCORE: float = 0.1
    
    # AI settings
    MAX_CONTEXT_LENGTH: int = 4000
    AI_TEMPERATURE: float = 0.7
    AI_MAX_TOKENS: int = 500

    class Config:
        env_file = ".env"


settings = Settings()
