import asyncio
from typing import Dict, Any, Optional
from app.core.config import settings

# Async Redis client wrapper with graceful connection check
class RedisClient:
    def __init__(self, url: str):
        self.url = url
        self._client = None

    async def get_client(self):
        if self._client is None:
            try:
                import redis.asyncio as aioredis
                self._client = aioredis.from_url(self.url, encoding="utf-8", decode_responses=True)
            except ImportError:
                return None
        return self._client

    async def health_check(self) -> Dict[str, Any]:
        try:
            client = await self.get_client()
            if not client:
                return {"status": "unavailable", "message": "redis-py not installed"}
            # Quick ping with 1s timeout
            pong = await asyncio.wait_for(client.ping(), timeout=1.0)
            return {"status": "connected" if pong else "unreachable"}
        except Exception as e:
            return {"status": "unavailable", "error": str(e)}

    async def close(self):
        if self._client:
            await self._client.close()


redis_client = RedisClient(settings.REDIS_URL)
