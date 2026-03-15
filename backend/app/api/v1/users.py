# app/api/v1/users.py
"""
Endpoints pour la gestion des utilisateurs
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from uuid import UUID

from app.db.database import get_db
from app.core.deps import CurrentUser
from app.schemas.user import (
    UserListResponse,
    UserDetailResponse,
    UserUpdate,
    UserRoleUpdate,
    UserStatsResponse,
    UserPermissionsResponse
)
from app.services.user_service import user_service
from app.core.permissions import get_role_permissions_summary
from app.models.user import UserRole

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "",
    response_model=List[UserListResponse],
    summary="Liste des utilisateurs"
)
async def list_users(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum d'éléments"),
    role: Optional[UserRole] = Query(None, description="Filtrer par rôle"),
    is_active: Optional[bool] = Query(None, description="Filtrer par statut actif"),
    search: Optional[str] = Query(None, description="Rechercher par email ou nom"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Récupère la liste des utilisateurs avec filtres
    - **ADMIN**: Voit tous les utilisateurs
    - **MANAGER**: Voit tous les utilisateurs
    - **USER**: Accès refusé
    """
    users = await user_service.list_users(
        db=db,
        requesting_user=current_user,
        skip=skip,
        limit=limit,
        role_filter=role,
        is_active_filter=is_active,
        search=search
    )
    
    return [UserListResponse.model_validate(user) for user in users]


@router.get(
    "/me",
    response_model=UserDetailResponse,
    summary="Profil utilisateur actuel"
)
async def get_current_user_profile(
    current_user: CurrentUser = None
):
    """
    Récupère le profil de l'utilisateur connecté
    - **Tous les rôles**: Accès à son propre profil
    """
    return UserDetailResponse.model_validate(current_user)


@router.get(
    "/me/permissions",
    response_model=UserPermissionsResponse,
    summary="Permissions de l'utilisateur actuel"
)
async def get_current_user_permissions(
    current_user: CurrentUser = None
):
    """
    Récupère les permissions de l'utilisateur connecté
    - **Tous les rôles**: Peut voir ses propres permissions
    """
    permissions = await user_service.get_user_permissions(current_user)
    
    return UserPermissionsResponse(
        user_id=current_user.id,
        role=current_user.role,
        permissions=permissions
    )


@router.get(
    "/stats",
    response_model=UserStatsResponse,
    summary="Statistiques des utilisateurs"
)
async def get_user_stats(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Récupère les statistiques globales des utilisateurs
    - **ADMIN**: Accès aux statistiques
    - **MANAGER/USER**: Accès refusé
    """
    return await user_service.get_user_statistics(db, current_user)


@router.get(
    "/{user_id}",
    response_model=UserDetailResponse,
    summary="Détails d'un utilisateur"
)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Récupère les détails d'un utilisateur
    - **ADMIN/MANAGER**: Peut voir n'importe quel utilisateur
    - **USER**: Peut voir uniquement son propre profil
    """
    user = await user_service.get_user_by_id(db, user_id, current_user)
    return UserDetailResponse.model_validate(user)


@router.patch(
    "/{user_id}",
    response_model=UserDetailResponse,
    summary="Modifier un utilisateur"
)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Met à jour les informations d'un utilisateur
    - **ADMIN**: Peut modifier n'importe quel utilisateur (y compris is_active)
    - **Autres**: Peuvent modifier leur propre profil (sauf is_active)
    """
    user = await user_service.update_user(db, user_id, user_data, current_user)
    return UserDetailResponse.model_validate(user)


@router.patch(
    "/{user_id}/role",
    response_model=UserDetailResponse,
    summary="Changer le rôle d'un utilisateur"
)
async def change_user_role(
    user_id: UUID,
    role_data: UserRoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Change le rôle d'un utilisateur
    - **ADMIN**: Peut changer n'importe quel rôle
    - **MANAGER/USER**: Accès refusé
    """
    user = await user_service.update_user_role(db, user_id, role_data, current_user)
    return UserDetailResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Désactiver un utilisateur"
)
async def deactivate_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Désactive un utilisateur (soft delete)
    - **ADMIN**: Peut désactiver n'importe quel utilisateur
    - **MANAGER/USER**: Accès refusé
    """
    user = await user_service.deactivate_user(db, user_id, current_user)
    
    return {
        "message": "Utilisateur désactivé avec succès",
        "user_id": str(user.id),
        "email": user.email
    }