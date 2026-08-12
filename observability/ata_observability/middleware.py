"""FastAPI/Starlette request duration middleware."""

from __future__ import annotations

import time
from typing import Callable

from ata_observability.logger import get_logger
from ata_observability.metrics import metrics

logger = get_logger(__name__)


class RequestDurationMiddleware:
    """Log request duration and record metrics for each HTTP request."""

    def __init__(self, app: Callable) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Callable, send: Callable) -> None:
        if scope.get("type") != "http":
            await self.app(scope, receive, send)
            return

        start = time.perf_counter()
        method = scope.get("method", "?")
        path = scope.get("path", "?")
        status_code = 500

        async def send_wrapper(message: dict) -> None:
            nonlocal status_code
            if message.get("type") == "http.response.start":
                status_code = message.get("status", 500)
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            duration_ms = (time.perf_counter() - start) * 1000
            metrics.increment("http_requests_total")
            metrics.record_duration("http_request_duration_ms", duration_ms)

            logger.info(
                "request completed",
                extra={
                    "method": method,
                    "path": path,
                    "status_code": status_code,
                    "duration_ms": round(duration_ms, 2),
                },
            )
