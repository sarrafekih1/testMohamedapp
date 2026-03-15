# app/api/v1/chat.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID

from app.core.deps import get_db, CurrentUser
from app.schemas.chat import (
    ConversationCreate, ConversationResponse, ConversationWithMessages,
    MessageSend, ChatResponse, ConversationStats, ConversationUpdate,
    ChatHealthCheck, RAGTestQuery
)
from app.services.chat_service import ChatService
from app.services.llm_service import LLMService
from app.services.qdrant_service import QdrantService
from app.services.embeddings_service import EmbeddingsService

router = APIRouter(prefix="/chat", tags=["Chat & Conversations"])

# =====================================================
# ENDPOINTS CONVERSATIONS
# =====================================================

@router.post("", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    conversation_data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Créer une nouvelle conversation"""
    
    # Si pas de titre spécifié, générer un titre basique
    title = conversation_data.title or "Nouvelle conversation"
    
    conversation = await ChatService.create_conversation(
        db=db,
        user_id=current_user.id,
        title=title,
        topic_ids=conversation_data.topic_ids
    )
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        topic_ids=conversation_data.topic_ids or []  # Utiliser les données d'entrée
    )

@router.get("", response_model=List[ConversationResponse])
async def get_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupérer les conversations de l'utilisateur"""
    
    conversations = await ChatService.get_user_conversations(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit
    )
    
    return [
        ConversationResponse(
            id=conv.id,
            title=conv.title,
            message_count=conv.message_count,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
            topic_ids=[str(ct.id) for ct in conv.topics]  # ✅ FIX UNIQUE
        )
        for conv in conversations
    ]

@router.get("/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation_details(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupérer les détails d'une conversation avec ses messages"""
    
    conversation = await ChatService.get_conversation_by_id(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    # Sérialiser manuellement pour éviter les problèmes SQLAlchemy async
    messages = []
    for msg in conversation.messages:
        sources = []
        if msg.sources:
            try:
                import json
                sources = json.loads(msg.sources)
            except:
                sources = []
        
        messages.append({
            "id": msg.id,
            "content": msg.content,
            "is_from_user": msg.is_from_user,
            "created_at": msg.created_at,
            "sources": sources,
            "processing_time": msg.processing_time,
            "token_count": msg.token_count
        })
    
    return ConversationWithMessages(
        id=conversation.id,
        title=conversation.title,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        topic_ids=[ct.id for ct in conversation.topics],
        messages=messages
    )

@router.patch("/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    update_data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Mettre à jour une conversation (titre)"""
    
    if not update_data.title:
        raise HTTPException(status_code=400, detail="Au moins un champ à mettre à jour requis")
    
    conversation = await ChatService.update_conversation_title(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        new_title=update_data.title
    )
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        message_count=conversation.message_count,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        #topic_ids=[ct.topic_id for ct in conversation.topics]
        topic_ids=[str(ct.id) for ct in conversation.topics]  # ✅ FIX ICI AUSSI

    )

@router.delete("/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Supprimer une conversation"""
    
    deleted = await ChatService.delete_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id
    )
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation non trouvée")

# =====================================================
# ENDPOINTS MESSAGES & CHAT
# =====================================================

@router.post("/{conversation_id}/messages", response_model=ChatResponse)
async def send_message(
    conversation_id: UUID,
    message_data: MessageSend,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Envoyer un message et recevoir la réponse IA
    
    Cet endpoint orchestre tout le pipeline RAG :
    1. Recherche sémantique dans les documents
    2. Génération de réponse avec LLM
    3. Sauvegarde historique
    4. Retour avec sources et métadonnées
    """
    
    try:
        result = await ChatService.send_message(
            db=db,
            conversation_id=conversation_id,
            user_id=current_user.id,
            content=message_data.content
        )
        
        return ChatResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors du traitement du message : {str(e)}"
        )

# =====================================================
# ENDPOINTS UTILITAIRES & STATS
# =====================================================

@router.get("/stats/user", response_model=ConversationStats)
async def get_user_chat_stats(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Statistiques des conversations de l'utilisateur"""
    
    stats = await ChatService.get_conversation_stats(db, current_user.id)
    return ConversationStats(**stats)

@router.get("/health/system", response_model=ChatHealthCheck)
async def check_chat_system_health():
    """Vérifier la santé du système de chat complet"""
    
    # Vérifier LLM (Ollama)
    llm_service = LLMService()
    llm_health = await llm_service.health_check()
    llm_status = llm_health.get("status", "unhealthy")
    
    # Vérifier Qdrant
    # Vérifier Qdrant avec debug
    try:
        qdrant_service = QdrantService()
        qdrant_health = await qdrant_service.health_check()
        print(f"DEBUG: Qdrant health = {qdrant_health}")
        qdrant_status = "healthy" if qdrant_health.get("status") in ["healthy", "green"] else "unhealthy"
    except Exception as e:
        print(f"DEBUG: Qdrant error = {e}")
        qdrant_status = "unhealthy"
    
    # Vérifier service embeddings (simple test)
    try:
        embeddings_service = EmbeddingsService()
        test_embedding = await embeddings_service.generate_embedding("test")
        embeddings_status = "healthy" if len(test_embedding) > 0 else "unhealthy"
    except:
        embeddings_status = "unhealthy"
    
    # Statut général
    all_healthy = all([
        llm_status == "healthy",
        qdrant_status == "healthy", 
        embeddings_status == "healthy"
    ])
    overall_status = "ready" if all_healthy else "degraded"
    
    return ChatHealthCheck(
        llm_status=llm_status,
        qdrant_status=qdrant_status,
        embeddings_status=embeddings_status,
        overall_status=overall_status,
        available_models=llm_health.get("available_models", [])
    )

@router.post("/test/rag", response_model=dict)
async def test_rag_search(
    query_data: RAGTestQuery,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Tester la recherche RAG sans génération de réponse
    
    Utile pour debug et validation du système de recherche sémantique
    """
    
    # Récupérer les topics accessibles par l'utilisateur
    from app.services.topic_service import TopicService
    topics = await TopicService.get_topics_for_user(db, current_user.id, skip=0, limit=100)
    topic_ids = [str(topic.id) for topic in topics]
    
    if not topic_ids:
        return {
            "query": query_data.query,
            "results": [],
            "message": "Aucun topic accessible pour la recherche"
        }
    
    # Effectuer recherche RAG
    try:
        qdrant_service = QdrantService()
        # Générer embedding pour la recherche
        embeddings_service = EmbeddingsService()
        query_embedding = await embeddings_service.generate_embedding(query_data.query)

        results = await qdrant_service.search_similar_chunks(
            query_embedding=query_embedding,  # Vecteur généré
            topic_filters=topic_ids,
            limit=query_data.limit,
            score_threshold=query_data.score_threshold
        )
        
        return {
            "query": query_data.query,
            "results_found": len(results),
            "topics_searched": len(topic_ids),
            "results": [
                {
                    "content": result["content"][:200] + "..." if len(result["content"]) > 200 else result["content"],
                    "score": result["score"],
                    "filename": result.get("filename", "N/A"),
                    "topic_name": result.get("topic_name", "N/A"),
                    "page_number": result.get("page_number")
                }
                for result in results
            ],
            "search_params": {
                "limit": query_data.limit,
                "score_threshold": query_data.score_threshold
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la recherche RAG : {str(e)}"
        )