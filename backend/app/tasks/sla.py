import logging

from app.tasks.celery_app import celery_app
from app.db.base import SessionLocal
from app.models.user import UserRole
from app.services.ticket_service import TicketService
from app.utils.notifications import notify_ticket_escalated

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
    Finds all open tickets past their due_at, escalates them, and notifies admins.
    """
    logger.info("SLA check started …")
    db = SessionLocal()
    try:
        svc = TicketService(db)
        escalated_tickets = svc.escalate_overdue_tickets_with_details()
        count = len(escalated_tickets)

        # Notify all active admins about each SLA breach
        from app.models.user import User
        admins = db.query(User).filter(
            User.role == UserRole.admin,
            User.is_active,
        ).all()
        for ticket in escalated_tickets:
            for admin in admins:
                notify_ticket_escalated(ticket.id, admin.email)

        logger.info("SLA check complete — %d ticket(s) escalated.", count)
        return {"escalated": count}
    except Exception as exc:
        logger.exception("SLA task failed: %s", exc)
        raise self.retry(exc=exc)
    finally:
        db.close()
