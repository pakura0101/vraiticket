from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.core.security   import hash_password
from app.models.user     import User
from app.schemas.user    import UserCreate, UserUpdate


class UserService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: UserCreate) -> User:
        if self.db.query(User).filter(User.email == payload.email).first():
            raise ConflictError(f"Email '{payload.email}' is already registered")
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            phone=payload.phone,
            company_id=payload.company_id,
            job_title=payload.job_title,
            department=payload.department,
            avatar_url=payload.avatar_url,   # ← set photo at creation
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_by_id(self, user_id: int) -> User:
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise NotFoundError("User")
        return user

    def list_users(
        self,
        page: int = 1,
        page_size: int = 20,
        role: str | None = None,
    ) -> tuple[list[User], int]:
        q = self.db.query(User)
        if role:
            q = q.filter(User.role == role)
        total = q.count()
        users = q.offset((page - 1) * page_size).limit(page_size).all()
        return users, total

    def update(self, user_id: int, payload: UserUpdate) -> User:
        user = self.get_by_id(user_id)
        data = payload.model_dump(exclude_unset=True)

        if "password" in data:
            new_pw = data.pop("password")
            if new_pw:
                user.hashed_password = hash_password(new_pw)

        for field, value in data.items():
            setattr(user, field, value)

        self.db.commit()
        self.db.refresh(user)
        return user
