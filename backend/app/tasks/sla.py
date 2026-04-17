import logging

from app.tasks.celery_app import celery_app
from app.db.base import SessionLocal
from app.services.ticket_service import TicketService

logger = logging.getLogger("vraiticket.tasks.sla")


@celery_app.task(
    name="app.tasks.sla.check_sla_escalations",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def check_sla_escalations(self):
    """
    Periodic Celery task (every 15 min via beat).
    Finds all open tickets past their due_at and escalates them.
    """
    logger.info("SLA check started …")
    db = SessionLocal()
    try:
        count = TicketService(db).escalate_overdue_tickets()
        logger.info("SLA check complete — %d ticket(s) escalated.", count)
        return {"escalated": count}
    except Exception as exc:
        logger.exception("SLA task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
