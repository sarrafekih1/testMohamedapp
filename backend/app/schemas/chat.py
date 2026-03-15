# app/schemas/chat.py
from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict

# =====================================================
# SCHEMAS POUR CONVERSATIONS
# =====================================================

class ConversationCreate(BaseModel):
    """Schema pour créer une conversation"""
    title: Optional[str] = Field(None, max_length=200, description="Titre de la conversation")
    topic_ids: Optional[List[UUID]] = Field(default_factory=list, description="Topics associés")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Questions sur la politique RH",
                "topic_ids": ["123e4567-e89b-12d3-a456-426614174000"]
            }
        }
    )

class ConversationResponse(BaseModel):
    """Schema de réponse pour une conversation"""
    id: UUID
    title: str
    message_count: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    topic_ids: List[UUID] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)

class ConversationWithMessages(ConversationResponse):
    """Conversation avec ses messages"""
    messages: List['MessageResponse'] = Field(default_factory=list)

class ConversationStats(BaseModel):
    """Statistiques des conversations d'un utilisateur"""
    total_conversations: int
    total_messages: int
    user_messages: int
    ai_responses: int
    most_recent_conversation: Optional[str] = None

# =====================================================
# SCHEMAS POUR MESSAGES
# =====================================================

class MessageSend(BaseModel):
    """Schema pour envoyer un message"""
    content: str = Field(..., min_length=1, max_length=4000, description="Contenu du message")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "content": "Quelle est notre politique de congés annuels ?"
            }
        }
    )

class MessageResponse(BaseModel):
    """Schema de réponse pour un message"""
    id: UUID
    content: str
    is_from_user: bool
    created_at: datetime
    sources: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    processing_time: Optional[int] = Field(None, description="Temps de traitement en ms")
    token_count: Optional[int] = Field(None, description="Nombre de tokens utilisés")
    
    model_config = ConfigDict(from_attributes=True)

class ChatResponse(BaseModel):
    """Réponse complète après envoi d'un message"""
    user_message: Dict[str, Any]
    ai_response: Dict[str, Any]
    context_info: Dict[str, Any]
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_message": {
                    "id": "123e4567-e89b-12d3-a456-426614174001",
                    "content": "Quelle est notre politique de congés ?",
                    "timestamp": "2024-09-04T14:30:00Z"
                },
                "ai_response": {
                    "id": "123e4567-e89b-12d3-a456-426614174002",
                    "content": "Selon le Manuel des Politiques RH...",
                    "sources": [
                        {
                            "filename": "Manuel_RH.pdf",
                            "topic_name": "Ressources Humaines",
                            "page_number": 12,
                            "similarity_score": 0.85
                        }
                    ],
                    "processing_time_ms": 2500,
                    "timestamp": "2024-09-04T14:30:02Z"
                },
                "context_info": {
                    "rag_results_found": 3,
                    "topics_searched": 1,
                    "model_used": "mistral:7b",
                    "success": True
                }
            }
        }
    )

# =====================================================
# SCHEMAS UTILITAIRES
# =====================================================

class TopicBasicInfo(BaseModel):
    """Informations basiques d'un topic pour les conversations"""
    id: UUID
    name: str
    slug: str
    
    model_config = ConfigDict(from_attributes=True)

class ConversationUpdate(BaseModel):
    """Schema pour mettre à jour une conversation"""
    title: Optional[str] = Field(None, max_length=200)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "Discussion sur les politiques RH - Mise à jour"
            }
        }
    )

class ChatHealthCheck(BaseModel):
    """Schema pour le health check du système de chat"""
    llm_status: str
    qdrant_status: str
    embeddings_status: str
    overall_status: str
    available_models: List[str] = Field(default_factory=list)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "llm_status": "healthy",
                "qdrant_status": "healthy", 
                "embeddings_status": "healthy",
                "overall_status": "ready",
                "available_models": ["mistral:7b", "llama2:7b"]
            }
        }
    )

class RAGTestQuery(BaseModel):
    """Schema pour tester la recherche RAG"""
    query: str = Field(..., min_length=1, max_length=500)
    limit: Optional[int] = Field(default=5, ge=1, le=20)
    score_threshold: Optional[float] = Field(default=0.3, ge=0.0, le=1.0)
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "query": "politique de congés",
                "limit": 3,
                "score_threshold": 0.4
            }
        }
    )

# Fix pour les références circulaires
ConversationWithMessages.model_rebuild()