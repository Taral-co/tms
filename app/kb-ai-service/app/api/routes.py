from fastapi import APIRouter

from app.api import search, ai, embeddings

router = APIRouter()

# Include sub-routers
router.include_router(search.router, prefix="/search", tags=["search"])
router.include_router(ai.router, prefix="/ai", tags=["ai"])
router.include_router(embeddings.router, prefix="/embeddings", tags=["embeddings"])
