"""
Celery worker entry point.

Run worker:
    celery -A worker.celery_app worker --loglevel=info

Run beat scheduler (SLA periodic task):
    celery -A worker.celery_app beat --loglevel=info

Or both together (dev only):
    celery -A worker.celery_app worker --beat --loglevel=info
"""
from app.tasks.celery_app import celery_app  # noqa: F401 — re-export for CLI
