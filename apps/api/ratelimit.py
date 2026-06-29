"""Open-access cost guard: per-IP per-minute limit + a global daily job cap.

Required because the MVP has no login — without this, one visitor (or a bot)
could run up the GPU/Claude bill. In-memory for the MVP; back it with Redis if
you run more than one API instance.
"""
from __future__ import annotations

import threading
import time

from .config import settings


class RateGuard:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = {}
        self._day_count = 0
        self._day_start = time.time()
        self._lock = threading.Lock()

    def check(self, ip: str) -> tuple[bool, str]:
        now = time.time()
        with self._lock:
            if now - self._day_start > 86_400:
                self._day_start = now
                self._day_count = 0
            if self._day_count >= settings.daily_job_cap:
                return False, "Daily capacity reached — please try again tomorrow."

            window = self._hits.setdefault(ip, [])
            cutoff = now - 60
            window[:] = [t for t in window if t > cutoff]
            if len(window) >= settings.rate_limit_per_min:
                return False, "Too many requests — please slow down a moment."

            window.append(now)
            self._day_count += 1
            return True, ""


guard = RateGuard()
