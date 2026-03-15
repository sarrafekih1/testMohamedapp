import asyncio
from typing import List, Dict, Any, Optional
from uuid import UUID
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.topic import Topic
from app.services.embeddings_service import get_embeddings_service
from app.services.qdrant_service import get_qdrant_service
from app.db.database import get_db

logger = logging.getLogger(__name__)

class IndexingService:
    """
    Service d'indexation vectorielle des documents.
    Orchestre la transformation des chunks PostgreSQL en vecteurs Qdran.
    """
    
    def __init__(self):
        self.embeddings_service = get_embeddings_service()
        self.qdrant_service = get_qdrant_service()
    
    async def initialize_system(self, recreate_collection: bool = False) -> Dict[str, Any]:
        """
        Initialise complètement le système vectoriel.
        
        Args:
            recreate_collection: Si True, recrée la collection Qdrant
            
        Returns:
            Rapport de l'initialisation
        """
        logger.info("🚀 Initialisation du système RAG...")
        
        report = {
            "embeddings_health": {},
            "qdrant_health": {},
            "collection_initialized": False,
            "indexing_stats": {}
        }
        
        # 1. Vérification du service d'embeddings
        logger.info("📊 Vérification du service d'embeddings...")
        report["embeddings_health"] = await self.embeddings_service.health_check()
        
        if report["embeddings_health"]["status"] != "healthy":
            logger.error("❌ Service d'embeddings non disponible")
            return report
        
        # 2. Vérification de Qdrant
        logger.info("🔍 Vérification de Qdrant...")
        report["qdrant_health"] = await self.qdrant_service.health_check()
        
        if report["qdrant_health"]["status"] != "healthy":
            logger.error("❌ Qdrant non disponible")
            return report
        
        # 3. Initialisation de la collection
        logger.info("📦 Initialisation de la collection Qdrant...")
        collection_ready = await self.qdrant_service.initialize_collection(recreate_collection)
        report["collection_initialized"] = collection_ready
        
        if not collection_ready:
            logger.error("❌ Impossible d'initialiser la collection Qdrant")
            return report
        
        # 4. Indexation de tous les chunks existants
        logger.info("⚡ Indexation des documents existants...")
        db_session = None
        try:
            async for db in get_db():
                db_session = db
                break
            
            if db_session:
                report["indexing_stats"] = await self.index_all_documents(db_session)
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'indexation initiale : {e}")
            report["indexing_stats"] = {"error": str(e)}
        
        logger.info("✅ Initialisation du système RAG terminée")
        return report
    
    async def index_all_documents(self, db: AsyncSession) -> Dict[str, Any]:
        """
        Indexe tous les documents ready en base.
        
        Args:
            db: Session SQLAlchemy async
            
        Returns:
            Statistiques de l'indexation
        """
        logger.info("📚 Début de l'indexation de tous les documents...")
        
        # Récupération des documents ready avec leurs chunks
        query = select(Document).filter(
            Document.status == "ready"
        ).options(
            selectinload(Document.chunks),
            selectinload(Document.topic)
        )
        
        result = await db.execute(query)
        documents = result.scalars().all()
        
        stats = {
            "documents_found": len(documents),
            "documents_processed": 0,
            "chunks_indexed": 0,
            "errors": 0,
            "details": []
        }
        
        logger.info(f"📄 {len(documents)} documents à indexer")
        
        # Traitement par document
        for document in documents:
            try:
                doc_stats = await self.index_document(db, document.id)
                stats["documents_processed"] += 1
                stats["chunks_indexed"] += doc_stats.get("chunks_indexed", 0)
                stats["details"].append({
                    "document_id": str(document.id),
                    "filename": document.filename,
                    "chunks": doc_stats.get("chunks_indexed", 0),
                    "status": "success"
                })
                
                logger.info(f"✅ Document indexé : {document.filename} ({doc_stats.get('chunks_indexed', 0)} chunks)")
                
            except Exception as e:
                stats["errors"] += 1
                stats["details"].append({
                    "document_id": str(document.id),
                    "filename": document.filename,
                    "error": str(e),
                    "status": "error"
                })
                logger.error(f"❌ Erreur indexation document {document.filename}: {e}")
        
        logger.info(f"🎯 Indexation terminée : {stats['chunks_indexed']} chunks indexés")
        return stats
    
    async def index_document(self, db: AsyncSession, document_id: UUID) -> Dict[str, Any]:
        """
        Indexe tous les chunks d'un document spécifique.
        
        Args:
            db: Session SQLAlchemy async
            document_id: ID du document à indexer
            
        Returns:
            Statistiques de l'indexation du document
        """
        # Récupération du document avec ses relations
        query = select(Document).filter(
            Document.id == document_id
        ).options(
            selectinload(Document.chunks),
            selectinload(Document.topic),
            selectinload(Document.uploader)
        )
        
        result = await db.execute(query)
        document = result.scalar_one_or_none()
        
        if not document:
            raise ValueError(f"Document {document_id} non trouvé")
        
        if not document.chunks:
            logger.warning(f"Document {document.filename} n'a aucun chunk")
            return {"chunks_indexed": 0}
        
        # Préparation des données pour l'indexation
        chunks_data = []
        texts_for_embedding = []
        
        for chunk in document.chunks:
            # Métadonnées complètes pour Qdrant
            metadata = {
                "document_id": document.id,
                "topic_id": document.topic_id,
                "user_id": document.uploaded_by,
                "filename": document.filename,
                "topic_name": document.topic.name if document.topic else "unknown",
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "word_count": chunk.word_count,
                "char_count": chunk.char_count,
                "status": document.status
            }
            
            chunks_data.append({
                "chunk_id": chunk.id,
                "content": chunk.content,
                "metadata": metadata
            })
            
            texts_for_embedding.append(chunk.content)
        
        # Génération des embeddings en lot (plus efficace)
        logger.info(f"🧠 Génération des embeddings pour {len(texts_for_embedding)} chunks...")
        embeddings = await self.embeddings_service.generate_embeddings_batch(texts_for_embedding)
        
        # Ajout des embeddings aux données des chunks
        for i, chunk_data in enumerate(chunks_data):
            chunk_data["embedding"] = embeddings[i]
        
        # Indexation en lot dans Qdrant
        logger.info(f"📦 Indexation dans Qdrant...")
        indexing_stats = await self.qdrant_service.index_chunks_batch(chunks_data)
        
        return {
            "chunks_indexed": indexing_stats["success"],
            "chunks_errors": indexing_stats["errors"],
            "document_filename": document.filename
        }
    
    async def index_new_chunk(
        self, 
        db: AsyncSession, 
        chunk_id: UUID
    ) -> bool:
        """
        Indexe un nouveau chunk (appelé après création d'un nouveau document).
        
        Args:
            db: Session SQLAlchemy async
            chunk_id: ID du chunk à indexer
            
        Returns:
            True si indexation réussie, False sinon
        """
        try:
            # Récupération du chunk avec ses relations
            query = select(DocumentChunk).filter(
                DocumentChunk.id == chunk_id
            ).options(
                selectinload(DocumentChunk.document.and_(
                    selectinload(Document.topic),
                    selectinload(Document.uploader)
                ))
            )
            
            result = await db.execute(query)
            chunk = result.scalar_one_or_none()
            
            if not chunk:
                logger.error(f"Chunk {chunk_id} non trouvé")
                return False
            
            document = chunk.document
            
            # Préparation des métadonnées
            metadata = {
                "document_id": document.id,
                "topic_id": document.topic_id,
                "user_id": document.uploaded_by,
                "filename": document.filename,
                "topic_name": document.topic.name if document.topic else "unknown",
                "chunk_index": chunk.chunk_index,
                "page_number": chunk.page_number,
                "word_count": chunk.word_count,
                "char_count": chunk.char_count,
                "status": document.status
            }
            
            # Génération de l'embedding
            embedding = await self.embeddings_service.generate_embedding(chunk.content)
            
            # Indexation dans Qdrant
            success = await self.qdrant_service.index_chunk(
                chunk_id=chunk.id,
                embedding=embedding,
                content=chunk.content,
                metadata=metadata
            )
            
            if success:
                logger.info(f"✅ Nouveau chunk {chunk_id} indexé")
            else:
                logger.error(f"❌ Échec indexation chunk {chunk_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Erreur indexation nouveau chunk {chunk_id}: {e}")
            return False
    
    async def reindex_document(self, db: AsyncSession, document_id: UUID) -> Dict[str, Any]:
        """
        Ré-indexe complètement un document (supprime + recrée).
        
        Args:
            db: Session SQLAlchemy async
            document_id: ID du document à ré-indexer
            
        Returns:
            Statistiques de la ré-indexation
        """
        logger.info(f"🔄 Ré-indexation du document {document_id}")
        
        # Suppression des chunks existants dans Qdrant
        await self.qdrant_service.delete_document_chunks(document_id)
        
        # Indexation complète
        return await self.index_document(db, document_id)
    
    async def get_indexing_status(self, db: AsyncSession) -> Dict[str, Any]:
            """
            Retourne le statut général de l'indexation.
            """
            # Stats PostgreSQL - CORRECTION de la requête
            from sqlalchemy import func
            
            # Requête simple sans selectinload
            query = select(Document.status, Document.id)
            result = await db.execute(query)
            documents = result.all()
            
            postgres_stats = {
                "total_documents": len(documents),
                "ready_documents": sum(1 for status, _ in documents if status == "ready"),
                "processing_documents": sum(1 for status, _ in documents if status == "processing"),
                "error_documents": sum(1 for status, _ in documents if status == "error")
            }
            
            # Stats des chunks - CORRECTION avec func.count
            query = select(func.count(DocumentChunk.id))
            result = await db.execute(query)
            total_chunks = result.scalar() or 0
            postgres_stats["total_chunks"] = total_chunks
            
            # Stats Qdrant
            qdrant_stats = await self.qdrant_service.get_collection_stats()
            
            # Service health
            embeddings_health = await self.embeddings_service.health_check()
            qdrant_health = await self.qdrant_service.health_check()
            
            return {
                "postgres_stats": postgres_stats,
                "qdrant_stats": qdrant_stats,
                "services": {
                    "embeddings": embeddings_health,
                    "qdrant": qdrant_health
                },
                "sync_status": {
                    "chunks_in_postgres": total_chunks,
                    "chunks_in_qdrant": qdrant_stats.get("points_count", 0),
                    "is_synchronized": total_chunks == qdrant_stats.get("points_count", 0)
                }
            }

# Instance globale
_indexing_service: Optional[IndexingService] = None

def get_indexing_service() -> IndexingService:
    """Factory function pour obtenir l'instance d'indexation"""
    global _indexing_service
    if _indexing_service is None:
        _indexing_service = IndexingService()
    return _indexing_service