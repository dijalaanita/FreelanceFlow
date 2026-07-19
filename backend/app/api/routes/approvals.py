import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.models import (
    STATUS_APPROVED,
    STATUS_CHANGES_REQUESTED,
    STATUS_REJECTED,
    ApprovalComment,
    Client,
    ContentApprovalLink,
    ContentItem,
    ContentStatus,
)
from app.schemas import ApprovalLinkOut, ApprovalStatusUpdate, CommentIn, CommentOut, ContentItemOut

router = APIRouter(prefix="/approval-links", tags=["approvals"])

STATUS_MAP = {
    "Approved": STATUS_APPROVED,
    "Rejected": STATUS_REJECTED,
    "Changes Requested": STATUS_CHANGES_REQUESTED,
}


async def _get_valid_link(token: uuid.UUID, session: AsyncSession) -> ContentApprovalLink:
    result = await session.exec(select(ContentApprovalLink).where(ContentApprovalLink.token == token))
    link = result.first()
    if not link:
        raise HTTPException(status_code=404, detail="Approval link not found")
    # Review — Critical finding: expiry was never enforced. Fixed here.
    if link.expires_at and link.expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=410, detail="This approval link has expired")
    return link


@router.get("/{token}", response_model=ApprovalLinkOut)
async def view_approval_link(token: uuid.UUID, session: AsyncSession = Depends(get_session)):
    link = await _get_valid_link(token, session)

    if link.viewed_at is None:
        link.viewed_at = datetime.now(timezone.utc)
        session.add(link)
        await session.commit()

    item = await session.get(ContentItem, link.content_item_id)
    status_row = await session.get(ContentStatus, item.status_id)
    client = await session.get(Client, item.client_id)

    comments_result = await session.exec(
        select(ApprovalComment)
        .where(ApprovalComment.approval_link_id == link.id)
        .order_by(ApprovalComment.created_at)
    )
    comments = comments_result.all()

    return ApprovalLinkOut(
        content_item=ContentItemOut(
            id=item.id,
            title=item.title,
            content_text=item.content_text,
            platform=item.platform,
            scheduled_date=item.scheduled_date,
            status=status_row.name,
            client_business_name=client.business_name if client else None,
        ),
        status=status_row.name,
        comments=[CommentOut(**c.model_dump()) for c in comments],
    )


@router.patch("/{token}/status")
async def update_approval_status(
    token: uuid.UUID,
    update: ApprovalStatusUpdate,
    session: AsyncSession = Depends(get_session),
):
    link = await _get_valid_link(token, session)
    item = await session.get(ContentItem, link.content_item_id)

    status_name = STATUS_MAP[update.status]
    status_result = await session.exec(select(ContentStatus).where(ContentStatus.name == status_name))
    status_row = status_result.first()
    if not status_row:
        raise HTTPException(status_code=500, detail=f"Status '{status_name}' not seeded")

    item.status_id = status_row.id
    item.updated_at = datetime.now(timezone.utc)
    session.add(item)
    await session.commit()
    return {"status": status_name}


@router.post("/{token}/comments", response_model=CommentOut, status_code=201)
async def add_comment(
    token: uuid.UUID,
    comment_in: CommentIn,
    session: AsyncSession = Depends(get_session),
):
    link = await _get_valid_link(token, session)
    comment = ApprovalComment(
        approval_link_id=link.id,
        parent_comment_id=comment_in.parent_comment_id,
        author_type=comment_in.author_type,
        comment_text=comment_in.comment_text,
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    return CommentOut(**comment.model_dump())
