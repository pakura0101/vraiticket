import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def seed_admin(db: Session) -> None:
    """Create the first admin account if it does not exist."""
    existing = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
    if existing:
        return

    admin = User(
        email=settings.FIRST_ADMIN_EMAIL,
        full_name="System Administrator",
        hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
        role=UserRole.admin,
        is_active=True,
    )
    db.add(admin)
    db.commit()
    logger.info("First admin account created: %s", settings.FIRST_ADMIN_EMAIL)
