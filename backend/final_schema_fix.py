
import asyncio
from sqlalchemy import text
from app.db.database import engine

async def final_fix():
    print("Starting final schema synchronization...")
    async with engine.begin() as conn:
        # 1. Add file_path to documents if not exists
        try:
            await conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_path VARCHAR(512)"))
            print("Checked/Added file_path to documents.")
        except Exception as e:
            print(f"Note on documents: {e}")

        # 2. Add chunk_metadata to document_chunks if not exists
        try:
            await conn.execute(text("ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS chunk_metadata JSONB DEFAULT '{}'"))
            print("Checked/Added chunk_metadata to document_chunks.")
        except Exception as e:
            print(f"Note on document_chunks: {e}")

        # 3. Migrate data if possible (optional but good for consistency)
        try:
            # If old 'metadata' column exists, try to copy it
            await conn.execute(text("UPDATE document_chunks SET chunk_metadata = metadata WHERE metadata IS NOT NULL AND chunk_metadata = '{}'"))
            print("Migrated old metadata to chunk_metadata.")
        except Exception as e:
            print(f"Migration skip (column might not exist): {e}")

    print("Schema synchronization complete.")

if __name__ == "__main__":
    asyncio.run(final_fix())
