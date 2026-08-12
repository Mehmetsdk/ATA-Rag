"""In-memory metrics registry."""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from typing import Any


class MetricsRegistry:
    """Thread-safe counters and duration recorders."""

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._counters: dict[str, int] = defaultdict(int)
        self._durations: dict[str, list[float]] = defaultdict(list)
        self._max_duration_samples = 1000

    def increment(self, name: str, value: int = 1) -> None:
        with self._lock:
            self._counters[name] += value

    def record_duration(self, name: str, duration_ms: float) -> None:
        with self._lock:
            samples = self._durations[name]
            samples.append(duration_ms)
            if len(samples) > self._max_duration_samples:
                del samples[: len(samples) - self._max_duration_samples]

    def snapshot(self) -> dict[str, Any]:
        with self._lock:
            durations_summary: dict[str, dict[str, float | int]] = {}
            for name, samples in self._durations.items():
                if not samples:
                    continue
                durations_summary[name] = {
                    "count": len(samples),
                    "avg_ms": round(sum(samples) / len(samples), 2),
                    "min_ms": round(min(samples), 2),
                    "max_ms": round(max(samples), 2),
                }

            return {
                "counters": dict(self._counters),
                "durations": durations_summary,
                "generated_at": time.time(),
            }

    def reset(self) -> None:
        with self._lock:
            self._counters.clear()
            self._durations.clear()


metrics = MetricsRegistry()
