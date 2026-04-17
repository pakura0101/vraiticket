# Import all models so Alembic autogenerate discovers them
from app.db.base import Base        # noqa: F401
from app.models import (            # noqa: F401
    user, company, group,
    ticket, comment, ticket_log, rating, attachment,
)
