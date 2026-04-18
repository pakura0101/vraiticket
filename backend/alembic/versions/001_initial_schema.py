"""Initial schema — creates all tables from scratch

Revision ID: 001
Revises: None
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa

# ── Revision identifiers ───────────────────────────────────────────────────────
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── ENUM types ─────────────────────────────────────────────────────────────
    user_role = sa.Enum("client", "agent", "admin", name="userrole")
    ticket_status = sa.Enum(
        "NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD",
        "RESOLVED", "CLOSED", "ESCALATED", "CANCELLED",
        name="ticketstatus",
    )
    ticket_priority = sa.Enum("LOW", "MEDIUM", "HIGH", name="ticketpriority")
    ticket_type = sa.Enum("standard", "internal", name="tickettype")
    log_action = sa.Enum(
        "CREATED", "STATUS_CHANGED", "ASSIGNED", "PRIORITY_CHANGED",
        "CATEGORY_CHANGED", "COMMENT_ADDED", "ESCALATED", "RESOLVED",
        "CLOSED", "RATED", "UPDATED",
        name="logaction",
    )

    # ── companies ──────────────────────────────────────────────────────────────
    op.create_table(
        "companies",
        sa.Column("id",          sa.Integer(),     primary_key=True, index=True),
        sa.Column("name",        sa.String(255),   nullable=False, unique=True),
        sa.Column("description", sa.Text(),        nullable=True),
        sa.Column("domain",      sa.String(255),   nullable=True),
        sa.Column("is_active",   sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=False),
    )

    # ── users ──────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",              sa.Integer(),    primary_key=True, index=True),
        sa.Column("email",           sa.String(255),  nullable=False, unique=True, index=True),
        sa.Column("full_name",       sa.String(255),  nullable=False),
        sa.Column("hashed_password", sa.String(255),  nullable=False),
        sa.Column("role",            user_role,       nullable=False, server_default="client"),
        sa.Column("is_active",       sa.Boolean(),    nullable=False, server_default="true"),
        sa.Column("phone",           sa.String(50),   nullable=True),
        sa.Column("avatar_url",      sa.String(500),  nullable=True),
        sa.Column("job_title",       sa.String(255),  nullable=True),
        sa.Column("department",      sa.String(255),  nullable=True),
        sa.Column("company_id",      sa.Integer(),    sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",      sa.DateTime(timezone=True), nullable=False),
    )

    # ── groups ─────────────────────────────────────────────────────────────────
    op.create_table(
        "groups",
        sa.Column("id",          sa.Integer(),   primary_key=True, index=True),
        sa.Column("name",        sa.String(255), nullable=False, unique=True),
        sa.Column("description", sa.Text(),      nullable=True),
        sa.Column("color",       sa.String(7),   nullable=True),
        sa.Column("is_active",   sa.Boolean(),   nullable=False, server_default="true"),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=False),
    )

    # ── group_members (many-to-many) ───────────────────────────────────────────
    op.create_table(
        "group_members",
        sa.Column("group_id", sa.Integer(), sa.ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id",  sa.Integer(), sa.ForeignKey("users.id",  ondelete="CASCADE"), primary_key=True),
    )

    # ── tickets ────────────────────────────────────────────────────────────────
    op.create_table(
        "tickets",
        sa.Column("id",                sa.Integer(),      primary_key=True, index=True),
        sa.Column("title",             sa.String(500),    nullable=False),
        sa.Column("description",       sa.Text(),         nullable=False),
        sa.Column("status",            ticket_status,     nullable=False, server_default="NEW",      index=True),
        sa.Column("priority",          ticket_priority,   nullable=False, server_default="MEDIUM"),
        sa.Column("ticket_type",       ticket_type,       nullable=False, server_default="standard"),
        sa.Column("company_id",        sa.Integer(),      sa.ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("group_id",          sa.Integer(),      sa.ForeignKey("groups.id",   ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_by",        sa.Integer(),      sa.ForeignKey("users.id",    ondelete="RESTRICT"), nullable=False),
        sa.Column("assigned_to",       sa.Integer(),      sa.ForeignKey("users.id",    ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("created_at",        sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",        sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_at",            sa.DateTime(timezone=True), nullable=True),
        sa.Column("first_response_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at",       sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at",      sa.DateTime(timezone=True), nullable=True),
    )

    # ── comments ───────────────────────────────────────────────────────────────
    op.create_table(
        "comments",
        sa.Column("id",          sa.Integer(), primary_key=True, index=True),
        sa.Column("ticket_id",   sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"),  nullable=False, index=True),
        sa.Column("author_id",   sa.Integer(), sa.ForeignKey("users.id",   ondelete="RESTRICT"), nullable=False),
        sa.Column("content",     sa.Text(),    nullable=False),
        sa.Column("is_internal", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",  sa.DateTime(timezone=True), nullable=False),
    )

    # ── ticket_logs ────────────────────────────────────────────────────────────
    op.create_table(
        "ticket_logs",
        sa.Column("id",          sa.Integer(),   primary_key=True, index=True),
        sa.Column("ticket_id",   sa.Integer(),   sa.ForeignKey("tickets.id", ondelete="CASCADE"),  nullable=False, index=True),
        sa.Column("actor_id",    sa.Integer(),   sa.ForeignKey("users.id",   ondelete="SET NULL"),  nullable=True),
        sa.Column("action",      log_action,     nullable=False),
        sa.Column("description", sa.Text(),      nullable=True),
        sa.Column("old_value",   sa.String(255), nullable=True),
        sa.Column("new_value",   sa.String(255), nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
    )

    # ── ratings ────────────────────────────────────────────────────────────────
    op.create_table(
        "ratings",
        sa.Column("id",         sa.Integer(), primary_key=True, index=True),
        sa.Column("ticket_id",  sa.Integer(), sa.ForeignKey("tickets.id", ondelete="CASCADE"),  nullable=False, unique=True),
        sa.Column("client_id",  sa.Integer(), sa.ForeignKey("users.id",   ondelete="RESTRICT"), nullable=False),
        sa.Column("agent_id",   sa.Integer(), sa.ForeignKey("users.id",   ondelete="RESTRICT"), nullable=False),
        sa.Column("score",      sa.Integer(), nullable=False),
        sa.Column("feedback",   sa.Text(),    nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("score >= 1 AND score <= 5", name="ck_rating_score_range"),
    )

    # ── attachments ────────────────────────────────────────────────────────────
    op.create_table(
        "attachments",
        sa.Column("id",          sa.Integer(),     primary_key=True, index=True),
        sa.Column("ticket_id",   sa.Integer(),     sa.ForeignKey("tickets.id", ondelete="CASCADE"),  nullable=False, index=True),
        sa.Column("uploader_id", sa.Integer(),     sa.ForeignKey("users.id",   ondelete="RESTRICT"), nullable=False),
        sa.Column("filename",    sa.String(500),   nullable=False),
        sa.Column("stored_path", sa.String(1000),  nullable=False),
        sa.Column("mime_type",   sa.String(127),   nullable=False),
        sa.Column("size_bytes",  sa.Integer(),     nullable=False),
        sa.Column("created_at",  sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("attachments")
    op.drop_table("ratings")
    op.drop_table("ticket_logs")
    op.drop_table("comments")
    op.drop_table("tickets")
    op.drop_table("group_members")
    op.drop_table("groups")
    op.drop_table("users")
    op.drop_table("companies")

    sa.Enum(name="logaction").drop(op.get_bind())
    sa.Enum(name="tickettype").drop(op.get_bind())
    sa.Enum(name="ticketpriority").drop(op.get_bind())
    sa.Enum(name="ticketstatus").drop(op.get_bind())
    sa.Enum(name="userrole").drop(op.get_bind())
