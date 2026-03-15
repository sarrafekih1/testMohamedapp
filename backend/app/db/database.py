# app/db/database.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from typing import AsyncGenerator

# Configuration Database - corrigée
from app.core.config import get_settings
settings = get_settings()
DATABASE_URL = settings.DATABASE_URL

# DATABASE_URL = os.getenv(
#     "DATABASE_URL", 
#     "postgresql+asyncpg://postgres:dev123@localhost:5432/postgres"
# )


# Création de l'engine async
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Désactivé pour éviter la saturation du terminal
    future=True,
    pool_size=10,
    max_overflow=20,
)

# Session factory
async_session = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Base pour les modèles
Base = declarative_base()

# Import des modèles pour qu'ils soient créés
from app.models.user import User
from app.models.topic import Topic
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.permissions import UserTopicAccess
from app.models.conversation import Conversation, ConversationTopic, Message

# Dependency pour FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency pour obtenir une session de base de données"""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Fonction pour créer les tables
async def create_tables():
    """Créer toutes les tables en base"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# Fonction pour supprimer les tables (dev uniquement)
async def drop_tables():
    """Supprimer toutes les tables (dev uniquement)"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)