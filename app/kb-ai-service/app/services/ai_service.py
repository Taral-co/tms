import json
import logging
from typing import Dict, List, Optional

import httpx

from app.core.config import settings
from app.models import AnswerResponse, QuestionRequest, KBSearchResult

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered question answering and content generation."""
    
    def __init__(self):
        self.ollama_url = settings.OLLAMA_URL
        self.model_name = settings.LLM_MODEL
        self.http_client: Optional[httpx.AsyncClient] = None
        
    async def initialize(self) -> None:
        """Initialize the AI service."""
        try:
            self.http_client = httpx.AsyncClient(timeout=60.0)
            
            # Check if Ollama is available and model is loaded
            await self._ensure_model_loaded()
            
            logger.info("AI service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize AI service: {e}")
            raise
    
    async def cleanup(self) -> None:
        """Cleanup resources."""
        if self.http_client:
            await self.http_client.aclose()
            self.http_client = None
    
    async def _ensure_model_loaded(self) -> None:
        """Ensure the LLM model is loaded in Ollama."""
        try:
            # Check if model is available
            response = await self.http_client.get(f"{self.ollama_url}/api/tags")
            response.raise_for_status()
            
            models = response.json().get("models", [])
            model_names = [model["name"] for model in models]
            
            if self.model_name not in model_names:
                logger.warning(f"Model {self.model_name} not found. Attempting to pull...")
                await self._pull_model()
            
        except Exception as e:
            logger.error(f"Failed to check/load model: {e}")
            # Don't raise here - allow service to start without AI capabilities
    
    async def _pull_model(self) -> None:
        """Pull the LLM model if not available."""
        try:
            payload = {"name": self.model_name}
            response = await self.http_client.post(
                f"{self.ollama_url}/api/pull",
                json=payload
            )
            response.raise_for_status()
            logger.info(f"Successfully pulled model: {self.model_name}")
        except Exception as e:
            logger.error(f"Failed to pull model: {e}")
    
    async def answer_question(
        self, 
        question: str, 
        context_articles: List[KBSearchResult],
        additional_context: Optional[str] = None
    ) -> AnswerResponse:
        """Answer a question using AI with knowledge base context."""
        try:
            # Build context from articles
            context = self._build_context(context_articles, additional_context)
            
            # Create prompt
            prompt = self._create_answer_prompt(question, context)
            
            # Get AI response
            ai_response = await self._generate_response(prompt)
            
            # Parse and validate response
            answer = self._parse_answer_response(ai_response, question, context_articles)
            
            return answer
            
        except Exception as e:
            logger.error(f"Failed to answer question: {e}")
            # Return fallback response
            return AnswerResponse(
                question=question,
                answer="I'm sorry, I couldn't process your question at the moment. Please try again later.",
                confidence=0.0,
                sources=context_articles,
                has_answer=False,
                suggestions=[],
                reasoning="AI service error"
            )
    
    async def generate_article_summary(self, title: str, content: str) -> str:
        """Generate a summary for a knowledge base article."""
        try:
            prompt = self._create_summary_prompt(title, content)
            response = await self._generate_response(prompt)
            
            # Extract summary from response
            summary = response.strip()
            if summary.startswith("Summary:"):
                summary = summary[8:].strip()
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            # Return fallback summary
            return content[:200] + "..." if len(content) > 200 else content
    
    async def suggest_keywords(self, title: str, content: str) -> List[str]:
        """Suggest keywords for a knowledge base article."""
        try:
            prompt = self._create_keywords_prompt(title, content)
            response = await self._generate_response(prompt)
            
            # Parse keywords from response
            keywords = self._parse_keywords_response(response)
            
            return keywords
            
        except Exception as e:
            logger.error(f"Failed to suggest keywords: {e}")
            return []
    
    async def improve_content(self, content: str, feedback: str) -> str:
        """Improve content based on feedback."""
        try:
            prompt = self._create_improvement_prompt(content, feedback)
            response = await self._generate_response(prompt)
            
            return response.strip()
            
        except Exception as e:
            logger.error(f"Failed to improve content: {e}")
            return content
    
    async def _generate_response(self, prompt: str) -> str:
        """Generate response from Ollama."""
        try:
            payload = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": settings.AI_TEMPERATURE,
                    "num_predict": settings.AI_MAX_TOKENS,
                }
            }
            
            response = await self.http_client.post(
                f"{self.ollama_url}/api/generate",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result.get("response", "")
            
        except Exception as e:
            logger.error(f"Failed to generate AI response: {e}")
            raise
    
    def _build_context(
        self, 
        articles: List[KBSearchResult], 
        additional_context: Optional[str] = None
    ) -> str:
        """Build context string from knowledge base articles."""
        context_parts = []
        
        if additional_context:
            context_parts.append(f"Additional Context:\n{additional_context}\n")
        
        if articles:
            context_parts.append("Relevant Knowledge Base Articles:\n")
            for i, article in enumerate(articles[:3], 1):  # Use top 3 articles
                context_parts.append(
                    f"{i}. {article.title}\n{article.content[:500]}...\n"
                )
        
        return "\n".join(context_parts)
    
    def _create_answer_prompt(self, question: str, context: str) -> str:
        """Create prompt for answering questions."""
        return f"""You are a helpful assistant for a customer support knowledge base. 
Use the provided context to answer the user's question accurately and helpfully.

{context}

Question: {question}

Instructions:
- Provide a clear, helpful answer based on the context
- If the context doesn't contain enough information, say so
- Be concise but complete
- Use a friendly, professional tone
- If relevant, reference specific articles or steps

Answer:"""
    
    def _create_summary_prompt(self, title: str, content: str) -> str:
        """Create prompt for generating article summaries."""
        return f"""Create a concise summary of the following knowledge base article.

Title: {title}

Content: {content}

Instructions:
- Create a 1-2 sentence summary
- Capture the main purpose and key information
- Use clear, professional language
- Don't exceed 150 characters

Summary:"""
    
    def _create_keywords_prompt(self, title: str, content: str) -> str:
        """Create prompt for suggesting keywords."""
        return f"""Suggest relevant keywords for the following knowledge base article.

Title: {title}

Content: {content}

Instructions:
- Suggest 5-10 relevant keywords
- Include technical terms, concepts, and searchable phrases
- Separate keywords with commas
- Focus on words users might search for

Keywords:"""
    
    def _create_improvement_prompt(self, content: str, feedback: str) -> str:
        """Create prompt for improving content."""
        return f"""Improve the following knowledge base article content based on the feedback provided.

Current Content:
{content}

Feedback:
{feedback}

Instructions:
- Address the feedback concerns
- Improve clarity and usefulness
- Maintain the same structure and format
- Keep the content accurate and professional

Improved Content:"""
    
    def _parse_answer_response(
        self, 
        ai_response: str, 
        question: str, 
        sources: List[KBSearchResult]
    ) -> AnswerResponse:
        """Parse AI response into structured answer."""
        # Simple confidence calculation based on response quality
        confidence = self._calculate_confidence(ai_response, sources)
        
        has_answer = confidence > 0.3 and len(ai_response.strip()) > 10
        
        # Extract suggestions if answer is not confident
        suggestions = []
        if not has_answer and sources:
            suggestions = [article.title for article in sources[:3]]
        
        return AnswerResponse(
            question=question,
            answer=ai_response.strip(),
            confidence=confidence,
            sources=sources,
            has_answer=has_answer,
            suggestions=suggestions,
            reasoning=f"Based on {len(sources)} knowledge base articles"
        )
    
    def _calculate_confidence(self, response: str, sources: List[KBSearchResult]) -> float:
        """Calculate confidence score for the response."""
        # Simple heuristic-based confidence calculation
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on response length and quality
        if len(response) > 50:
            confidence += 0.1
        if len(response) > 100:
            confidence += 0.1
        
        # Increase confidence if we have good sources
        if sources:
            avg_score = sum(s.score for s in sources) / len(sources)
            confidence += avg_score * 0.3
        
        # Check for uncertainty phrases
        uncertainty_phrases = ["i don't know", "not sure", "unclear", "might be"]
        response_lower = response.lower()
        
        for phrase in uncertainty_phrases:
            if phrase in response_lower:
                confidence -= 0.2
                break
        
        return max(0.0, min(1.0, confidence))
    
    def _parse_keywords_response(self, response: str) -> List[str]:
        """Parse keywords from AI response."""
        # Remove common prefixes
        response = response.strip()
        if response.startswith("Keywords:"):
            response = response[9:].strip()
        
        # Split by commas and clean
        keywords = [kw.strip() for kw in response.split(",")]
        keywords = [kw for kw in keywords if kw and len(kw) > 2]
        
        return keywords[:10]  # Limit to 10 keywords
