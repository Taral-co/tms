from fastapi import APIRouter, HTTPException, Request
from typing import List

from app.models import EmbeddingRequest, EmbeddingResponse

router = APIRouter()


@router.post("/generate", response_model=EmbeddingResponse)
async def generate_embedding(request: EmbeddingRequest, req: Request):
    """Generate embedding for text."""
    try:
        embedding_service = req.app.state.embedding_service
        
        # Generate embedding
        embedding = embedding_service.generate_embedding(request.text)
        
        return EmbeddingResponse(
            embedding=embedding,
            model=request.model or embedding_service.model_name,
            dimension=len(embedding)
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=List[EmbeddingResponse])
async def generate_batch_embeddings(texts: List[str], model: str = None, req: Request = None):
    """Generate embeddings for multiple texts."""
    try:
        embedding_service = req.app.state.embedding_service
        
        # Generate embeddings
        embeddings = embedding_service.generate_embeddings(texts)
        
        # Build responses
        responses = []
        for embedding in embeddings:
            responses.append(EmbeddingResponse(
                embedding=embedding,
                model=model or embedding_service.model_name,
                dimension=len(embedding)
            ))
        
        return responses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similarity")
async def compute_similarity(embedding1: List[float], embedding2: List[float], req: Request):
    """Compute similarity between two embeddings."""
    try:
        embedding_service = req.app.state.embedding_service
        
        similarity = embedding_service.compute_similarity(embedding1, embedding2)
        
        return {"similarity": similarity}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chunk")
async def chunk_text(text: str, chunk_size: int = None, overlap: int = None, req: Request = None):
    """Split text into chunks for processing."""
    try:
        embedding_service = req.app.state.embedding_service
        
        chunks = embedding_service.chunk_text(text, chunk_size, overlap)
        
        return {"chunks": chunks, "count": len(chunks)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
