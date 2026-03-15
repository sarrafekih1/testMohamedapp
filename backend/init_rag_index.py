"""
Script to initialize the Qdrant collection and index all existing documents.
Run with: python init_rag_index.py
"""
import asyncio
import sys
import os

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def main():
    # Load all models first to avoid circular imports
    from app.db.database import async_session, Base, engine
    import app.models.user
    import app.models.topic
    import app.models.document
    import app.models.chunk
    import app.models.permissions
    import app.models.conversation
    
    from app.services.qdrant_service import get_qdrant_service
    from app.services.embeddings_service import get_embeddings_service
    from app.models.document import Document, DocumentStatus
    from app.models.chunk import DocumentChunk
    from app.models.topic import Topic
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    print("=" * 50)
    print("RAG Index Initialization")
    print("=" * 50)
    
    qdrant = get_qdrant_service()
    embeddings = get_embeddings_service()
    
    # 1. Check Qdrant health
    health = await qdrant.health_check()
    print(f"Qdrant health: {health['status']} at {health['url']}")
    
    # 2. Create/recreate collection
    print(f"Creating collection: {qdrant.collection_name}")
    ok = await qdrant.initialize_collection(recreate=True)
    print(f"Collection created: {ok}")
    
    if not ok:
        print("FAILED to create collection. Aborting.")
        return
    
    # 3. Load documents from DB
    async with async_session() as db:
        result = await db.execute(
            select(Document)
            .filter(Document.status == DocumentStatus.READY)
            .options(
                selectinload(Document.chunks),
                selectinload(Document.topic)
            )
        )
        documents = result.scalars().all()
        print(f"Found {len(documents)} ready documents in database")
        
        total_chunks = 0
        for doc in documents:
            if not doc.chunks:
                print(f"  - {doc.filename}: no chunks, skipping")
                continue
            
            print(f"  - {doc.filename}: {len(doc.chunks)} chunks, generating embeddings...")
            
            texts = [c.content for c in doc.chunks]
            embs = await embeddings.generate_embeddings_batch(texts)
            
            chunks_data = []
            for i, chunk in enumerate(doc.chunks):
                chunks_data.append({
                    "chunk_id": chunk.id,
                    "content": chunk.content,
                    "embedding": embs[i],
                    "metadata": {
                        "document_id": str(doc.id),
                        "topic_id": str(doc.topic_id),
                        "filename": doc.filename,
                        "topic_name": doc.topic.name if doc.topic else "unknown",
                        "chunk_index": chunk.chunk_index,
                        "page_number": chunk.page_number,
                        "status": doc.status.value if hasattr(doc.status, 'value') else doc.status,
                    }
                })
            
            stats = await qdrant.index_chunks_batch(chunks_data)
            total_chunks += stats["success"]
            print(f"    Indexed: {stats['success']} chunks (errors: {stats['errors']})")
    
    # 4. Verify
    info = await qdrant.async_client.get_collection(qdrant.collection_name)
    print(f"\nDone! Total chunks indexed: {total_chunks}")
    print(f"Qdrant collection '{qdrant.collection_name}' now has {info.points_count} points.")

if __name__ == "__main__":
    asyncio.run(main())
