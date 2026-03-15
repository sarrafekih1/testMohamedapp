# scripts/check_qdrant.py
import asyncio
from app.services.qdrant_service import get_qdrant_service

async def check():
    qdrant = get_qdrant_service()
    
    # Récupérer quelques points
    result = await qdrant.async_client.scroll(
        collection_name="documents_chunks",
        limit=5,
        with_payload=True
    )
    
    print(f"✅ {len(result[0])} points récupérés\n")
    
    for point in result[0]:
        print(f"Point ID: {point.id}")
        print(f"Payload: {point.payload}")
        print(f"---")

if __name__ == "__main__":
    asyncio.run(check())