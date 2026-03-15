
import asyncio
import traceback
from sqlalchemy import select
from app.db.database import async_session
from app.models.topic import Topic
from app.models.user import User
import uuid

async def create_test_topic():
    async with async_session() as db:
        # Get admin user
        result = await db.execute(select(User).filter(User.email == "admin@example.com"))
        admin = result.scalars().first()
        if not admin:
            print("Admin user not found, please create it first.")
            return

        topic = Topic(
            id=uuid.uuid4(),
            name="Test Topic",
            slug="test-topic",
            description="A topic for testing document uploads",
            created_by=admin.id,
            is_active=True
        )
        try:
            db.add(topic)
            await db.commit()
            await db.refresh(topic)
            print(f"Created topic: {topic.name} (ID: {topic.id})")
        except Exception as e:
            print("ERROR DURING COMMIT:")
            traceback.print_exc()
            await db.rollback()

if __name__ == "__main__":
    asyncio.run(create_test_topic())
