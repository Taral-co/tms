import asyncpg
import logging
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def init_db() -> None:
    """Initialize database connection pool."""
    global _pool
    
    try:
        _pool = await asyncpg.create_pool(
            settings.DATABASE_URL,
            min_size=5,
            max_size=20,
            command_timeout=60,
        )
        logger.info("Database connection pool initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        raise


async def get_db_pool() -> asyncpg.Pool:
    """Get database connection pool."""
    global _pool
    
    if _pool is None:
        await init_db()
    
    return _pool


async def close_db() -> None:
    """Close database connection pool."""
    global _pool
    
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database connection pool closed")
