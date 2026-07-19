from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlmodel import select

from app.api.deps import get_owned_client, get_status_id
from app.core.database import get_session
from app.models import STATUS_DRAFTED, Client, ContentApprovalLink, ContentItem, ContentStatus
from app.schemas import ContentCreateOut, ContentItemCreate, ContentItemOut

router = APIRouter(prefix="/clients/{client_id}/content-items", tags=["content"])

APPROVAL_LINK_TTL_DAYS = 7


async def _status_name(session: AsyncSession, status_id: int) -> str:
    status_row = await session.get(ContentStatus, status_id)
    return status_row.name if status_row else "Unknown"


@router.get("", response_model=list[ContentItemOut])
async def list_content_items(
    client: Client = Depends(get_owned_client),
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(
        select(ContentItem).where(ContentItem.client_id == client.id).order_by(ContentItem.scheduled_date)
    )
    items = result.all()
    out = []
    for item in items:
        out.append(
            ContentItemOut(
                id=item.id,
                title=item.title,
                content_text=item.content_text,
                platform=item.platform,
                scheduled_date=item.scheduled_date,
                status=await _status_name(session, item.status_id),
                client_business_name=client.business_name,
            )
        )
    return out


@router.post("", response_model=ContentCreateOut, status_code=201)
async def create_content_item(
    item_in: ContentItemCreate,
    client: Client = Depends(get_owned_client),
    session: AsyncSession = Depends(get_session),
):
    status_id = await get_status_id(session, STATUS_DRAFTED)

    item = ContentItem(
        client_id=client.id,
        title=item_in.title,
        content_text=item_in.content_text,
        platform=item_in.platform,
        scheduled_date=item_in.scheduled_date,
        status_id=status_id,
    )
    session.add(item)
    await session.flush()

    link = ContentApprovalLink(
        content_item_id=item.id,
        expires_at=datetime.utcnow() + timedelta(days=APPROVAL_LINK_TTL_DAYS),
    )
    session.add(link)
    await session.commit()
    await session.refresh(item)
    await session.refresh(link)

    return ContentCreateOut(
        content_item=ContentItemOut(
            id=item.id,
            title=item.title,
            content_text=item.content_text,
            platform=item.platform,
            scheduled_date=item.scheduled_date,
            status=STATUS_DRAFTED,
            client_business_name=client.business_name,
        ),
        approval_token=str(link.token),
    )
