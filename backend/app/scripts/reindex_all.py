# scripts/reindex_all.py
import asyncio
from app.services.indexing_service import get_indexing_service
from app.db.database import get_db

async def reindex():
    async for db in get_db():
        indexing_service = get_indexing_service()
        
        # Ré-initialiser la collection Qdrant
        print("🔄 Ré-initialisation de Qdrant...")
        await indexing_service.qdrant_service.initialize_collection(recreate=True)
        
        # Ré-indexer tous les documents
        print("📚 Ré-indexation des documents...")
        stats = await indexing_service.index_all_documents(db)
        print(f"✅ Stats: {stats}")
        break

if __name__ == "__main__":
    asyncio.run(reindex())