
import asyncio
from app.services.indexing_service import get_indexing_service

async def main():
    service = get_indexing_service()
    print("🚀 Starting RAG System Initialization...")
    report = await service.initialize_system(recreate_collection=True)
    print("✅ Initialization Complete!")
    print(f"Report: {report}")

if __name__ == "__main__":
    asyncio.run(main())
