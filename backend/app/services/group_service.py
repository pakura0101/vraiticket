from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, NotFoundError
from app.models.group import Group
from app.models.user  import User, UserRole
from app.schemas.group import GroupCreate, GroupUpdate


class GroupService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, payload: GroupCreate) -> Group:
        if self.db.query(Group).filter(Group.name == payload.name).first():
            raise ConflictError(f"Group '{payload.name}' already exists")

        group = Group(
            name=payload.name,
            description=payload.description,
            color=payload.color,
        )
        if payload.member_ids:
            group.members = self._fetch_agents(payload.member_ids)

        self.db.add(group)
        self.db.commit()
        self.db.refresh(group)
        return group

    def get_by_id(self, group_id: int) -> Group:
        g = self.db.query(Group).filter(Group.id == group_id).first()
        if not g:
            raise NotFoundError("Group")
        return g

    def list_groups(self, active_only: bool = True) -> list[Group]:
        q = self.db.query(Group)
        if active_only:
            q = q.filter(Group.is_active == True)
        return q.all()

    def update(self, group_id: int, payload: GroupUpdate) -> Group:
        group = self.get_by_id(group_id)
        data  = payload.model_dump(exclude_unset=True)

        if "member_ids" in data:
            group.members = self._fetch_agents(data.pop("member_ids"))

        for field, value in data.items():
            setattr(group, field, value)

        self.db.commit()
        self.db.refresh(group)
        return group

    def delete(self, group_id: int) -> None:
        group = self.get_by_id(group_id)
        self.db.delete(group)
        self.db.commit()

    # ── helpers ────────────────────────────────────────────────────────────────

    def _fetch_agents(self, ids: list[int]) -> list[User]:
        agents = (
            self.db.query(User)
            .filter(User.id.in_(ids), User.role == UserRole.agent)
            .all()
        )
        return agents
