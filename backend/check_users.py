
import asyncio
from sqlalchemy import select
from app.db.database import SessionLocal, AsyncSessionLocal
from app.models.user import User

async def check_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User))
        users = result.scalars().all()
        if not users:
            print("No users found in database.")
        else:
            print(f"Found {len(users)} users:")
            for user in users:
                print(f"- {user.email} (Role: {user.role}, Active: {user.is_active})")

if __name__ == "__main__":
    asyncio.run(check_users())
