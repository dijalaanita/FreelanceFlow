from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models import (
    STATUS_PENDING_APPROVAL,
    Client,
    ContentItem,
    ContentStatus,
    Invoice,
    User,
)
from app.schemas import ContentItemOut, DashboardResponse, InvoiceOut

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    client_ids_result = await session.exec(select(Client.id).where(Client.user_id == user.id))
    client_ids = client_ids_result.all()

    client_names_result = await session.exec(select(Client).where(Client.user_id == user.id))
    client_lookup = {c.id: c.business_name for c in client_names_result.all()}

    upcoming_posts: list[ContentItemOut] = []
    pending_approvals: list[ContentItemOut] = []

    if client_ids:
        week_end = date.today() + timedelta(days=7)
        posts_result = await session.exec(
            select(ContentItem)
            .where(ContentItem.client_id.in_(client_ids))
            .where(ContentItem.scheduled_date != None)  # noqa: E711
            .where(ContentItem.scheduled_date <= week_end)
            .where(ContentItem.scheduled_date >= date.today())
            .order_by(ContentItem.scheduled_date)
        )
        for item in posts_result.all():
            status_row = await session.get(ContentStatus, item.status_id)
            upcoming_posts.append(
                ContentItemOut(
                    id=item.id,
                    title=item.title,
                    content_text=item.content_text,
                    platform=item.platform,
                    scheduled_date=item.scheduled_date,
                    status=status_row.name if status_row else "Unknown",
                    client_business_name=client_lookup.get(item.client_id),
                )
            )

        pending_status_result = await session.exec(
            select(ContentStatus).where(ContentStatus.name == STATUS_PENDING_APPROVAL)
        )
        pending_status = pending_status_result.first()
        if pending_status:
            approvals_result = await session.exec(
                select(ContentItem)
                .where(ContentItem.client_id.in_(client_ids))
                .where(ContentItem.status_id == pending_status.id)
            )
            for item in approvals_result.all():
                pending_approvals.append(
                    ContentItemOut(
                        id=item.id,
                        title=item.title,
                        content_text=item.content_text,
                        platform=item.platform,
                        scheduled_date=item.scheduled_date,
                        status=STATUS_PENDING_APPROVAL,
                        client_business_name=client_lookup.get(item.client_id),
                    )
                )

    unpaid_result = await session.exec(
        select(Invoice).where(Invoice.user_id == user.id).where(Invoice.status == "Unpaid")
    )
    unpaid_invoices = [
        InvoiceOut(
            id=inv.id,
            invoice_number=inv.invoice_number,
            status=inv.status,
            total_amount=inv.total_amount,
            issued_date=inv.issued_date,
            due_date=inv.due_date,
            client_business_name=client_lookup.get(inv.client_id),
        )
        for inv in unpaid_result.all()
    ]

    return DashboardResponse(
        upcoming_posts=upcoming_posts,
        pending_approvals=pending_approvals,
        unpaid_invoices=unpaid_invoices,
    )
