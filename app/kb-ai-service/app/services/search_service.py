import logging
from typing import Dict, List, Optional

import httpx
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams

from app.core.config import settings
from app.models import KBSearchRequest, KBSearchResult, SimilarityRequest, SimilarityResult
from app.services.embedding_service import EmbeddingService

logger = logging.getLogger(__name__)


class SearchService:
    """Service for searching and managing knowledge base content."""
    
    def __init__(self):
        self.qdrant_client: Optional[QdrantClient] = None
        self.embedding_service: Optional[EmbeddingService] = None
        self.collection_name = "kb_articles"
        
    async def initialize(self, embedding_service: EmbeddingService) -> None:
        """Initialize the search service."""
        try:
            # Initialize Qdrant client
            self.qdrant_client = QdrantClient(url=settings.QDRANT_URL)
            self.embedding_service = embedding_service
            
            # Create collection if it doesn't exist
            await self._create_collection_if_not_exists()
            
            logger.info("Search service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize search service: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self.qdrant_client:
            self.qdrant_client.close()
            self.qdrant_client = None
    
    async def _create_collection_if_not_exists(self) -> None:
        """Create Qdrant collection if it doesn't exist."""
        try:
            collections = self.qdrant_client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=settings.EMBEDDING_DIMENSION,
                        distance=Distance.COSINE
                    )
                )
                logger.info(f"Created Qdrant collection: {self.collection_name}")
        except Exception as e:
            logger.error(f"Failed to create collection: {e}")
            raise
    
    async def index_article(self, article_id: str, title: str, content: str, metadata: Dict) -> None:
        """Index an article in the vector database."""
        try:
            # Generate embedding for the combined title and content
            text = f"{title}\n\n{content}"
            embedding = self.embedding_service.generate_embedding(text)
            
            # Create point
            point = models.PointStruct(
                id=article_id,
                vector=embedding,
                payload={
                    "title": title,
                    "content": content,
                    **metadata
                }
            )
            
            # Upsert point
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
            
            logger.debug(f"Indexed article: {article_id}")
        except Exception as e:
            logger.error(f"Failed to index article {article_id}: {e}")
            raise
    
    async def delete_article(self, article_id: str) -> None:
        """Delete an article from the vector database."""
        try:
            self.qdrant_client.delete(
                collection_name=self.collection_name,
                points_selector=models.PointIdsList(
                    points=[article_id]
                )
            )
            logger.debug(f"Deleted article: {article_id}")
        except Exception as e:
            logger.error(f"Failed to delete article {article_id}: {e}")
            raise
    
    async def search_similar(self, request: SimilarityRequest) -> List[SimilarityResult]:
        """Search for similar articles using vector similarity."""
        try:
            # Generate embedding for the query
            query_embedding = self.embedding_service.generate_embedding(request.text)
            
            # Build filter conditions
            filter_conditions = self._build_filter_conditions(
                request.tenant_id, request.project_id
            )
            
            # Search in Qdrant
            search_result = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=filter_conditions,
                limit=request.limit,
                score_threshold=request.threshold
            )
            
            # Convert to response format
            results = []
            for point in search_result:
                result = SimilarityResult(
                    id=point.id,
                    title=point.payload["title"],
                    content=point.payload["content"],
                    score=point.score,
                    type="article"
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search similar articles: {e}")
            raise
    
    async def search_articles(self, request: KBSearchRequest) -> List[KBSearchResult]:
        """Search articles using hybrid search (vector + keyword)."""
        try:
            # Generate embedding for the query
            query_embedding = self.embedding_service.generate_embedding(request.query)
            
            # Build filter conditions
            filter_conditions = self._build_filter_conditions(
                request.tenant_id, request.project_id, request
            )
            
            # Search in Qdrant
            search_result = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=filter_conditions,
                limit=request.limit,
                offset=request.offset,
                score_threshold=settings.MIN_SEARCH_SCORE
            )
            
            # Convert to response format
            results = []
            for i, point in enumerate(search_result):
                # Generate snippet
                snippet = self._generate_snippet(
                    point.payload["content"], request.query
                )
                
                result = KBSearchResult(
                    id=point.id,
                    type="article",
                    title=point.payload["title"],
                    content=point.payload["content"],
                    summary=point.payload.get("summary"),
                    score=point.score,
                    rank=request.offset + i + 1,
                    snippet=snippet,
                    tags=point.payload.get("tags", []),
                    keywords=point.payload.get("keywords", []),
                    category_name=point.payload.get("category_name"),
                    author_name=point.payload.get("author_name"),
                    view_count=point.payload.get("view_count", 0),
                    helpful_count=point.payload.get("helpful_count", 0),
                    created_at=point.payload["created_at"],
                    updated_at=point.payload["updated_at"],
                    published_at=point.payload.get("published_at")
                )
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Failed to search articles: {e}")
            raise
    
    def _build_filter_conditions(self, tenant_id: str, project_id: str, request: Optional[KBSearchRequest] = None) -> models.Filter:
        """Build filter conditions for Qdrant search."""
        conditions = [
            models.FieldCondition(
                key="tenant_id",
                match=models.MatchValue(value=str(tenant_id))
            ),
            models.FieldCondition(
                key="project_id", 
                match=models.MatchValue(value=str(project_id))
            )
        ]
        
        if request:
            if request.public_only:
                conditions.append(
                    models.FieldCondition(
                        key="is_public",
                        match=models.MatchValue(value=True)
                    )
                )
            
            if request.status:
                conditions.append(
                    models.FieldCondition(
                        key="status",
                        match=models.MatchAny(any=request.status)
                    )
                )
            
            if request.tags:
                conditions.append(
                    models.FieldCondition(
                        key="tags",
                        match=models.MatchAny(any=request.tags)
                    )
                )
        
        return models.Filter(must=conditions)
    
    def _generate_snippet(self, content: str, query: str, max_length: int = 200) -> str:
        """Generate a snippet highlighting the query in the content."""
        if not content or not query:
            return content[:max_length] + "..." if len(content) > max_length else content
        
        # Simple snippet generation - find query in content
        lower_content = content.lower()
        lower_query = query.lower()
        
        # Find the position of the query
        pos = lower_content.find(lower_query)
        
        if pos == -1:
            # Query not found, return beginning of content
            return content[:max_length] + "..." if len(content) > max_length else content
        
        # Calculate snippet bounds
        start = max(0, pos - max_length // 4)
        end = min(len(content), start + max_length)
        
        snippet = content[start:end]
        
        # Add ellipsis if needed
        if start > 0:
            snippet = "..." + snippet
        if end < len(content):
            snippet = snippet + "..."
        
        return snippet
