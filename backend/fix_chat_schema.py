
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def fix_chat_schema():
    print("Starting chat schema fix...")
    async with engine.begin() as conn:
        # 1. Add message_count to conversations if not exists
        try:
            await conn.execute(text("ALTER TABLE conversations ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0"))
            print("Checked/Added message_count to conversations.")
        except Exception as e:
            print(f"Error on conversations: {e}")

        # 2. Add added_at to conversation_topics if not exists
        try:
            await conn.execute(text("ALTER TABLE conversation_topics ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP"))
            print("Checked/Added added_at to conversation_topics.")
        except Exception as e:
            print(f"Error on conversation_topics: {e}")

    print("Chat schema fix complete.")

if __name__ == "__main__":
    asyncio.run(fix_chat_schema())
