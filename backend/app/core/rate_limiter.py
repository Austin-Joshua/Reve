"""
In-memory abuse protection and sliding-window rate limiter for Reve.
Operates with zero external dependencies (no Redis required) for the ₹0 free tier.
Automatically purges expired records to maintain a negligible memory footprint.
"""

import time
import asyncio
from typing import Dict, List, Optional
from collections import defaultdict
from fastapi import Request, HTTPException, status

from app.core.config import settings


class InMemoryRateLimiter:
    def __init__(self):
        # Maps key -> list of request timestamps
        self._records: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()
        self._last_purge = time.time()

    async def is_rate_limited(
        self,
        key: str,
        max_requests: int,
        window_seconds: int,
    ) -> bool:
        """
        Returns True if the request rate for 'key' exceeds max_requests within window_seconds.
        Otherwise records the timestamp and returns False.
        """
        if not settings.ENABLE_RATE_LIMITING:
            return False

        now = time.time()
        cutoff = now - window_seconds

        async with self._lock:
            # Periodic purge every 60 seconds
            if now - self._last_purge > 60:
                self._purge_expired(now)
                self._last_purge = now

            timestamps = self._records[key]
            # Retain only timestamps within the sliding window
            self._records[key] = [t for t in timestamps if t > cutoff]

            if len(self._records[key]) >= max_requests:
                return True

            self._records[key].append(now)
            return False

    def _purge_expired(self, now: float):
        """Purges keys with all timestamps older than 1 hour."""
        cutoff_1h = now - 3600
        keys_to_delete = []
        for k, ts_list in self._records.items():
            valid = [t for t in ts_list if t > cutoff_1h]
            if not valid:
                keys_to_delete.append(k)
            else:
                self._records[k] = valid
        for k in keys_to_delete:
            del self._records[k]

    def reset(self):
        """Resets all records (useful for test isolation)."""
        self._records.clear()


rate_limiter = InMemoryRateLimiter()


def get_client_ip(request: Request) -> str:
    """
    Extracts the client IP address reliably, honoring standard reverse proxy headers
    (CF-Connecting-IP from Cloudflare, X-Forwarded-For from Vercel / Render).
    """
    cf_ip = request.headers.get("CF-Connecting-IP")
    if cf_ip:
        return cf_ip.strip()

    xff = request.headers.get("X-Forwarded-For")
    if xff:
        # Client IP is the first entry in comma-separated chain
        return xff.split(",")[0].strip()

    if request.client and request.client.host:
        return request.client.host

    return "127.0.0.1"


async def enforce_rate_limit(
    request: Request,
    action: str,
    max_requests: int,
    window_seconds: int,
    user_id: Optional[str] = None,
):
    """
    FastAPI dependency/helper that raises HTTP 429 Too Many Requests if rate limit is exceeded.
    """
    client_ip = get_client_ip(request)
    key = f"{action}:{user_id or client_ip}"

    limited = await rate_limiter.is_rate_limited(key, max_requests, window_seconds)
    if limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "RATE_LIMIT_EXCEEDED",
                "message": f"Rate limit exceeded for action '{action}'. Please wait before retrying.",
            },
        )
