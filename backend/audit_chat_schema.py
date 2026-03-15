
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def check_schema():
    async with engine.connect() as conn:
        print("--- CONVERSATIONS COLUMNS ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'conversations'"))
        for row in res.all():
            print(f"COL: {row[0]}")
            
        print("\n--- CONVERSATION_TOPICS COLUMNS ---")
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'conversation_topics'"))
        for row in res.all():
            print(f"COL: {row[0]}")

if __name__ == "__main__":
    asyncio.run(check_schema())
