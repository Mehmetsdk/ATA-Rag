"""Health check utilities."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Awaitable, Callable


@dataclass
class HealthCheckResult:
    name: str
    status: str
    detail: str | None = None


@dataclass
class HealthReport:
    service_name: str
    status: str
    checks: list[HealthCheckResult] = field(default_factory=list)


CheckFn = Callable[[], Awaitable[HealthCheckResult]]


class HealthChecker:
    """Run registered async health checks and aggregate status."""

    def __init__(self, service_name: str) -> None:
        self.service_name = service_name
        self._checks: dict[str, CheckFn] = {}

    def register(self, name: str, check_fn: CheckFn) -> None:
        self._checks[name] = check_fn

    async def run(self) -> HealthReport:
        results: list[HealthCheckResult] = []

        for name, check_fn in self._checks.items():
            try:
                results.append(await check_fn())
            except Exception as exc:  # noqa: BLE001 — health probe must not crash
                results.append(
                    HealthCheckResult(name=name, status="unhealthy", detail=str(exc)),
                )

        overall = "healthy" if all(r.status == "healthy" for r in results) else "unhealthy"
        if not results:
            overall = "healthy"

        return HealthReport(service_name=self.service_name, status=overall, checks=results)


def check_postgres(database_url: str) -> CheckFn:
    """Return an async health check for PostgreSQL."""

    async def _check() -> HealthCheckResult:
        try:
            import asyncpg  # optional dependency
        except ImportError as exc:
            return HealthCheckResult(
                name="postgres",
                status="unhealthy",
                detail=f"asyncpg not installed: {exc}",
            )

        try:
            conn = await asyncpg.connect(database_url, timeout=5)
            try:
                await conn.fetchval("SELECT 1")
            finally:
                await conn.close()
            return HealthCheckResult(name="postgres", status="healthy")
        except Exception as exc:  # noqa: BLE001
            return HealthCheckResult(name="postgres", status="unhealthy", detail=str(exc))

    return _check
