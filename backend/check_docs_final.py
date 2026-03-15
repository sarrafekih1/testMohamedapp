
import asyncio
from sqlalchemy import select
from app.db.database import async_session
from app.models.document import Document

async def check():
    async with async_session() as db:
        result = await db.execute(select(Document).order_by(Document.created_at.desc()).limit(10))
        docs = result.scalars().all()
        print(f"FOUND {len(docs)} DOCUMENTS")
        for d in docs:
            print(f"FILE:{d.original_filename}|STATUS:{d.status.value}|ERROR:{d.error_message}")

if __name__ == "__main__":
    asyncio.run(check())
