import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

Platform = Literal["Instagram", "Twitter", "LinkedIn", "TikTok", "Facebook", "YouTube"]
ApprovalDecision = Literal["Approved", "Rejected", "Changes Requested"]


# ---------- Auth ----------
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    subscription_tier_id: int


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AccessTokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------- Clients ----------
class OnboardingIn(BaseModel):
    brand_voice_notes: Optional[str] = None
    rate_card_description: Optional[str] = None


class ClientCreate(BaseModel):
    business_name: str = Field(min_length=1, max_length=255)
    contact_email: EmailStr
    contact_phone: Optional[str] = None
    brand_voice_notes: Optional[str] = None
    rate_card_description: Optional[str] = None


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_name: str
    contact_email: EmailStr
    contact_phone: Optional[str] = None


class OnboardingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    brand_voice_notes: Optional[str] = None
    rate_card_description: Optional[str] = None
    contract_template_url: Optional[str] = None
    welcome_packet_url: Optional[str] = None


class ClientDetailOut(BaseModel):
    client: ClientOut
    onboarding_data: Optional[OnboardingOut] = None


# ---------- Content ----------
class ContentItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    content_text: Optional[str] = None
    platform: Platform
    scheduled_date: Optional[date] = None


class ContentItemOut(BaseModel):
    id: uuid.UUID
    title: str
    content_text: Optional[str] = None
    platform: str
    scheduled_date: Optional[date] = None
    status: str
    client_business_name: Optional[str] = None


class ContentCreateOut(BaseModel):
    content_item: ContentItemOut
    approval_token: str


class CommentIn(BaseModel):
    author_type: Literal["client", "freelancer"]
    comment_text: str = Field(min_length=1, max_length=4000)
    parent_comment_id: Optional[uuid.UUID] = None


class CommentOut(BaseModel):
    id: uuid.UUID
    author_type: str
    comment_text: str
    created_at: datetime
    parent_comment_id: Optional[uuid.UUID] = None


class ApprovalLinkOut(BaseModel):
    content_item: ContentItemOut
    status: str
    comments: list[CommentOut] = []


class ApprovalStatusUpdate(BaseModel):
    status: ApprovalDecision


# ---------- Invoices ----------
class InvoiceItemIn(BaseModel):
    description: str
    item_type: Literal["retainer", "post"]
    quantity: int = Field(default=1, ge=1)
    unit_price: Decimal = Field(ge=0)


class InvoiceCreate(BaseModel):
    items: list[InvoiceItemIn]
    due_date: Optional[date] = None


class InvoiceOut(BaseModel):
    id: uuid.UUID
    invoice_number: str
    status: str
    total_amount: Decimal
    issued_date: date
    due_date: date
    client_business_name: Optional[str] = None


# ---------- Dashboard ----------
class DashboardResponse(BaseModel):
    upcoming_posts: list[ContentItemOut]
    pending_approvals: list[ContentItemOut]
    unpaid_invoices: list[InvoiceOut]
