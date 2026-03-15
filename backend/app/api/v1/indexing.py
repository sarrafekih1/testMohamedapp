from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from uuid import UUID
import logging

from app.db.database import get_db
from app.core.deps import AdminUser, CurrentUser
from app.services.indexing_service import get_indexing_service
from app.services.qdrant_service import get_qdrant_service
from app.services.embeddings_service import get_embeddings_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["indexing"])

@router.post("/initialize")
async def initialize_rag_system(
    recreate_collection: bool = Query(False, description="Recrée la collection Qdrant si elle existe"),
    admin_user: AdminUser = None
) -> Dict[str, Any]:
    """
    Initialise complètement le système RAG.
    
    **Permissions requises :** Admin uniquement
    
    **Actions effectuées :**
    - Vérification des services (Embeddings, Qdrant)
    - Création/initialisation de la collection Qdrant
    - Indexation de tous les documents existants
    
    **Paramètres :**
    - recreate_collection: Si true, recrée la collection même si elle existe
    
    **Retour :** Rapport complet de l'initialisation
    """
    logger.info(f"🚀 Initialisation RAG demandée par {admin_user.email}")
    
    try:
        indexing_service = get_indexing_service()
        report = await indexing_service.initialize_system(recreate_collection)
        
        # Log du résultat
        if report.get("embeddings_health", {}).get("status") == "healthy" and \
           report.get("qdrant_health", {}).get("status") == "healthy":
            logger.info("✅ Système RAG initialisé avec succès")
        else:
            logger.warning("⚠️ Initialisation RAG partielle ou échouée")
        
        return {
            "message": "Initialisation du système RAG terminée",
            "report": report,
            "admin_user": admin_user.email
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation RAG : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur initialisation : {str(e)}")

@router.get("/status")
async def get_indexing_status(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
) -> Dict[str, Any]:
    """
    Retourne le statut complet du système d'indexation.
    
    **Informations fournies :**
    - Statistiques PostgreSQL (documents, chunks)
    - Statistiques Qdrant (vecteurs indexés)
    - Santé des services (Embeddings, Qdrant)
    - Statut de synchronisation
    """
    try:
        indexing_service = get_indexing_service()
        status = await indexing_service.get_indexing_status(db)
        
        return {
            "message": "Statut du système d'indexation",
            "status": status,
            "user": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Erreur récupération statut : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur statut : {str(e)}")

@router.post("/documents/{document_id}/reindex")
async def reindex_document(
    document_id: UUID,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = None
) -> Dict[str, Any]:
    """
    Ré-indexe complètement un document spécifique.
    
    **Permissions requises :** Admin uniquement
    
    **Actions :**
    - Suppression des vecteurs existants dans Qdrant
    - Régénération des embeddings
    - Ré-indexation complète
    
    **Utilité :** 
    - Après modification du modèle d'embeddings
    - En cas d'incohérence détectée
    - Pour forcer la mise à jour d'un document
    """
    logger.info(f"🔄 Ré-indexation document {document_id} par {admin_user.email}")
    
    try:
        indexing_service = get_indexing_service()
        stats = await indexing_service.reindex_document(db, document_id)
        
        return {
            "message": f"Document {document_id} ré-indexé",
            "stats": stats,
            "admin_user": admin_user.email
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur ré-indexation document {document_id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Erreur ré-indexation : {str(e)}"
        )

@router.post("/documents/reindex-all")
async def reindex_all_documents(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = None
) -> Dict[str, Any]:
    """
    Ré-indexe tous les documents en arrière-plan.
    
    **Permissions requises :** Admin uniquement
    
    **Mode d'exécution :** Tâche d'arrière-plan pour éviter les timeouts
    
    **Utilité :**
    - Migration vers nouveau modèle d'embeddings
    - Reconstruction complète de l'index
    - Récupération après problème technique
    """
    logger.info(f"🔄 Ré-indexation complète demandée par {admin_user.email}")
    
    async def reindex_task():
        """Tâche d'arrière-plan pour la ré-indexation complète"""
        try:
            indexing_service = get_indexing_service()
            
            # Recréation de la collection
            qdrant_service = get_qdrant_service()
            await qdrant_service.initialize_collection(recreate=True)
            
            # Ré-indexation de tous les documents
            async for db_session in get_db():
                stats = await indexing_service.index_all_documents(db_session)
                logger.info(f"✅ Ré-indexation complète terminée : {stats}")
                break
                
        except Exception as e:
            logger.error(f"❌ Erreur ré-indexation complète : {e}")
    
    # Lancement de la tâche en arrière-plan
    background_tasks.add_task(reindex_task)
    
    return {
        "message": "Ré-indexation complète lancée en arrière-plan",
        "note": "Consultez les logs pour suivre l'avancement",
        "admin_user": admin_user.email
    }

@router.get("/health")
async def health_check_rag() -> Dict[str, Any]:
    """
    Vérification de santé de tous les composants RAG.
    
    **Composants vérifiés :**
    - Service d'embeddings (modèle chargé, dimensions)
    - Qdrant (connexion, cluster info)
    - Collection principale (existence, configuration)
    
    **Retour :** Statut détaillé de chaque composant
    """
    try:
        # Vérification du service d'embeddings
        embeddings_service = get_embeddings_service()
        embeddings_health = await embeddings_service.health_check()
        
        # Vérification de Qdrant
        qdrant_service = get_qdrant_service()
        qdrant_health = await qdrant_service.health_check()
        
        # Vérification de la collection
        collection_stats = await qdrant_service.get_collection_stats()
        
        # Statut global
        overall_status = "healthy" if (
            embeddings_health.get("status") == "healthy" and 
            qdrant_health.get("status") == "healthy"
        ) else "unhealthy"
        
        return {
            "status": overall_status,
            "components": {
                "embeddings": embeddings_health,
                "qdrant": qdrant_health,
                "collection": collection_stats
            },
            "ready_for_rag": overall_status == "healthy" and 
                           collection_stats.get("points_count", 0) > 0
        }
        
    except Exception as e:
        logger.error(f"Erreur health check RAG : {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }

@router.post("/test-search")
async def test_search(
    query: str = Query(..., description="Requête de test pour la recherche sémantique"),
    limit: int = Query(3, description="Nombre de résultats", ge=1, le=10),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
) -> Dict[str, Any]:
    """
    Test de recherche sémantique pour valider le système RAG.
    
    **Fonctionnement :**
    - Génère l'embedding de la requête
    - Recherche dans les topics accessibles par l'utilisateur
    - Retourne les chunks les plus similaires
    
    **Utilité :** Validation du pipeline complet avant implémentation du chat
    """
    try:
        # Services nécessaires
        embeddings_service = get_embeddings_service()
        qdrant_service = get_qdrant_service()
        
        # Génération de l'embedding de la requête
        query_embedding = await embeddings_service.generate_embedding(query)
        
        # Récupération des topics accessibles - CORRECTION
        from app.services.topic_service import TopicService
        topic_service = TopicService()
        user_topics = await topic_service.get_topics_for_user(db, current_user.id)
        topic_ids = [str(topic.id) for topic in user_topics]
        
        if not topic_ids:
            return {
                "message": "Aucun topic accessible pour la recherche",
                "query": query,
                "results": []
            }
        
        # Recherche sémantique
        search_results = await qdrant_service.search_similar_chunks(
            query_embedding=query_embedding,
            topic_filters=topic_ids,
            limit=limit,
            score_threshold=0.1  # Seuil bas pour les tests
        )
        
        return {
            "message": f"Recherche effectuée dans {len(topic_ids)} topics",
            "query": query,
            "topics_searched": len(topic_ids),
            "results_found": len(search_results),
            "results": search_results
        }
        
    except Exception as e:
        logger.error(f"Erreur test de recherche : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur recherche : {str(e)}")

# Endpoint pour diagnostics avancés (Admin seulement)
@router.get("/diagnostics")
async def get_diagnostics(
    admin_user: AdminUser = None
) -> Dict[str, Any]:
    """
    Diagnostics avancés du système RAG (Admin seulement).
    
    **Informations détaillées :**
    - Configuration des modèles
    - Performance des embeddings
    - Statistiques Qdrant détaillées
    - Métriques de mémoire et CPU
    """
    try:
        embeddings_service = get_embeddings_service()
        qdrant_service = get_qdrant_service()
        
        # Test de performance embedding
        import time
        test_text = "Ceci est un test de performance pour les embeddings."
        start_time = time.time()
        test_embedding = await embeddings_service.generate_embedding(test_text)
        embedding_time = time.time() - start_time
        
        # Statistiques détaillées
        diagnostics = {
            "embeddings": {
                "model_path": embeddings_service.model_path,
                "vector_dimension": len(test_embedding),
                "performance_test": {
                    "text_length": len(test_text),
                    "generation_time_ms": round(embedding_time * 1000, 2)
                }
            },
            "qdrant": await qdrant_service.get_collection_stats(),
            "system_ready": True
        }
        
        return {
            "message": "Diagnostics du système RAG",
            "diagnostics": diagnostics,
            "admin_user": admin_user.email
        }
        
    except Exception as e:
        logger.error(f"Erreur diagnostics : {e}")
        raise HTTPException(status_code=500, detail=f"Erreur diagnostics : {str(e)}")