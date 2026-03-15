
import asyncio
import logging
from sqlalchemy import select
from app.db.database import async_session
from app.models.document import Document

logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

async def check():
    async with async_session() as db:
        result = await db.execute(select(Document).order_by(Document.created_at.desc()).limit(10))
        docs = result.scalars().all()
        print(f"---DOC_LIST_START---")
        print(f"COUNT:{len(docs)}")
        for d in docs:
            error = str(d.error_message).replace('\n', ' ') if d.error_message else "None"
            print(f"FILE:{d.original_filename}|STATUS:{d.status.value}|ERROR:{error}")
        print(f"---DOC_LIST_END---")

if __name__ == "__main__":
    asyncio.run(check())
