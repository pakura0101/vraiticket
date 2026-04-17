"""Remove categories table and category_id from tickets

Revision ID: 002_remove_categories
Revises: 001
Create Date: 2026-04-16

Run BEFORE updating the application code (or at the same time).
The column is nullable with ondelete=SET NULL so no data is lost.
"""
from alembic import op
import sqlalchemy as sa

revision = "002_remove_categories"
down_revision = None   # set this to your previous revision id if you have one
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop the FK constraint and column from tickets
    with op.batch_alter_table("tickets") as batch_op:
        # Drop FK first (name may vary by DB; batch_alter handles it automatically)
        batch_op.drop_column("category_id")

    # 2. Drop the categories table
    op.drop_table("categories")


def downgrade() -> None:
    # Recreate the categories table
    op.create_table(
        "categories",
        sa.Column("id",               sa.Integer(),     primary_key=True, autoincrement=True),
        sa.Column("name",             sa.String(255),   nullable=False),
        sa.Column("description",      sa.Text(),        nullable=True),
        sa.Column("default_agent_id", sa.Integer(),     nullable=True),
        sa.Column("sla_hours",        sa.Integer(),     nullable=True),
        sa.Column("is_active",        sa.Boolean(),     nullable=False, server_default="true"),
        sa.Column("created_at",       sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at",       sa.DateTime(timezone=True), nullable=False),
    )
    # Re-add the FK column to tickets
    with op.batch_alter_table("tickets") as batch_op:
        batch_op.add_column(sa.Column("category_id", sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            "fk_tickets_category_id", "categories", ["category_id"], ["id"]
        )
