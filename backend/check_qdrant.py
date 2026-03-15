
import asyncio
from app.services.qdrant_service import get_qdrant_service
from app.core.config import get_settings

async def check_qdrant():
    settings = get_settings()
    service = get_qdrant_service()
    
    print(f"Checking Qdrant at: {service.url}")
    print(f"Target collection: {service.collection_name}")
    
    try:
        health = await service.health_check()
        print(f"Health: {health}")
        
        collections = await service.async_client.get_collections()
        print(f"Collections present: {[c.name for c in collections.collections]}")
        
        if any(c.name == service.collection_name for c in collections.collections):
            info = await service.async_client.get_collection(service.collection_name)
            print(f"Collection Info: {info}")
            print(f"Points count: {info.points_count}")
        else:
            print(f"CRITICAL: Collection '{service.collection_name}' NOT FOUND!")
            
    except Exception as e:
        print(f"Error checking Qdrant: {e}")

if __name__ == "__main__":
    asyncio.run(check_qdrant())
