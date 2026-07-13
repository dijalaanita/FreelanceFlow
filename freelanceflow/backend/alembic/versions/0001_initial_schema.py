"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-07-13

"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    op.create_table(
        "subscriptiontier",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
        sa.Column("max_clients", sa.Integer, nullable=False, server_default="1"),
        sa.Column("custom_branding_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
        sa.Column("csv_export_enabled", sa.Boolean, nullable=False, server_default=sa.false()),
    )

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("subscription_tier_id", sa.Integer, sa.ForeignKey("subscriptiontier.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "refreshtoken",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(255), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_refreshtoken_user_id", "refreshtoken", ["user_id"])

    op.create_table(
        "client",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("business_name", sa.String(255), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=False),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_clients_user_id", "client", ["user_id"])

    op.create_table(
        "onboardingdata",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("client_id", sa.Uuid, sa.ForeignKey("client.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("brand_voice_notes", sa.Text, nullable=True),
        sa.Column("rate_card_description", sa.Text, nullable=True),
        sa.Column("contract_template_url", sa.Text, nullable=True),
        sa.Column("welcome_packet_url", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "contentstatus",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(50), nullable=False, unique=True),
    )

    op.create_table(
        "contentitem",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("client_id", sa.Uuid, sa.ForeignKey("client.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content_text", sa.Text, nullable=True),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("scheduled_date", sa.Date, nullable=True),
        sa.Column("status_id", sa.Integer, sa.ForeignKey("contentstatus.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "platform IN ('Instagram','Twitter','LinkedIn','TikTok','Facebook','YouTube')",
            name="ck_contentitem_platform",
        ),
    )
    op.create_index("idx_content_items_client_id", "contentitem", ["client_id"])
    op.create_index("idx_content_items_status_id", "contentitem", ["status_id"])

    op.create_table(
        "contentapprovallink",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("content_item_id", sa.Uuid, sa.ForeignKey("contentitem.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("token", sa.Uuid, nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("viewed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_content_approval_links_token", "contentapprovallink", ["token"], unique=True)
    op.create_index(
        "idx_approval_links_expires", "contentapprovallink", ["expires_at"],
        postgresql_where=sa.text("expires_at IS NOT NULL"),
    )

    op.create_table(
        "approvalcomment",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("approval_link_id", sa.Uuid, sa.ForeignKey("contentapprovallink.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_comment_id", sa.Uuid, sa.ForeignKey("approvalcomment.id", ondelete="CASCADE"), nullable=True),
        sa.Column("author_type", sa.String(20), nullable=False),
        sa.Column("comment_text", sa.Text, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("author_type IN ('client','freelancer')", name="ck_approvalcomment_author_type"),
    )
    op.create_index("idx_approval_comments_approval_link_id", "approvalcomment", ["approval_link_id"])

    op.create_table(
        "invoice",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("client_id", sa.Uuid, sa.ForeignKey("client.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid, sa.ForeignKey("user.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invoice_number", sa.String(100), nullable=False, unique=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("total_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("issued_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=False),
        sa.Column("pdf_url", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("status IN ('Paid','Unpaid')", name="ck_invoice_status"),
    )
    op.create_index("idx_invoices_client_id", "invoice", ["client_id"])
    op.create_index("idx_invoices_user_id", "invoice", ["user_id"])
    op.create_index("idx_invoices_status", "invoice", ["status"])

    op.create_table(
        "invoiceitem",
        sa.Column("id", sa.Uuid, primary_key=True),
        sa.Column("invoice_id", sa.Uuid, sa.ForeignKey("invoice.id", ondelete="CASCADE"), nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("item_type", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(12, 2), nullable=False),
        sa.Column("line_total", sa.Numeric(12, 2), nullable=False),
        sa.CheckConstraint("item_type IN ('retainer','post')", name="ck_invoiceitem_item_type"),
    )

    # Seed lookup data (review findings #6 / #23).
    op.execute(
        """
        INSERT INTO contentstatus (name) VALUES
        ('Drafted'), ('Pending Approval'), ('Approved'),
        ('Changes Requested'), ('Rejected'), ('Scheduled'), ('Posted')
        """
    )
    op.execute(
        """
        INSERT INTO subscriptiontier (name, max_clients, custom_branding_enabled, csv_export_enabled) VALUES
        ('Free', 1, false, false),
        ('Pro', 999, true, true)
        """
    )


def downgrade() -> None:
    op.drop_table("invoiceitem")
    op.drop_table("invoice")
    op.drop_table("approvalcomment")
    op.drop_table("contentapprovallink")
    op.drop_table("contentitem")
    op.drop_table("contentstatus")
    op.drop_table("onboardingdata")
    op.drop_table("client")
    op.drop_table("refreshtoken")
    op.drop_table("user")
    op.drop_table("subscriptiontier")
