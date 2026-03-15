
import asyncio
import uuid
from sqlalchemy import select
from app.db.database import async_session
from app.models.document import Document
from app.models.chunk import DocumentChunk

async def verify():
    async with async_session() as db:
        print("--- VERIFYING LATEST UPLOADS ---")
        result = await db.execute(select(Document).order_by(Document.created_at.desc()).limit(1))
        doc = result.scalar_one_or_none()
        
        if not doc:
            print("No documents found in DB.")
            return

        print(f"LATEST DOC: {doc.original_filename}")
        print(f"STATUS: {doc.status}")
        print(f"FILE_PATH: {doc.file_path}")
        print(f"ERROR: {doc.error_message}")
        
        chunks_res = await db.execute(select(DocumentChunk).filter(DocumentChunk.document_id == doc.id).limit(5))
        chunks = chunks_res.scalars().all()
        print(f"CHUNKS FOUND: {len(chunks)}")
        for c in chunks:
            print(f"  CHUNK {c.chunk_index}: {c.content[:50]}...")
            print(f"  METADATA: {c.chunk_metadata}")

if __name__ == "__main__":
    asyncio.run(verify())
