
import asyncio
import logging
from sqlalchemy import select
from app.db.database import async_session
from app.models.conversation import Conversation

logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

async def check():
    async with async_session() as db:
        result = await db.execute(select(Conversation).order_by(Conversation.created_at.desc()).limit(5))
        convs = result.scalars().all()
        print(f"---CONV_LIST_START---")
        print(f"COUNT:{len(convs)}")
        for c in convs:
            print(f"CONV:{c.title}|ID:{c.id}|USER:{c.user_id}|MSG_COUNT:{c.message_count}")
        print(f"---CONV_LIST_END---")

if __name__ == "__main__":
    asyncio.run(check())
