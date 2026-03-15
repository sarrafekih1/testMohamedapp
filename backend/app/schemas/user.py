# app/schemas/user.py
"""
Schémas Pydantic pour la gestion des utilisateurs
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional
from datetime import datetime
from uuid import UUID

from app.models.user import UserRole


# ============= REQUEST SCHEMAS =============

class UserUpdate(BaseModel):
    """Schéma pour la mise à jour d'un utilisateur"""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    is_active: Optional[bool] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Jean Dupont",
                "is_active": True
            }
        }
    )


class UserRoleUpdate(BaseModel):
    """Schéma pour changer le rôle d'un utilisateur"""
    role: UserRole = Field(..., description="Nouveau rôle de l'utilisateur")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "role": "manager"
            }
        }
    )


# ============= RESPONSE SCHEMAS =============

class UserListResponse(BaseModel):
    """Schéma pour la liste des utilisateurs"""
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "user@example.com",
                "full_name": "Jean Dupont",
                "role": "user",
                "is_active": True,
                "created_at": "2024-01-01T00:00:00Z"
            }
        }
    )


class UserDetailResponse(BaseModel):
    """Schéma détaillé d'un utilisateur"""
    id: UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UserStatsResponse(BaseModel):
    """Statistiques globales des utilisateurs"""
    total_users: int = Field(..., description="Nombre total d'utilisateurs")
    admins_count: int = Field(..., description="Nombre d'administrateurs")
    managers_count: int = Field(..., description="Nombre de gestionnaires")
    users_count: int = Field(..., description="Nombre d'utilisateurs simples")
    active_users: int = Field(..., description="Nombre d'utilisateurs actifs")
    inactive_users: int = Field(..., description="Nombre d'utilisateurs inactifs")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_users": 100,
                "admins_count": 5,
                "managers_count": 15,
                "users_count": 80,
                "active_users": 95,
                "inactive_users": 5
            }
        }
    )


class UserPermissionsResponse(BaseModel):
    """Permissions d'un utilisateur"""
    user_id: UUID
    role: UserRole
    permissions: dict

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "role": "manager",
                "permissions": {
                    "can_create_topic": True,
                    "can_delete_topic": False,
                    "can_manage_users": False
                }
            }
        }
    )