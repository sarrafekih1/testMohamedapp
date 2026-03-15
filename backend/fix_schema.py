
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def fix_schema():
    print("Fixing schema...")
    async with engine.begin() as conn:
        try:
            # Add file_path column if it doesn't exist
            await conn.execute(text("ALTER TABLE documents ADD COLUMN file_path VARCHAR(512)"))
            print("Column 'file_path' added to 'documents' table.")
        except Exception as e:
            if "already exists" in str(e):
                print("Column 'file_path' already exists.")
            else:
                print(f"Error: {e}")
        
        try:
            # Set NOT NULL if confirmed
            await conn.execute(text("UPDATE documents SET file_path = '' WHERE file_path IS NULL"))
            await conn.execute(text("ALTER TABLE documents ALTER COLUMN file_path SET NOT NULL"))
            print("Column 'file_path' set to NOT NULL.")
        except Exception as e:
            print(f"Update error: {e}")

if __name__ == "__main__":
    asyncio.run(fix_schema())
