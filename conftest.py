"""Root conftest: puts the repo root on sys.path (so `import hermes/apps/services`
work under pytest) and sets generous limits so HTTP tests never hit the cost guard.
The rate-guard logic is tested directly as a unit instead.
"""
import os

os.environ.setdefault("RATE_LIMIT_PER_MIN", "100000")
os.environ.setdefault("DAILY_JOB_CAP", "1000000")
