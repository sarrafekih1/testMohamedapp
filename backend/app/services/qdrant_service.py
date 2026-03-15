# app/services/qdrant_service.py
import asyncio
from typing import List, Dict, Any, Optional, Union
from uuid import UUID
import logging
from qdrant_client import QdrantClient, AsyncQdrantClient
from qdrant_client.models import (
    CollectionInfo, 
    VectorParams, 
    Distance,
    PointStruct, 
    Filter, 
    FieldCondition, 
    SearchParams,
    SearchRequest,
    MatchValue,
    MatchAny,  # ← AJOUTÉ
    Range
)
from qdrant_client.http import models as rest

from app.core.config import get_settings

logger = logging.getLogger(__name__)

class QdrantService:
    """
    Service de gestion de la base vectorielle Qdrant.
    Gère les collections, l'indexation et la recherche sémantique.
    """
    
    # Configuration des collections
    COLLECTION_CONFIG = {
        "vector_size": 384,  # Dimension pour sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
        "distance": Distance.COSINE,  # Métrique de distance pour similarité sémantique
        "shard_number": 1,  # Nombre de shards (1 pour développement)
        "replication_factor": 1,  # Facteur de réplication (1 pour développement)
    }
    
    def __init__(self, url: Optional[str] = None):
        """
        Initialize Qdrant service
        """
        self.settings = get_settings()
        
        # Priorité : Argument url > Settings.QDRANT_URL > localhost par défaut
        self.url = url or self.settings.QDRANT_URL
        self.collection_name = self.settings.QDRANT_COLLECTION_NAME
        
        # Configuration des clients
        print(f"🚀 QDRANT_SERVICE: Tentative de connexion à {self.url}")
        self.client = QdrantClient(url=self.url, timeout=60, check_compatibility=False)
        self.async_client = AsyncQdrantClient(url=self.url, timeout=60, check_compatibility=False)
        
        logger.info(f"QdrantService initialisé sur {self.url}")
    
    async def health_check(self) -> Dict[str, Any]:
        """Vérifie la connexion à Qdrant"""
        try:
            # Utilise get_collections au lieu de cluster_info
            collections = await self.async_client.get_collections()
            return {
                "status": "healthy",
                "collections_count": len(collections.collections) if collections.collections else 0,
                "url": self.url
            }
        except Exception as e:
            logger.error(f"Qdrant health check failed: {e}")
            return {
                "status": "unhealthy", 
                "error": str(e),
                "url": self.url
            }
    
    async def initialize_collection(self, recreate: bool = False) -> bool:
        """
        Initialise la collection principale pour les chunks de documents.
        
        Args:
            recreate: Si True, recrée la collection même si elle existe
            
        Returns:
            True si la collection est prête, False sinon
        """
        try:
            # Vérifier si la collection existe
            collections = await self.async_client.get_collections()
            collection_exists = any(
                collection.name == self.collection_name 
                for collection in collections.collections
            )
            
            if collection_exists and recreate:
                logger.info(f"Suppression de la collection existante : {self.collection_name}")
                await self.async_client.delete_collection(self.collection_name)
                collection_exists = False
            
            if not collection_exists:
                logger.info(f"Création de la collection : {self.collection_name}")
                
                # Création avec configuration optimisée
                await self.async_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=self.COLLECTION_CONFIG["vector_size"],
                        distance=self.COLLECTION_CONFIG["distance"]
                    ),
                    shard_number=self.COLLECTION_CONFIG["shard_number"],
                    replication_factor=self.COLLECTION_CONFIG["replication_factor"],
                )
                
                # Création d'index pour optimiser les filtres
                await self._create_payload_indexes()
                
                logger.info(f"Collection '{self.collection_name}' créée avec succès")
            else:
                logger.info(f"Collection '{self.collection_name}' existe déjà")
            
            return True
            
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation de la collection : {e}")
            return False
    
    async def _create_payload_indexes(self):
        """Crée les index sur les métadonnées pour optimiser les filtres"""
        indexes_to_create = [
            ("topic_id", "keyword"),  # Index pour filtrer par topic
            ("document_id", "keyword"),  # Index pour filtrer par document
            ("user_id", "keyword"),  # Index pour filtrer par utilisateur
            ("chunk_index", "integer"),  # Index pour ordonner les chunks
            ("status", "keyword"),  # Index pour le statut du document
        ]
        
        for field_name, field_type in indexes_to_create:
            try:
                await self.async_client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name=field_name,
                    field_schema=field_type
                )
                logger.debug(f"Index créé pour le champ : {field_name}")
            except Exception as e:
                logger.warning(f"Erreur création index {field_name}: {e}")
    
    async def index_chunk(
        self, 
        chunk_id: UUID,
        embedding: List[float],
        content: str,
        metadata: Dict[str, Any]
    ) -> bool:
        """
        Indexe un chunk unique dans Qdrant.
        
        Args:
            chunk_id: ID unique du chunk
            embedding: Vecteur d'embedding du chunk
            content: Contenu textuel du chunk
            metadata: Métadonnées du chunk (topic_id, document_id, etc.)
            
        Returns:
            True si indexation réussie, False sinon
        """
        try:
            # Préparation des métadonnées avec validation
            payload = {
                "content": content[:1000],  # Limite pour éviter payload trop volumineux
                "full_content": content,
                "chunk_id": str(chunk_id),
                **{k: str(v) if isinstance(v, UUID) else v for k, v in metadata.items()}
            }
            
            # Création du point Qdrant
            point = PointStruct(
                id=str(chunk_id),
                vector=embedding,
                payload=payload
            )
            
            # Insertion dans Qdrant
            await self.async_client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
            
            logger.debug(f"Chunk {chunk_id} indexé avec succès")
            return True
            
        except Exception as e:
            logger.error(f"Erreur indexation chunk {chunk_id}: {e}")
            return False
    
    async def index_chunks_batch(
        self, 
        chunks_data: List[Dict[str, Any]], 
        batch_size: int = 100
    ) -> Dict[str, int]:
        """
        Indexe plusieurs chunks en lot pour optimiser les performances.
        
        Args:
            chunks_data: Liste de dictionnaires contenant les données des chunks
            batch_size: Taille des lots d'insertion
            
        Returns:
            Dictionnaire avec statistiques d'indexation
        """
        stats = {"success": 0, "errors": 0, "total": len(chunks_data)}
        
        for i in range(0, len(chunks_data), batch_size):
            batch = chunks_data[i:i + batch_size]
            points = []
            
            for chunk_data in batch:
                try:
                    # Préparation du payload
                    payload = {
                        "content": chunk_data["content"][:1000],
                        "full_content": chunk_data["content"],
                        "chunk_id": str(chunk_data["chunk_id"]),
                        **{k: str(v) if isinstance(v, UUID) else v 
                           for k, v in chunk_data["metadata"].items()}
                    }
                    
                    point = PointStruct(
                        id=str(chunk_data["chunk_id"]),
                        vector=chunk_data["embedding"],
                        payload=payload
                    )
                    points.append(point)
                    
                except Exception as e:
                    logger.error(f"Erreur préparation chunk {chunk_data.get('chunk_id')}: {e}")
                    stats["errors"] += 1
            
            # Insertion du lot
            if points:
                try:
                    await self.async_client.upsert(
                        collection_name=self.collection_name,
                        points=points
                    )
                    stats["success"] += len(points)
                    logger.info(f"Lot {i//batch_size + 1} indexé : {len(points)} chunks")
                    
                except Exception as e:
                    logger.error(f"Erreur indexation lot {i//batch_size + 1}: {e}")
                    stats["errors"] += len(points)
        
        logger.info(f"Indexation terminée : {stats['success']}/{stats['total']} chunks réussis")
        return stats
    
    async def search_similar_chunks(
        self,
        query_embedding: List[float],
        topic_filters: List[str],
        limit: Optional[int] = None,  # ⭐ CHANGÉ : None par défaut
        score_threshold: Optional[float] = None,  # ⭐ CHANGÉ : None par défaut
        # limit: int = 10,
        # score_threshold: float = 0.35
    ) -> List[Dict[str, Any]]:
        """
        Recherche les chunks les plus similaires à une query.
        
        Args:
            query_embedding: Vecteur de la requête utilisateur
            topic_filters: Liste des IDs de topics autorisés pour l'utilisateur
            limit: Nombre maximum de résultats
            score_threshold: Seuil minimum de similarité (0-1)
            
        Returns:
            Liste des chunks similaires avec scores et métadonnées
        """
        
        # ⭐ AJOUT : Utiliser les valeurs des settings si non spécifiées
        if limit is None:
            limit = self.settings.RAG_MAX_CHUNKS
        
        if score_threshold is None:
            score_threshold = self.settings.RAG_SCORE_THRESHOLD
        
        logger.info(f"🔍 Recherche avec limit={limit}, threshold={score_threshold}")
    

        try:
            # Construction du filtre par topics
            if len(topic_filters) == 1:
                # Un seul topic : utilise MatchValue avec value
                topic_filter = Filter(
                    must=[
                        FieldCondition(
                            key="topic_id",
                            match=MatchValue(value=topic_filters[0])
                        )
                    ]
                )
            else:
                # Plusieurs topics : utilise MatchAny
                topic_filter = Filter(
                    must=[
                        FieldCondition(
                            key="topic_id", 
                            match=MatchAny(any=topic_filters)
                        )
                    ]
                )
            
            # Recherche vectorielle
            search_result = await self.async_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=topic_filter,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True
            )
            
            # Formatage des résultats
            results = []
            for scored_point in search_result:
                result = {
                    "chunk_id": scored_point.payload.get("chunk_id"),
                    "score": scored_point.score,
                    "content": scored_point.payload.get("full_content", ""),
                    "preview": scored_point.payload.get("content", ""),
                    "metadata": {
                        k: v for k, v in scored_point.payload.items() 
                        if k not in ["content", "full_content", "chunk_id"]
                    }
                }
                results.append(result)
            
            logger.info(f"Recherche terminée : {len(results)} chunks trouvés")
            return results
            
        except Exception as e:
            logger.error(f"Erreur lors de la recherche : {e}")
            return []
    
    async def delete_document_chunks(self, document_id: UUID) -> bool:
        """
        Supprime tous les chunks d'un document spécifique.
        
        Args:
            document_id: ID du document dont supprimer les chunks
            
        Returns:
            True si suppression réussie, False sinon
        """
        try:
            # Filtre pour identifier les chunks du document
            filter_condition = Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=str(document_id))
                    )
                ]
            )
            
            # Suppression des points correspondants
            await self.async_client.delete(
                collection_name=self.collection_name,
                points_selector=filter_condition
            )
            
            logger.info(f"Chunks du document {document_id} supprimés de Qdrant")
            return True
            
        except Exception as e:
            logger.error(f"Erreur suppression chunks document {document_id}: {e}")
            return False
    
    async def get_collection_stats(self) -> Dict[str, Any]:
        """Retourne les statistiques de la collection"""
        try:
            collection_info = await self.async_client.get_collection(self.collection_name)
            return {
                "collection_name": self.collection_name,
                "points_count": collection_info.points_count,
                "vectors_count": collection_info.vectors_count,
                "indexed_vectors_count": collection_info.indexed_vectors_count,
                "status": collection_info.status.value,
                "optimizer_status": collection_info.optimizer_status,
                "config": {
                    "vector_size": self.COLLECTION_CONFIG["vector_size"],
                    "distance": self.COLLECTION_CONFIG["distance"].value
                }
            }
        except Exception as e:
            logger.error(f"Erreur récupération stats collection: {e}")
            return {"error": str(e)}

# Instance globale
_qdrant_service: Optional[QdrantService] = None

def get_qdrant_service() -> QdrantService:
    """Factory function pour obtenir l'instance Qdrant"""
    global _qdrant_service
    if _qdrant_service is None:
        _qdrant_service = QdrantService()
    return _qdrant_service