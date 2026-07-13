import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class SubscriptionTier(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)
    max_clients: int = Field(default=1)
    custom_branding_enabled: bool = Field(default=False)
    csv_export_enabled: bool = Field(default=False)


class User(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    full_name: str
    subscription_tier_id: int = Field(foreign_key="subscriptiontier.id")
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class RefreshToken(SQLModel, table=True):
    """Review finding #4/High: refresh tokens need server-side storage so
    they can be rotated and revoked, not just trusted forever."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    token_hash: str = Field(unique=True, index=True)
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=utcnow)


class Client(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    business_name: str
    contact_email: str
    contact_phone: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class OnboardingData(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id", unique=True)
    brand_voice_notes: Optional[str] = None
    rate_card_description: Optional[str] = None
    contract_template_url: Optional[str] = None
    welcome_packet_url: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ContentStatus(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True)


# Canonical status names — referenced by constant rather than magic strings
# (review finding #6).
STATUS_DRAFTED = "Drafted"
STATUS_PENDING_APPROVAL = "Pending Approval"
STATUS_APPROVED = "Approved"
STATUS_CHANGES_REQUESTED = "Changes Requested"
STATUS_REJECTED = "Rejected"
STATUS_SCHEDULED = "Scheduled"
STATUS_POSTED = "Posted"

ALL_STATUSES = [
    STATUS_DRAFTED,
    STATUS_PENDING_APPROVAL,
    STATUS_APPROVED,
    STATUS_CHANGES_REQUESTED,
    STATUS_REJECTED,
    STATUS_SCHEDULED,
    STATUS_POSTED,
]

ALLOWED_PLATFORMS = ["Instagram", "Twitter", "LinkedIn", "TikTok", "Facebook", "YouTube"]


class ContentItem(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id", index=True)
    title: str
    content_text: Optional[str] = None
    platform: str
    scheduled_date: Optional[date] = None
    status_id: int = Field(foreign_key="contentstatus.id", index=True)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class ContentApprovalLink(SQLModel, table=True):
    """Review finding #7: dropped the duplicate status_id that used to live
    here — status now lives solely on ContentItem, so there's one source of
    truth for a piece of content's state."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    content_item_id: uuid.UUID = Field(foreign_key="contentitem.id", unique=True)
    token: uuid.UUID = Field(default_factory=uuid.uuid4, unique=True, index=True)
    created_at: datetime = Field(default_factory=utcnow)
    expires_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None


class ApprovalComment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    approval_link_id: uuid.UUID = Field(foreign_key="contentapprovallink.id", index=True)
    parent_comment_id: Optional[uuid.UUID] = Field(default=None, foreign_key="approvalcomment.id")
    author_type: str  # "client" | "freelancer"
    comment_text: str
    created_at: datetime = Field(default_factory=utcnow)


class Invoice(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    client_id: uuid.UUID = Field(foreign_key="client.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    invoice_number: str = Field(unique=True)
    status: str  # "Paid" | "Unpaid"
    total_amount: Decimal
    issued_date: date
    due_date: date
    pdf_url: Optional[str] = None
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class InvoiceItem(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    invoice_id: uuid.UUID = Field(foreign_key="invoice.id", index=True)
    description: str
    item_type: str  # "retainer" | "post"
    quantity: int = Field(default=1)
    unit_price: Decimal
    line_total: Decimal
