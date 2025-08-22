from fastapi import APIRouter, HTTPException, Request
from typing import List

from app.models import (
    KBSearchRequest, 
    KBSearchResponse, 
    SimilarityRequest, 
    SimilarityResult
)

router = APIRouter()


@router.post("/articles", response_model=KBSearchResponse)
async def search_articles(request: KBSearchRequest, req: Request):
    """Search knowledge base articles."""
    try:
        search_service = req.app.state.search_service
        results = await search_service.search_articles(request)
        
        # Build response
        max_score = max([r.score for r in results], default=0.0)
        
        return KBSearchResponse(
            results=results,
            total=len(results),  # Note: This is simplified - should get actual total
            query=request.query,
            took=0,  # Should measure actual time
            page=(request.offset // request.limit) + 1,
            per_page=request.limit,
            max_score=max_score
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/similar", response_model=List[SimilarityResult])
async def search_similar(request: SimilarityRequest, req: Request):
    """Find similar articles using vector similarity."""
    try:
        search_service = req.app.state.search_service
        results = await search_service.search_similar(request)
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/{article_id}")
async def index_article(
    article_id: str,
    title: str,
    content: str,
    metadata: dict,
    req: Request
):
    """Index an article in the vector database."""
    try:
        search_service = req.app.state.search_service
        await search_service.index_article(article_id, title, content, metadata)
        return {"message": "Article indexed successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/index/{article_id}")
async def delete_article_index(article_id: str, req: Request):
    """Delete an article from the vector database."""
    try:
        search_service = req.app.state.search_service
        await search_service.delete_article(article_id)
        return {"message": "Article deleted from index"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
