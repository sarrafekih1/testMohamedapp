# app/services/document_service.py
import uuid
import asyncio
from datetime import datetime
from typing import List, Optional, Tuple
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from fastapi import UploadFile, HTTPException, status

from app.models.user import User
from app.models.topic import Topic  
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.permissions import TopicPermission

from app.core.storage import StorageService
from app.services.chunking_service import ChunkingService
from app.services.processors import PDFProcessor, WordProcessor, ExcelProcessor, TextProcessor
from app.services.processors.pdf_processor import ExtractedContent
from app.services.topic_service import TopicService
from app.core.permissions import can_delete_any_document

class DocumentService:
    """Service principal de gestion des documents"""
    
    # Processeurs par type de contenu
    PROCESSORS = {
        'application/pdf': PDFProcessor,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': WordProcessor,
        'application/msword': WordProcessor,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ExcelProcessor,
        'application/vnd.ms-excel': ExcelProcessor,
        'text/plain': TextProcessor,
        'text/markdown': TextProcessor,
        'application/rtf': TextProcessor
    }
    
    @staticmethod
    async def upload_document(
        db: AsyncSession,
        file: UploadFile,
        topic_id: str,
        user: User
    ) -> Document:
        """Upload et traitement complet d'un document"""
        
        # 1. Vérifier les permissions sur le topic
        try:
            topic_uuid = uuid.UUID(topic_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="ID topic invalide")
        
        # Vérifier que l'utilisateur a au moins les droits WRITE sur le topic
        has_permission = await TopicService.check_topic_permission(
            db, topic_uuid, user.id, TopicPermission.WRITE
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour uploader dans ce topic"
            )
        
        # 2. Créer l'enregistrement Document en base (status: UPLOADING)
        document_id = uuid.uuid4()
        
        db_document = Document(
            id=document_id,
            filename=f"{document_id}",  # Sera complété après validation
            original_filename=file.filename or "unknown",
            content_type="",  # Sera détecté
            file_size=0,     # Sera calculé
            file_path="",    # Sera défini après stockage
            status=DocumentStatus.UPLOADING,
            topic_id=topic_uuid,
            uploaded_by=user.id
        )
        
        db.add(db_document)
        await db.commit()
        await db.refresh(db_document)
        
        try:
            # 3. Valider et stocker le fichier
            await DocumentService._update_document_status(
                db, db_document, DocumentStatus.UPLOADING, "Validation et stockage du fichier"
            )
            
            file_path, file_size = await StorageService.save_file(
                file, topic_id, str(document_id)
            )
            
            # Détecter le type de contenu
            #content_type, extension = await StorageService.validate_file(file)
            # TEMPORARY: Get content_type from filename  
            if file.filename:
                if file.filename.endswith('.pdf'):
                    content_type = 'application/pdf'
                    extension = '.pdf'
                elif file.filename.endswith('.docx'):
                    content_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                    extension = '.docx'
                elif file.filename.endswith('.xlsx'):
                    content_type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                    extension = '.xlsx'
                elif file.filename.endswith('.txt'):
                    content_type = 'text/plain'
                    extension = '.txt'
                else:
                    content_type = 'text/plain'
                    extension = '.txt'
            else:
                content_type = 'text/plain'
                extension = '.txt'
            
            # 4. Mettre à jour les infos du document
            db_document.filename = f"{document_id}{extension}"
            db_document.content_type = content_type
            db_document.file_size = file_size
            db_document.file_path = file_path
            db_document.status = DocumentStatus.PROCESSING
            
            await db.commit()
            await db.refresh(db_document)
            
            # 5. Traitement asynchrone en arrière-plan
            # Pour le MVP, on fait du traitement synchrone
            await DocumentService._process_document_content(db, db_document)
            
            return db_document
            
        except Exception as e:
            print(f"DEBUG ERROR: {type(e).__name__}: {str(e)}")

            # En cas d'erreur, marquer le document comme erreur
            await DocumentService._update_document_status(
                db, db_document, DocumentStatus.ERROR, str(e)
            )
            
            # Supprimer le fichier s'il existe
            if db_document.file_path:
                await StorageService.delete_file(db_document.file_path)
            
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de l'upload: {str(e)}"
            )
    
    @staticmethod
    async def _process_document_content(db: AsyncSession, document: Document):
        """Traite le contenu d'un document : extraction + chunking"""
        
        start_time = datetime.utcnow()
        
        try:
            # 1. Extraire le texte selon le type de fichier
            processor_class = DocumentService.PROCESSORS.get(document.content_type)
            
            if not processor_class:
                raise Exception(f"Type de fichier non supporté pour le traitement: {document.content_type}")
            
            extracted_content: ExtractedContent = processor_class.extract_text(document.file_path)
            
            if not extracted_content.text.strip():
                raise Exception("Aucun texte extractible du document")
            
            # 2. Créer les chunks intelligents
            chunks = ChunkingService.create_chunks_from_pages(
                extracted_content.pages,
                chunk_size=500,  # 500 mots par chunk
                overlap=50       # 50 mots de chevauchement
            )
            
            if not chunks:
                raise Exception("Impossible de créer des chunks à partir du document")
            
            # 3. Sauvegarder les chunks en base de données
            for chunk in chunks:
                db_chunk = DocumentChunk(
                    id=uuid.uuid4(),
                    content=chunk.content,
                    chunk_index=chunk.chunk_index,
                    page_number=chunk.page_number,
                    start_char=chunk.start_char,
                    end_char=chunk.end_char,
                    word_count=chunk.word_count,
                    char_count=chunk.char_count,
                    chunk_metadata=chunk.metadata or {},
                    document_id=document.id
                )
                db.add(db_chunk)
            
            # 4. Mettre à jour le document avec les statistiques
            processing_duration = (datetime.utcnow() - start_time).total_seconds()
            
            document.status = DocumentStatus.READY
            document.total_chunks = len(chunks)
            document.processing_duration = processing_duration
            document.error_message = None
            
            await db.commit()
            
        except Exception as e:
            # En cas d'erreur de traitement
            processing_duration = (datetime.utcnow() - start_time).total_seconds()
            
            await DocumentService._update_document_status(
                db, document, DocumentStatus.ERROR, str(e)
            )
            
            document.processing_duration = processing_duration
            await db.commit()
            
            raise e
    
    @staticmethod
    async def get_documents_for_user(
        db: AsyncSession,
        user: User,
        topic_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Document]:
        """Récupère les documents accessibles par un utilisateur"""
        
        query = select(Document).options(
            selectinload(Document.topic),
            selectinload(Document.uploader)
        )
        
        if user.role.value != "admin":
            # Utilisateur normal : seulement ses documents avec permissions
            from app.models.permissions import UserTopicAccess
            
            query = query.join(Topic).join(UserTopicAccess).filter(
                UserTopicAccess.user_id == user.id
            )
        
        # Filtrer par topic si spécifié
        if topic_id:
            try:
                topic_uuid = uuid.UUID(topic_id)
                query = query.filter(Document.topic_id == topic_uuid)
            except ValueError:
                raise HTTPException(status_code=400, detail="ID topic invalide")
        
        # Trier par date de création décroissante
        query = query.order_by(Document.created_at.desc()).offset(skip).limit(limit)
        
        result = await db.execute(query)
        return result.scalars().all()
    
    @staticmethod
    async def get_document_by_id(
        db: AsyncSession,
        document_id: str,
        user: User
    ) -> Optional[Document]:
        """Récupère un document par ID avec vérification des permissions"""
        
        try:
            doc_uuid = uuid.UUID(document_id)
        except ValueError:
            return None
        
        query = select(Document).options(
            selectinload(Document.topic),
            selectinload(Document.uploader)
        ).filter(Document.id == doc_uuid)
        
        if user.role.value != "admin":
            # Vérifier les permissions via le topic
            from app.models.permissions import UserTopicAccess
            
            query = query.join(Topic).join(UserTopicAccess).filter(
                UserTopicAccess.user_id == user.id
            )
        
        result = await db.execute(query)
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_document_chunks(
        db: AsyncSession,
        document_id: str,
        user: User
    ) -> List[DocumentChunk]:
        """Récupère les chunks d'un document"""
        
        # Vérifier d'abord l'accès au document
        document = await DocumentService.get_document_by_id(db, document_id, user)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document non trouvé ou accès refusé"
            )
        
        # Récupérer les chunks
        result = await db.execute(
            select(DocumentChunk)
            .filter(DocumentChunk.document_id == document.id)
            .order_by(DocumentChunk.chunk_index)
        )
        
        return result.scalars().all()
    
# Dans app/services/document_service.py
# Remplace la méthode delete_document par celle-ci :

  # ← AJOUTER CET IMPORT EN HAUT

    @staticmethod
    async def delete_document(
        db: AsyncSession,
        document_id: str,
        user: User
    ) -> bool:
        """
        Supprime un document et ses chunks
        - ADMIN: Peut supprimer n'importe quel document
        - MANAGER/USER: Peut supprimer SI propriétaire OU permission ADMIN sur topic
        """
        
        document = await DocumentService.get_document_by_id(db, document_id, user)
        
        if not document:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document non trouvé ou accès refusé"
            )
        
        # ← MODIFIÉ : Logique de vérification des permissions
        # ADMIN peut tout supprimer
        if can_delete_any_document(user):
            can_delete = True
        else:
            # Autres rôles : vérifier si propriétaire OU permission ADMIN sur topic
            is_owner = document.uploaded_by == user.id
            has_admin_permission = await TopicService.check_topic_permission(
                db, document.topic_id, user.id, TopicPermission.ADMIN
            )
            can_delete = is_owner or has_admin_permission
        
        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour supprimer ce document"
            )
        
        try:
            # 1. Supprimer les chunks
            chunks_result = await db.execute(
                select(DocumentChunk).filter(DocumentChunk.document_id == document.id)
            )
            chunks = chunks_result.scalars().all()
            
            for chunk in chunks:
                await db.delete(chunk)
            
            # 2. Supprimer le fichier physique
            if document.file_path:
                await StorageService.delete_file(document.file_path)
            
            # 3. Supprimer l'enregistrement document
            await db.delete(document)
            await db.commit()
            
            return True
            
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Erreur lors de la suppression: {str(e)}"
            )   


    @staticmethod
    async def get_document_stats(db: AsyncSession, user: User) -> dict:
        """Statistiques des documents pour un utilisateur"""
        
        query = select(func.count(Document.id), Document.status).group_by(Document.status)
        
        if user.role.value != "admin":
            from app.models.permissions import UserTopicAccess
            query = query.join(Topic).join(UserTopicAccess).filter(
                UserTopicAccess.user_id == user.id
            )
        
        result = await db.execute(query)
        stats_raw = result.all()
        
        stats = {
            'total': 0,
            'ready': 0,
            'processing': 0,
            'error': 0,
            'uploading': 0
        }
        
        for count, status in stats_raw:
            stats[status.value] = count
            stats['total'] += count
        
        return stats
    
    @staticmethod
    async def _update_document_status(
        db: AsyncSession,
        document: Document,
        status: DocumentStatus,
        error_message: Optional[str] = None
    ):
        """Met à jour le statut d'un document"""
        document.status = status
        if error_message:
            document.error_message = error_message
        
        await db.commit()
        await db.refresh(document)

# Instance globale
document_service = DocumentService()