import logging

logger = logging.getLogger("vraiticket.notifications")


def notify_ticket_created(ticket_id: int, creator_email: str, title: str) -> None:
    logger.info(
        "[EMAIL] → %s | Subject: Ticket #%d created — '%s'",
        creator_email, ticket_id, title,
    )


def notify_ticket_assigned(
    ticket_id: int, agent_email: str, title: str, assigned_by: str
) -> None:
    logger.info(
        "[EMAIL] → %s | Subject: Ticket #%d assigned to you — '%s' (by %s)",
        agent_email, ticket_id, title, assigned_by,
    )


def notify_status_changed(
    ticket_id: int, recipient_email: str, old_status: str, new_status: str
) -> None:
    logger.info(
        "[EMAIL] → %s | Subject: Ticket #%d status changed %s → %s",
        recipient_email, ticket_id, old_status, new_status,
    )


def notify_comment_added(ticket_id: int, recipient_email: str, author_name: str) -> None:
    logger.info(
        "[EMAIL] → %s | Subject: New comment on Ticket #%d by %s",
        recipient_email, ticket_id, author_name,
    )


def notify_ticket_escalated(ticket_id: int, admin_email: str) -> None:
    logger.warning(
        "[EMAIL] → %s | Subject: ⚠ Ticket #%d ESCALATED — SLA breached",
        admin_email, ticket_id,
    )


def notify_ticket_resolved(ticket_id: int, client_email: str, title: str) -> None:
    logger.info(
        "[EMAIL] → %s | Subject: Ticket #%d resolved — '%s' — Please rate your experience",
        client_email, ticket_id, title,
    )
