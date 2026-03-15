# app/services/chat_service.py
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message, ConversationTopic
from app.models.topic import Topic
from app.services.qdrant_service import QdrantService
from app.services.llm_service import LLMService
from app.services.embeddings_service import EmbeddingsService
from app.services.topic_service import TopicService
from app.models.permissions import TopicPermission  # Ajouter cet import

from fastapi import HTTPException

class ChatService:
    """Service orchestrateur pour conversations RAG intelligentes"""
    
    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: UUID,
        title: str,
        topic_ids: List[UUID] = None
    ) -> Conversation:
        """Créer une nouvelle conversation avec topics optionnels"""
        
        # Valider que l'utilisateur a accès aux topics
        if topic_ids:
            for topic_id in topic_ids:
                # has_access = await TopicService.check_topic_permission(
                #     db, user_id, topic_id, "read"
                # )
                has_access = await TopicService.check_topic_permission(
                    db, topic_id, user_id, TopicPermission.READ  # Ordre corrigé + enum
                )
                if not has_access:
                    raise HTTPException(403, f"Accès refusé au topic {topic_id}")
                
        # Créer la conversation
        conversation = Conversation(
            id=uuid4(),
            title=title or "Nouvelle conversation",
            user_id=user_id,
            message_count=0,
            created_at=datetime.utcnow()
        )
        
        db.add(conversation)
        await db.flush()
        
        # Associer aux topics si spécifiés
        if topic_ids:
            for topic_id in topic_ids:
                conv_topic = ConversationTopic(
                    conversation_id=conversation.id,
                    topic_id=topic_id,
                    added_at=datetime.utcnow()
                )
                db.add(conv_topic)
        
        await db.commit()
        await db.refresh(conversation)
        
        return conversation
    
    @staticmethod
    async def get_user_conversations(
        db: AsyncSession,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20
    ) -> List[Conversation]:
        """Récupérer les conversations d'un utilisateur"""
        
        stmt = (
            select(Conversation)
            .filter(Conversation.user_id == user_id)
            .options(
                selectinload(Conversation.topics),
                selectinload(Conversation.messages)
            )
            .order_by(desc(Conversation.updated_at))
            .offset(skip)
            .limit(limit)
        )
        
        result = await db.execute(stmt)
        return result.scalars().all()
    
    @staticmethod
    async def get_conversation_by_id(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID
    ) -> Optional[Conversation]:
        """Récupérer une conversation spécifique avec vérification permissions"""
        
        stmt = (
            select(Conversation)
            .filter(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id
            )
            .options(
                selectinload(Conversation.topics),
                selectinload(Conversation.messages)
            )
        )
        
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def send_message(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
        content: str
    ) -> Dict[str, Any]:
        """
        Envoyer un message et générer la réponse IA via RAG + LLM
        
        Returns:
            Dict avec user_message, ai_response, sources, processing_time, etc.
        """
        start_time = time.time()
        
        # 1. Vérifier que la conversation appartient à l'utilisateur
        conversation = await ChatService.get_conversation_by_id(db, conversation_id, user_id)
        if not conversation:
            raise HTTPException(404, "Conversation non trouvée")
        
        # 2. Récupérer les topics associés à cette conversation
        topic_ids = [str(ct.id) for ct in conversation.topics]
        
        # Si pas de topics, utiliser tous les topics accessibles par l'user
        if not topic_ids:
            topics = await TopicService.get_topics_for_user(db, user_id, skip=0, limit=100)
            topic_ids = [str(topic.id) for topic in topics]
        else:
            topic_ids = [str(tid) for tid in topic_ids]
        
        # 3. Sauvegarder le message utilisateur
        user_message = Message(
            id=uuid4(),
            conversation_id=conversation_id,
            content=content,
            is_from_user=True,
            created_at=datetime.utcnow()
        )
        db.add(user_message)
        
        try:
            # 4. Recherche RAG dans Qdrant
            qdrant_service = QdrantService()
            embeddings_service = EmbeddingsService()

            # Générer l'embedding de la query
            query_embedding = await embeddings_service.generate_embedding(content)

            rag_results = await qdrant_service.search_similar_chunks(
                query_embedding=query_embedding,  # Vecteur, pas texte
                topic_filters=topic_ids,
                limit=5,
                score_threshold=0.3
            )
            
            # 5. Récupérer l'historique récent pour le contexte
            history_stmt = (
                select(Message)
                .filter(Message.conversation_id == conversation_id)
                .order_by(desc(Message.created_at))
                .limit(6)  # 3 derniers échanges (6 messages)
            )
            history_result = await db.execute(history_stmt)
            recent_messages = list(reversed(history_result.scalars().all()))
            
            history = [
                {
                    "content": msg.content,
                    "is_from_user": msg.is_from_user
                }
                for msg in recent_messages[:-1]  # Exclure le message qu'on vient d'ajouter
            ]
            
            # 6. Génération de la réponse avec LLM
            # llm_service = LLMService()
            # llm_response = await llm_service.generate_response(
            #     query=content,
            #     context_chunks=rag_results,
            #     conversation_history=history
            # )
            # Génération de la réponse avec LLM
            try:
                print(f"DEBUG: Avant appel LLM...")
                llm_service = LLMService()
                llm_response = await llm_service.generate_response(
                    query=content,
                    context_chunks=rag_results,
                    conversation_history=history
                )
                print(f"DEBUG: LLM response success = {llm_response.get('success')}")
            except Exception as e:
                print(f"DEBUG: Erreur LLM = {type(e).__name__}: {e}")
                llm_response = {"success": False, "error": f"LLM Error: {str(e)}"}
            
            # 7. Créer le message IA
            sources = []
            if llm_response.get("success"):
                ai_content = llm_response["response"]
                sources = llm_response.get("sources", [])
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                ai_message = Message(
                    id=uuid4(),
                    conversation_id=conversation_id,
                    content=ai_content,
                    is_from_user=False,
                    sources=sources,
                    processing_time=processing_time_ms,
                    token_count=llm_response.get("completion_tokens", 0),
                    created_at=datetime.utcnow()
                )
                db.add(ai_message)
                
            else:
                # Réponse d'erreur si le LLM a échoué
                ai_content = f"Désolé, j'ai rencontré une erreur : {llm_response.get('error', 'Erreur inconnue')}"
                processing_time_ms = int((time.time() - start_time) * 1000)
                
                ai_message = Message(
                    id=uuid4(),
                    conversation_id=conversation_id,
                    content=ai_content,
                    is_from_user=False,
                    processing_time=processing_time_ms,
                    created_at=datetime.utcnow()
                )
                db.add(ai_message)
            
            # 8. Mettre à jour les compteurs de conversation
            conversation.message_count += 2  # User + AI message
            conversation.updated_at = datetime.utcnow()
            
            await db.commit()
            
            # 9. Retourner le résultat complet
            return {
                "user_message": {
                    "id": str(user_message.id),
                    "content": user_message.content,
                    "timestamp": user_message.created_at.isoformat()
                },
                "ai_response": {
                    "id": str(ai_message.id),
                    "content": ai_message.content,
                    "sources": sources if llm_response.get("success") else [],
                    "processing_time_ms": processing_time_ms,
                    "token_count": ai_message.token_count,
                    "timestamp": ai_message.created_at.isoformat()
                },
                "context_info": {
                    "rag_results_found": len(rag_results),
                    "topics_searched": len(topic_ids),
                    "model_used": llm_response.get("model_used"),
                    "success": llm_response.get("success", False)
                }
            }
            
        except Exception as e:
            # En cas d'erreur, créer quand même un message d'erreur
            error_message = Message(
                id=uuid4(),
                conversation_id=conversation_id,
                content=f"Une erreur s'est produite lors du traitement de votre demande : {str(e)}",
                is_from_user=False,
                processing_time=int((time.time() - start_time) * 1000),
                created_at=datetime.utcnow()
            )
            db.add(error_message)
            conversation.message_count += 2
            conversation.updated_at = datetime.utcnow()
            
            await db.commit()
            
            raise HTTPException(500, f"Erreur lors du traitement du message : {str(e)}")
    
    @staticmethod
    async def delete_conversation(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID
    ) -> bool:
        """Supprimer une conversation avec tous ses messages"""
        
        # Vérifier propriété
        conversation = await ChatService.get_conversation_by_id(db, conversation_id, user_id)
        if not conversation:
            return False
        
        # Suppression en cascade configurée dans les modèles
        await db.delete(conversation)
        await db.commit()
        
        return True
    
    @staticmethod
    async def update_conversation_title(
        db: AsyncSession,
        conversation_id: UUID,
        user_id: UUID,
        new_title: str
    ) -> Optional[Conversation]:
        """Mettre à jour le titre d'une conversation"""
        
        conversation = await ChatService.get_conversation_by_id(db, conversation_id, user_id)
        if not conversation:
            return None
        
        conversation.title = new_title
        conversation.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(conversation)
        
        return conversation
    
    @staticmethod
    async def get_conversation_stats(db: AsyncSession, user_id: UUID) -> Dict[str, Any]:
        """Statistiques des conversations d'un utilisateur"""
        
        # Compter conversations
        conv_stmt = select(Conversation).filter(Conversation.user_id == user_id)
        conv_result = await db.execute(conv_stmt)
        conversations = conv_result.scalars().all()
        
        # Compter messages
        total_messages = sum(conv.message_count for conv in conversations)
        user_messages = total_messages // 2 if total_messages > 0 else 0  # Approximation
        
        return {
            "total_conversations": len(conversations),
            "total_messages": total_messages,
            "user_messages": user_messages,
            "ai_responses": total_messages - user_messages,
            "most_recent_conversation": max(
                [conv.updated_at for conv in conversations], 
                default=None
            ).isoformat() if conversations else None
        }