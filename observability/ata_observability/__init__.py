"""ATA Observability — reusable infrastructure for the RAG backend."""

from ata_observability.health import HealthChecker, check_postgres
from ata_observability.logger import get_logger, log_error
from ata_observability.metrics import metrics
from ata_observability.middleware import RequestDurationMiddleware

__all__ = [
    "HealthChecker",
    "RequestDurationMiddleware",
    "check_postgres",
    "get_logger",
    "log_error",
    "metrics",
]
