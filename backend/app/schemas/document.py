# app/schemas/document.py
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
import uuid

from app.models.document import DocumentStatus


# Schemas de base
class UserBasic(BaseModel):
    """Utilisateur basique pour les relations"""
    id: uuid.UUID
    email: str
    full_name: str
    
    model_config = ConfigDict(from_attributes=True)


class TopicBasic(BaseModel):
    """Topic basique pour les relations"""
    id: uuid.UUID
    name: str
    slug: str
    
    model_config = ConfigDict(from_attributes=True)


# Schemas de réponse Document
class DocumentResponse(BaseModel):
    """Réponse de base pour un document"""
    id: uuid.UUID
    filename: str
    original_filename: str
    content_type: str
    file_size: int
    status: DocumentStatus
    total_chunks: Optional[int] = None
    processing_duration: Optional[float] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "filename": "rapport-rh.pdf",
                "original_filename": "Rapport RH 2024.pdf",
                "content_type": "application/pdf",
                "file_size": 2048576,
                "status": "ready",
                "total_chunks": 15,
                "processing_duration": 12.5,
                "error_message": None,
                "created_at": "2024-09-01T10:00:00Z",
                "updated_at": "2024-09-01T10:00:12Z"
            }
        }
    )


class DocumentDetailResponse(DocumentResponse):
    """Document avec relations complètes"""
    topic: TopicBasic
    uploader: UserBasic
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                **DocumentResponse.model_config["json_schema_extra"]["example"],
                "topic": {
                    "id": "456e7890-e89b-12d3-a456-426614174001",
                    "name": "Ressources Humaines",
                    "slug": "ressources-humaines"
                },
                "uploader": {
                    "id": "789e0123-e89b-12d3-a456-426614174002",
                    "email": "user@example.com",
                    "full_name": "John Doe"
                }
            }
        }
    )


# Schemas pour les chunks
class DocumentChunkResponse(BaseModel):
    """Réponse pour un chunk de document"""
    id: uuid.UUID
    content: str = Field(..., description="Contenu textuel du chunk")
    chunk_index: int = Field(..., description="Index du chunk dans le document")
    page_number: Optional[int] = Field(None, description="Numéro de page source")
    start_char: int = Field(..., description="Position de début dans le document")
    end_char: int = Field(..., description="Position de fin dans le document")
    word_count: int = Field(..., description="Nombre de mots")
    char_count: int = Field(..., description="Nombre de caractères")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Métadonnées JSON")
    
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "abc12345-e89b-12d3-a456-426614174003",
                "content": "Ce document présente les procédures RH en vigueur dans l'entreprise...",
                "chunk_index": 0,
                "page_number": 1,
                "start_char": 0,
                "end_char": 497,
                "word_count": 89,
                "char_count": 497,
                "metadata": {
                    "source_page": 1,
                    "page_char_count": 1250,
                    "page_word_count": 220
                }
            }
        }
    )


class DocumentWithChunks(DocumentDetailResponse):
    """Document avec tous ses chunks"""
    chunks: List[DocumentChunkResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


# Schemas pour les statistiques
class DocumentStatsResponse(BaseModel):
    """Statistiques d'un document"""
    document_id: uuid.UUID
    total_chunks: int
    total_words: int
    total_chars: int
    pages_count: int
    processing_duration: Optional[float] = None
    
    model_config = ConfigDict(from_attributes=True)


class GlobalDocumentStats(BaseModel):
    """Statistiques globales des documents"""
    total: int = Field(..., description="Nombre total de documents")
    ready: int = Field(..., description="Documents prêts")
    processing: int = Field(..., description="Documents en cours de traitement")
    error: int = Field(..., description="Documents en erreur")
    uploading: int = Field(..., description="Documents en cours d'upload")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total": 25,
                "ready": 20,
                "processing": 2,
                "error": 2,
                "uploading": 1
            }
        }
    )


class TopicDocumentStats(BaseModel):
    """Statistiques par topic"""
    topic_id: uuid.UUID
    topic_name: str
    document_count: int
    ready_count: int
    total_chunks: int
    
    model_config = ConfigDict(from_attributes=True)


# Schemas d'upload
class DocumentUploadResponse(BaseModel):
    """Réponse immédiate après upload"""
    message: str = Field(..., description="Message de confirmation")
    document: DocumentResponse
    processing_status: str = Field(..., description="Statut du traitement")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "message": "Document uploadé avec succès",
                "document": DocumentResponse.model_config["json_schema_extra"]["example"],
                "processing_status": "Le document est en cours de traitement. Rechargez dans quelques instants."
            }
        }
    )


# Schemas pour les erreurs
class DocumentError(BaseModel):
    """Erreur liée aux documents"""
    document_id: Optional[uuid.UUID] = None
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "document_id": "123e4567-e89b-12d3-a456-426614174000",
                "error_code": "EXTRACTION_FAILED",
                "message": "Impossible d'extraire le texte du document",
                "details": {
                    "content_type": "application/pdf",
                    "file_size": 2048576,
                    "error": "PDF corrompu ou protégé par mot de passe"
                }
            }
        }
    )


# Schemas pour les filtres et recherche
class DocumentFilter(BaseModel):
    """Filtres pour la recherche de documents"""
    topic_id: Optional[uuid.UUID] = Field(None, description="Filtrer par topic")
    status: Optional[DocumentStatus] = Field(None, description="Filtrer par statut")
    content_type: Optional[str] = Field(None, description="Filtrer par type de contenu")
    uploaded_by: Optional[uuid.UUID] = Field(None, description="Filtrer par uploadeur")
    date_from: Optional[datetime] = Field(None, description="Date de début")
    date_to: Optional[datetime] = Field(None, description="Date de fin")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "topic_id": "456e7890-e89b-12d3-a456-426614174001",
                "status": "ready",
                "content_type": "application/pdf",
                "date_from": "2024-01-01T00:00:00Z",
                "date_to": "2024-12-31T23:59:59Z"
            }
        }
    )


class DocumentSearchResponse(BaseModel):
    """Réponse de recherche avec pagination"""
    documents: List[DocumentDetailResponse]
    total: int = Field(..., description="Nombre total de résultats")
    skip: int = Field(..., description="Nombre d'éléments ignorés")
    limit: int = Field(..., description="Limite par page")
    
    model_config = ConfigDict(from_attributes=True)