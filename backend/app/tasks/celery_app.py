from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "vraiticket",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks.sla"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    # ── Beat schedule — run SLA check every 15 minutes ────────────────────
    beat_schedule={
        "sla-escalation-check": {
            "task": "app.tasks.sla.check_sla_escalations",
            "schedule": crontab(minute="*/15"),
        },
    },
)
