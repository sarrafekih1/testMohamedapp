
import asyncio
from sqlalchemy import select
from app.db.database import async_session
from app.models.user import User, UserRole
from app.core.security import SecurityService
import uuid

async def create_admin():
    async with async_session() as db:
        # Check if admin already exists
        result = await db.execute(select(User).filter(User.email == "admin@example.com"))
        admin = result.scalars().first()
        
        if admin:
            print("Admin user already exists.")
            return

        admin = User(
            id=uuid.uuid4(),
            email="admin@example.com",
            full_name="Administrator",
            hashed_password=SecurityService.hash_password("password123"),
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Admin user 'admin@example.com' created with password 'password123'")

if __name__ == "__main__":
    asyncio.run(create_admin())
