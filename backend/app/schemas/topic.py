# app/schemas/topic.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.models.permissions import TopicPermission
import uuid

# === SCHEMAS DE REQUÊTE ===

class TopicCreate(BaseModel):
    """Schema pour créer un nouveau topic"""
    name: str = Field(..., min_length=2, max_length=100, description="Nom du topic")
    description: Optional[str] = Field(None, max_length=1000, description="Description optionnelle")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "name": "Ressources Humaines",
                "description": "Documents RH, procédures, contrats et politiques"
            }
        }
    )

class TopicUpdate(BaseModel):
    """Schema pour mettre à jour un topic"""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    is_active: Optional[bool] = None

# === SCHEMAS DE RÉPONSE ===

class UserBasic(BaseModel):
    """Schema utilisateur basique pour les relations"""
    id: uuid.UUID
    email: str
    full_name: str
    
    model_config = ConfigDict(from_attributes=True)

class TopicResponse(BaseModel):
    """Schema pour la réponse topic"""
    id: uuid.UUID
    name: str
    slug: str
    description: Optional[str]
    is_active: bool
    created_by: Optional[uuid.UUID]
    created_at: datetime
    updated_at: datetime
    
    # Relations optionnelles
    creator: Optional[UserBasic] = None
    document_count: Optional[int] = 0
    
    model_config = ConfigDict(from_attributes=True)

class TopicWithDocuments(TopicResponse):
    """Schema topic avec ses documents"""
    documents: List["DocumentResponse"] = []

class TopicPermissionResponse(BaseModel):
    """Schema pour les permissions d'un topic"""
    user_id: uuid.UUID
    topic_id: uuid.UUID
    permission: TopicPermission
    granted_by: Optional[uuid.UUID]
    created_at: datetime
    
    # Relations
    user: UserBasic
    
    model_config = ConfigDict(from_attributes=True)

class TopicWithPermissions(TopicResponse):
    """Schema topic avec ses permissions"""
    permissions: List[TopicPermissionResponse] = []

# === SCHEMAS POUR PERMISSIONS ===

class TopicPermissionCreate(BaseModel):
    """Schema pour accorder une permission"""
    user_id: uuid.UUID = Field(..., description="ID de l'utilisateur")
    permission: TopicPermission = Field(..., description="Type de permission")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "550e8400-e29b-41d4-a716-446655440000",
                "permission": "write"
            }
        }
    )

class TopicPermissionUpdate(BaseModel):
    """Schema pour modifier une permission"""
    permission: TopicPermission = Field(..., description="Nouveau type de permission")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "permission": "admin"
            }
        }
    )

# Pour éviter les références circulaires
from app.schemas.document import DocumentResponse
TopicWithDocuments.model_rebuild()