
import asyncio
from sqlalchemy import select
from app.db.database import async_session
from app.models.user import User
from app.models.topic import Topic
from app.models.document import Document

async def audit():
    async with async_session() as db:
        print("--- AUDIT USERS ---")
        users_res = await db.execute(select(User))
        for u in users_res.scalars().all():
            print(f"USER: {u.email} | ID: {u.id} | ROLE: {u.role}")
        
        print("\n--- AUDIT TOPICS ---")
        topics_res = await db.execute(select(Topic))
        for t in topics_res.scalars().all():
            print(f"TOPIC: {t.name} | ID: {t.id} | SLUG: {t.slug}")
            
        print("\n--- AUDIT DOCUMENTS ---")
        docs_res = await db.execute(select(Document))
        docs = docs_res.scalars().all()
        if not docs:
            print("No documents found.")
        for d in docs:
            print(f"DOC: {d.original_filename} | ID: {d.id} | STATUS: {d.status} | ERROR: {d.error_message}")

if __name__ == "__main__":
    asyncio.run(audit())
