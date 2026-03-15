# app/api/v1/topics.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.core.deps import CurrentUser, AdminUser
from app.schemas.topic import (
    TopicCreate, TopicUpdate, TopicResponse,
    TopicPermissionCreate, TopicPermissionResponse, TopicPermissionUpdate, UserBasic
)

from app.services.topic_service import topic_service
from app.models.permissions import TopicPermission

router = APIRouter(prefix="/topics", tags=["Topics"])

@router.post(
    "",  # CHANGÉ: "/" en "" pour éviter les redirections
    response_model=TopicResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_topic(
    topic_data: TopicCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Créer un nouveau topic (dossier métier)"""
    topic = await topic_service.create_topic(db, topic_data, current_user)
    return TopicResponse.model_validate(topic)

@router.get(
    "",  # CHANGÉ: "/" en "" pour éviter les redirections
    response_model=List[TopicResponse]
)
async def get_topics(
    skip: int = Query(0, ge=0, description="Nombre d'éléments à ignorer"),
    limit: int = Query(100, ge=1, le=1000, description="Nombre maximum d'éléments à retourner"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupérer tous les topics accessibles par l'utilisateur"""
    topics = await topic_service.get_topics_for_user(db, current_user.id, skip, limit)
    return [TopicResponse.model_validate(topic) for topic in topics]

@router.get(
    "/{topic_id}",
    response_model=TopicResponse
)
async def get_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Récupérer un topic spécifique"""
    topic = await topic_service.get_topic_by_id(db, topic_id, current_user)
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Topic non trouvé ou accès refusé"
        )
    return TopicResponse.model_validate(topic)

@router.patch(
    "/{topic_id}",
    response_model=TopicResponse
)
async def update_topic(
    topic_id: uuid.UUID,
    topic_data: TopicUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Mettre à jour un topic (nécessite permissions admin sur le topic)"""
    topic = await topic_service.update_topic(db, topic_id, topic_data, current_user)
    return TopicResponse.model_validate(topic)

@router.post(
    "/{topic_id}/permissions",
    response_model=TopicPermissionResponse,
    status_code=status.HTTP_201_CREATED
)
async def grant_topic_permission(
    topic_id: uuid.UUID,
    permission_data: TopicPermissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Accorder une permission à un utilisateur sur un topic"""
    permission = await topic_service.grant_permission(
        db=db,
        topic_id=topic_id,
        user_id=permission_data.user_id,
        permission=permission_data.permission,
        grantor=current_user
    )
    
    # ✅ Charger explicitement les relations user et grantor
    await db.refresh(permission, ["user", "grantor"])
    
    return TopicPermissionResponse.model_validate(permission)

@router.get(
    "/{topic_id}/check-permission/{permission_type}",
    response_model=dict
)
async def check_user_permission(
    topic_id: uuid.UUID,
    permission_type: TopicPermission,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """Vérifier si l'utilisateur a une permission spécifique sur un topic"""
    has_permission = await topic_service.check_topic_permission(
        db, topic_id, current_user.id, permission_type
    )
    return {
        "user_id": current_user.id,
        "topic_id": topic_id,
        "permission_type": permission_type,
        "has_permission": has_permission
    }

@router.delete(
    "/{topic_id}",
    status_code=status.HTTP_200_OK,
    summary="Supprimer un topic"
)
async def delete_topic(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Supprime un topic (soft delete : is_active = False)
    - **ADMIN**: Peut supprimer n'importe quel topic
    - **MANAGER/USER**: Accès refusé
    """
    await topic_service.delete_topic(db, topic_id, current_user)
    
    return {
        "message": "Topic supprimé avec succès",
        "topic_id": str(topic_id)
    }


@router.get(
    "/{topic_id}/permissions",
    response_model=List[TopicPermissionResponse],
    summary="Lister les permissions d'un topic"
)
async def get_topic_permissions(
    topic_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Récupère toutes les permissions accordées sur un topic
    - **ADMIN global**: Peut voir toutes les permissions
    - **ADMIN topic**: Peut voir les permissions de son topic
    - **MANAGER/USER**: Accès refusé
    """
    permissions = await topic_service.get_topic_permissions(db, topic_id, current_user)
    return [TopicPermissionResponse.model_validate(p) for p in permissions]


@router.delete(
    "/{topic_id}/permissions/{user_id}",
    status_code=status.HTTP_200_OK,
    summary="Révoquer une permission"
)
async def revoke_topic_permission(
    topic_id: uuid.UUID,
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Révoque l'accès d'un utilisateur à un topic
    - **ADMIN global**: Peut révoquer n'importe quelle permission
    - **ADMIN topic**: Peut révoquer les permissions de son topic
    - **MANAGER/USER**: Accès refusé
    """
    await topic_service.revoke_permission(db, topic_id, user_id, current_user)
    return {
        "message": "Permission révoquée avec succès",
        "user_id": str(user_id),
        "topic_id": str(topic_id)
    }


@router.patch(
    "/{topic_id}/permissions/{user_id}",
    response_model=TopicPermissionResponse,
    summary="Modifier une permission"
)
async def update_topic_permission(
    topic_id: uuid.UUID,
    user_id: uuid.UUID,
    permission_data: TopicPermissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Modifie le niveau de permission d'un utilisateur sur un topic
    - **ADMIN global**: Peut modifier n'importe quelle permission
    - **ADMIN topic**: Peut modifier les permissions de son topic
    - **MANAGER/USER**: Accès refusé
    """
    updated_permission = await topic_service.update_permission(
        db, topic_id, user_id, permission_data.permission, current_user
    )
    
    # ✅ Charger explicitement les relations user et grantor
    await db.refresh(updated_permission, ["user", "grantor"])
    
    return TopicPermissionResponse.model_validate(updated_permission)


@router.get(
    "/{topic_id}/available-users",
    response_model=List[UserBasic],
    summary="Liste des utilisateurs sans accès au topic"
)
async def get_available_users_for_topic(
    topic_id: uuid.UUID,
    search: Optional[str] = Query(None, description="Recherche par nom ou email"),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = None
):
    """
    Récupère la liste des utilisateurs qui n'ont pas encore d'accès au topic
    Utile pour le modal "Ajouter un utilisateur"
    - **ADMIN global**: Peut voir tous les users disponibles
    - **ADMIN topic**: Peut voir tous les users disponibles pour son topic
    """
    users = await topic_service.get_available_users_for_topic(
        db, topic_id, current_user, search
    )
    return [UserBasic.model_validate(u) for u in users]