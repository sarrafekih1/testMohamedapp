# app/api/v1/documents.py
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
from datetime import datetime

from app.db.database import get_db
from app.core.deps import CurrentUser
from app.services.document_service import document_service
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse, 
    DocumentUploadResponse,
    DocumentChunkResponse,
    DocumentWithChunks,
    GlobalDocumentStats,
    DocumentSearchResponse
)

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload d'un document",
    description="Upload un document dans un topic spécifique. Le document sera automatiquement traité et découpé en chunks."
)
async def upload_document(
    topic_id: str = Form(..., description="UUID du topic de destination"),
    file: UploadFile = File(..., description="Fichier à uploader (PDF, Word, Excel, TXT)"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Upload et traitement d'un document dans un topic"""
    
    # Valider l'extension du fichier
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nom de fichier requis"
        )
    
    # Upload et traitement
    document = await document_service.upload_document(db, file, topic_id, current_user)
    
    # Message selon le statut final
    if document.status.value == "ready":
        processing_status = f"Document traité avec succès. {document.total_chunks} chunks créés."
    elif document.status.value == "processing":
        processing_status = "Document en cours de traitement. Rechargez dans quelques instants."
    else:
        processing_status = "Document uploadé mais erreur de traitement. Vérifiez les détails."
    

    return DocumentUploadResponse(
        message="Document uploadé avec succès",
        #document=DocumentResponse.model_validate(document),
        document=DocumentResponse(
            id=document.id,
            filename=document.filename,
            original_filename=document.original_filename, 
            content_type=document.content_type,
            file_size=document.file_size,
            status=document.status,
            total_chunks=document.total_chunks,
            processing_duration=document.processing_duration,
            error_message=document.error_message,
            created_at=datetime.utcnow(),  # Fix temporaire
            updated_at=datetime.utcnow()   # Fix temporaire
        ),
        processing_status=processing_status
    )


@router.get(
    "",
    response_model=DocumentSearchResponse,
    summary="Liste des documents",
    description="Récupère la liste des documents accessibles à l'utilisateur avec pagination et filtres optionnels."
)
async def get_documents(
    topic_id: Optional[str] = Query(None, description="Filtrer par topic UUID"),
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum d'éléments à retourner"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupère la liste des documents accessibles"""
    
    documents = await document_service.get_documents_for_user(
        db, current_user, topic_id, skip, limit
    )
    
    # TODO: Implémenter le count total pour la pagination
    total = len(documents)  # Approximation pour le MVP
    
    return DocumentSearchResponse(
        documents=[DocumentDetailResponse.model_validate(doc) for doc in documents],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Détails d'un document",
    description="Récupère les détails complets d'un document spécifique."
)
async def get_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupère un document par son ID"""
    
    document = await document_service.get_document_by_id(db, document_id, current_user)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé ou accès refusé"
        )
    
    return DocumentDetailResponse.model_validate(document)


@router.get(
    "/{document_id}/chunks",
    response_model=List[DocumentChunkResponse],
    summary="Chunks d'un document",
    description="Récupère tous les chunks de texte d'un document pour inspection ou debugging."
)
async def get_document_chunks(
    document_id: str,
    skip: int = Query(0, ge=0, description="Nombre de chunks à ignorer"),
    limit: int = Query(100, ge=1, le=500, description="Nombre maximum de chunks à retourner"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupère les chunks d'un document"""
    
    chunks = await document_service.get_document_chunks(db, document_id, current_user)
    
    # Appliquer la pagination sur les chunks
    paginated_chunks = chunks[skip:skip + limit]
    
    #return [DocumentChunkResponse.model_validate(chunk) for chunk in paginated_chunks]
    result = []
    for chunk in paginated_chunks:
        result.append(DocumentChunkResponse(
            id=chunk.id,
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            page_number=chunk.page_number,
            start_char=chunk.start_char,
            end_char=chunk.end_char,
            word_count=chunk.word_count,
            char_count=chunk.char_count,
            metadata=chunk.chunk_metadata or {}  # Correct mapping
        ))
    return result


@router.get(
    "/{document_id}/with-chunks",
    response_model=DocumentWithChunks,
    summary="Document avec tous ses chunks",
    description="Récupère un document avec tous ses chunks inclus. Utile pour l'inspection complète."
)
async def get_document_with_chunks(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupère un document avec tous ses chunks"""
    
    # Récupérer le document
    document = await document_service.get_document_by_id(db, document_id, current_user)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé ou accès refusé"
        )
    
    # Récupérer les chunks
    chunks = await document_service.get_document_chunks(db, document_id, current_user)
    
    # Construire la réponse
    response_data = DocumentDetailResponse.model_validate(document).model_dump()
    response_data['chunks'] = [DocumentChunkResponse.model_validate(chunk) for chunk in chunks]
    
    return DocumentWithChunks(**response_data)


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Suppression d'un document",
    description="Supprime définitivement un document et tous ses chunks. Nécessite les permissions appropriées."
)
async def delete_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Supprime un document et ses chunks"""
    
    success = await document_service.delete_document(db, document_id, current_user)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors de la suppression"
        )
    
    # 204 No Content - pas de retour


@router.get(
    "/stats/global",
    response_model=GlobalDocumentStats,
    summary="Statistiques globales",
    description="Récupère les statistiques globales des documents accessibles à l'utilisateur."
)
async def get_document_stats(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Statistiques globales des documents"""
    
    stats = await document_service.get_document_stats(db, current_user)
    return GlobalDocumentStats(**stats)


@router.post(
    "/{document_id}/reprocess",
    response_model=DocumentResponse,
    summary="Retraitement d'un document",
    description="Force le retraitement d'un document (extraction de texte et rechunking)."
)
async def reprocess_document(
    document_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Retraite un document en cas d'erreur ou pour mise à jour"""
    
    document = await document_service.get_document_by_id(db, document_id, current_user)
    
    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document non trouvé ou accès refusé"
        )
    
    # Vérifier que l'utilisateur a les droits
    from app.services.topic_service import TopicService
    from app.models.permissions import TopicPermission
    
    has_permission = await TopicService.check_topic_permission(
        db, document.topic_id, current_user.id, TopicPermission.WRITE
    )
    
    if not (has_permission or current_user.role.value == "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissions insuffisantes"
        )
    
    try:
        # Supprimer les anciens chunks
        from app.models.chunk import DocumentChunk
        from sqlalchemy import select
        
        chunks_result = await db.execute(
            select(DocumentChunk).filter(DocumentChunk.document_id == document.id)
        )
        old_chunks = chunks_result.scalars().all()
        
        for chunk in old_chunks:
            await db.delete(chunk)
        
        # Remettre en traitement
        from app.models.document import DocumentStatus
        document.status = DocumentStatus.PROCESSING
        document.error_message = None
        document.total_chunks = None
        
        await db.commit()
        
        # Relancer le traitement
        await document_service._process_document_content(db, document)
        
        await db.refresh(document)
        return DocumentResponse.model_validate(document)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du retraitement: {str(e)}"
        )