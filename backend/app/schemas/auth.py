# app/schemas/auth.py
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from app.models.user import UserRole
import uuid

# === SCHEMAS DE REQUÊTE ===

class UserRegister(BaseModel):
    """Schema pour l'inscription d'un utilisateur"""
    email: EmailStr = Field(..., description="Email de l'utilisateur")
    full_name: str = Field(..., min_length=2, max_length=100, description="Nom complet")
    password: str = Field(..., min_length=8, max_length=100, description="Mot de passe (min 8 caractères)")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "full_name": "John Doe",
                "password": "monmotdepasse123"
            }
        }
    )

class UserLogin(BaseModel):
    """Schema pour la connexion d'un utilisateur"""
    email: EmailStr = Field(..., description="Email de l'utilisateur")
    password: str = Field(..., description="Mot de passe")
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "john.doe@example.com",
                "password": "monmotdepasse123"
            }
        }
    )

# === SCHEMAS DE RÉPONSE ===

class UserResponse(BaseModel):
    """Schema pour la réponse utilisateur (sans mot de passe)"""
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: UserRole
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class TokenResponse(BaseModel):
    """Schema pour la réponse d'authentification"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int = Field(..., description="Durée de vie du token en secondes")
    user: UserResponse
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 86400,
                "user": {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "email": "john.doe@example.com",
                    "full_name": "John Doe",
                    "is_active": True,
                    "role": "USER",
                    "created_at": "2024-01-01T10:00:00Z",
                    "updated_at": "2024-01-01T10:00:00Z"
                }
            }
        }
    )

class TokenPayload(BaseModel):
    """Schema pour le payload du JWT token"""
    sub: str = Field(..., description="User ID")
    email: str
    role: str
    exp: datetime

# === SCHEMAS D'ERREUR ===

class ErrorResponse(BaseModel):
    """Schema pour les réponses d'erreur"""
    detail: str
    error_code: Optional[str] = None
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "detail": "Email déjà utilisé",
                "error_code": "EMAIL_ALREADY_EXISTS"
            }
        }
    )