import asyncio
import logging
import os
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import settings
from app.core.database import init_db
from app.services.ai_service import AIService
from app.services.embedding_service import EmbeddingService
from app.services.search_service import SearchService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management."""
    logger.info("Starting Knowledge Base AI Service...")
    
    # Initialize database
    await init_db()
    
    # Initialize services
    embedding_service = EmbeddingService()
    search_service = SearchService()
    ai_service = AIService()
    
    # Store services in app state
    app.state.embedding_service = embedding_service
    app.state.search_service = search_service
    app.state.ai_service = ai_service
    
    # Initialize embeddings and AI models
    await embedding_service.initialize()
    await ai_service.initialize()
    
    logger.info("Knowledge Base AI Service started successfully")
    
    yield
    
    logger.info("Shutting down Knowledge Base AI Service...")
    
    # Cleanup
    await embedding_service.cleanup()
    await search_service.cleanup()
    await ai_service.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Knowledge Base AI Service",
    description="AI-powered knowledge base for ticket management system",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "kb-ai-service"}


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Knowledge Base AI Service",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info",
    )
