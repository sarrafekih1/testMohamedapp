# app/services/topic_service.py
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy import or_
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status
import re

from app.models.user import User, UserRole
from app.models.topic import Topic
from app.models.permissions import UserTopicAccess, TopicPermission
from app.schemas.topic import TopicCreate, TopicUpdate, TopicResponse, TopicPermissionCreate
from app.core.permissions import can_create_topic, can_delete_topic  # ← NOUVEAU

def simple_slugify(text: str) -> str:
    """Fonction simple pour créer un slug sans dépendance externe"""
    slug = text.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    return slug

class TopicService:
    """Service métier pour la gestion des topics"""
    
    @staticmethod
    async def create_topic(
        db: AsyncSession,
        topic_data: TopicCreate,
        creator: User
    ) -> Topic:
        """
        Créer un nouveau topic
        - ADMIN: Peut créer
        - MANAGER: Peut créer
        - USER: NE PEUT PAS créer
        """
        # ← NOUVEAU : Vérification des permissions de création
        if not can_create_topic(creator):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas les permissions pour créer un topic. Seuls les administrateurs et gestionnaires peuvent créer des topics."
            )
        
        # Générer un slug unique
        base_slug = simple_slugify(topic_data.name)
        slug = base_slug
        counter = 1
        
        while True:
            existing = await db.execute(select(Topic).filter(Topic.slug == slug))
            if not existing.scalar_one_or_none():
                break
            slug = f"{base_slug}-{counter}"
            counter += 1
        
        # Créer le topic
        topic = Topic(
            name=topic_data.name,
            slug=slug,
            description=topic_data.description,
            created_by=creator.id,
            is_active=True
        )
        
        db.add(topic)
        await db.commit()
        await db.refresh(topic)
        
        # Donner automatiquement les permissions admin au créateur
        await TopicService.grant_permission(
            db=db,
            topic_id=topic.id,
            user_id=creator.id,
            permission=TopicPermission.ADMIN,
            grantor=creator,
            is_creator=True
        )
        
        return topic
    
    @staticmethod
    async def get_topics_for_user(
        db: AsyncSession, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[Topic]:
        """
        Récupère les topics accessibles pour un utilisateur.
        - ADMIN: Voit TOUS les topics
        - MANAGER: Voit TOUS les topics
        - USER: Voit uniquement SES topics (via permissions)
        """
        # Récupération de l'utilisateur
        user_query = select(User).filter(User.id == user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            return []
        
        # Admin et Manager voient tous les topics
        if user.role in [UserRole.ADMIN, UserRole.MANAGER]:  # ← MODIFIÉ
            query = select(Topic).options(selectinload(Topic.creator)).filter(Topic.is_active == True).order_by(
                Topic.created_at.desc()
            ).offset(skip).limit(limit)
        else:
            # Utilisateurs standards : seulement topics avec permissions
            query = select(Topic).options(selectinload(Topic.creator)).join(
                UserTopicAccess, UserTopicAccess.topic_id == Topic.id
            ).filter(
                UserTopicAccess.user_id == user_id,
                Topic.is_active == True
            ).order_by(
                Topic.created_at.desc()
            ).offset(skip).limit(limit)
        
        result = await db.execute(query)
        topics = result.scalars().all()
        
        return list(topics)
    
    @staticmethod
    async def get_topic_by_id(
        db: AsyncSession,
        topic_id: UUID,
        user: User
    ) -> Optional[Topic]:
        """
        Récupérer un topic par ID avec vérification des permissions
        - ADMIN/MANAGER: Peut voir tous les topics
        - USER: Uniquement les topics avec permissions
        """
        
        # Admin et Manager peuvent voir tous les topics
        if user.role in [UserRole.ADMIN, UserRole.MANAGER]:  # ← MODIFIÉ
            result = await db.execute(
                select(Topic)
                .options(selectinload(Topic.creator))
                .filter(Topic.id == topic_id)
            )
            return result.scalar_one_or_none()
        
        # Autres utilisateurs : vérifier les permissions
        result = await db.execute(
            select(Topic)
            .options(selectinload(Topic.creator))
            .join(UserTopicAccess)
            .filter(
                and_(
                    Topic.id == topic_id,
                    UserTopicAccess.user_id == user.id
                )
            )
        )
        return result.scalar_one_or_none()
    
    @staticmethod
    async def update_topic(
        db: AsyncSession,
        topic_id: UUID,
        topic_data: TopicUpdate,
        user: User
    ) -> Topic:
        """
        Mettre à jour un topic
        - ADMIN: Peut modifier n'importe quel topic
        - MANAGER: Peut modifier SI permission ADMIN sur le topic
        - USER: NE PEUT PAS modifier
        """
        
        # ← NOUVEAU : Vérifier le rôle avant même de vérifier les permissions
        if user.role == UserRole.USER:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Les utilisateurs simples ne peuvent pas modifier de topics"
            )
        
        # ADMIN peut tout modifier
        if user.role == UserRole.ADMIN:
            has_permission = True
        else:
            # MANAGER doit avoir permission ADMIN sur le topic
            has_permission = await TopicService.check_topic_permission(
                db, topic_id, user.id, TopicPermission.ADMIN
            )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour modifier ce topic"
            )
        
        # Récupérer le topic
        result = await db.execute(select(Topic).filter(Topic.id == topic_id))
        topic = result.scalar_one_or_none()
        
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic non trouvé"
            )
        
        # Mettre à jour les champs
        update_data = topic_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "name" and value:
                topic.slug = simple_slugify(value)
            setattr(topic, field, value)
        
        await db.commit()
        await db.refresh(topic)
        
        return topic
    
    @staticmethod
    async def delete_topic(
        db: AsyncSession,
        topic_id: UUID,
        user: User
    ) -> bool:
        """
        Supprimer un topic (soft delete : is_active = False)
        - ADMIN uniquement
        - MANAGER/USER: NE PEUVENT PAS supprimer
        """
        # Vérifier les permissions
        if not can_delete_topic(user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent supprimer des topics"
            )
        
        # Récupérer le topic
        result = await db.execute(select(Topic).filter(Topic.id == topic_id))
        topic = result.scalar_one_or_none()
        
        if not topic:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Topic non trouvé"
            )
        
        # Soft delete
        topic.is_active = False
        await db.commit()
        
        return True
    
    @staticmethod
    async def check_topic_permission(
        db: AsyncSession,
        topic_id: UUID,
        user_id: UUID,
        required_permission: TopicPermission
    ) -> bool:
        """Vérifier si un utilisateur a une permission sur un topic"""
        
        result = await db.execute(
            select(UserTopicAccess)
            .filter(
                and_(
                    UserTopicAccess.topic_id == topic_id,
                    UserTopicAccess.user_id == user_id
                )
            )
        )
        access = result.scalar_one_or_none()
        
        if not access:
            return False
        
        # Hiérarchie des permissions : admin > write > read
        permission_hierarchy = {
            TopicPermission.READ: 1,
            TopicPermission.WRITE: 2,
            TopicPermission.ADMIN: 3
        }
        
        return permission_hierarchy[access.permission] >= permission_hierarchy[required_permission]
    
    @staticmethod
    async def grant_permission(
        db: AsyncSession,
        topic_id: UUID,
        user_id: UUID,
        permission: TopicPermission,
        grantor: User,
        is_creator: bool = False
    ) -> UserTopicAccess:
        """
        Accorder une permission à un utilisateur sur un topic
        - ADMIN: Peut accorder n'importe quelle permission
        - MANAGER: Peut accorder SI permission ADMIN sur le topic
        - USER: NE PEUT PAS accorder de permissions
        """
        
        # Exception pour le créateur du topic
        if not is_creator:
            # ← MODIFIÉ : Vérification renforcée
            # ADMIN peut toujours accorder des permissions
            if grantor.role == UserRole.ADMIN:
                pass  # OK
            else:
                # MANAGER ou USER doivent avoir permission ADMIN sur le topic
                has_admin = await TopicService.check_topic_permission(
                    db, topic_id, grantor.id, TopicPermission.ADMIN
                )
                if not has_admin:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Permissions insuffisantes pour accorder des droits"
                    )
        
        # Vérifier si une permission existe déjà
        result = await db.execute(
            select(UserTopicAccess)
            .filter(
                and_(
                    UserTopicAccess.topic_id == topic_id,
                    UserTopicAccess.user_id == user_id
                )
            )
        )
        existing_access = result.scalar_one_or_none()
        
        if existing_access:
            # Mettre à jour la permission existante
            existing_access.permission = permission
            existing_access.granted_by = grantor.id
            await db.commit()
            await db.refresh(existing_access)
            return existing_access
        
        # Créer une nouvelle permission
        access = UserTopicAccess(
            user_id=user_id,
            topic_id=topic_id,
            permission=permission,
            granted_by=grantor.id
        )
        
        db.add(access)
        await db.commit()
        await db.refresh(access)
        
        return access

    @staticmethod
    async def get_topic_permissions(
        db: AsyncSession,
        topic_id: UUID,
        user: User
    ) -> List[UserTopicAccess]:
        """
        Récupère toutes les permissions d'un topic
        - ADMIN global: Peut voir toutes les permissions
        - ADMIN topic: Peut voir les permissions de son topic
        - Autres: Accès refusé
        """
        # ADMIN global peut voir toutes les permissions
        if user.role == UserRole.ADMIN:
            pass  # OK
        else:
            # Vérifier que l'utilisateur est ADMIN du topic
            has_admin = await TopicService.check_topic_permission(
                db, topic_id, user.id, TopicPermission.ADMIN
            )
            if not has_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permissions insuffisantes pour voir les accès de ce topic"
                )
        
        # Récupérer les permissions avec les infos utilisateurs
        result = await db.execute(
            select(UserTopicAccess)
            .options(
                selectinload(UserTopicAccess.user),
                selectinload(UserTopicAccess.grantor)
            )
            .filter(UserTopicAccess.topic_id == topic_id)
            .order_by(UserTopicAccess.created_at.desc())
        )
        
        permissions = result.scalars().all()
        return list(permissions)

    @staticmethod
    async def revoke_permission(
        db: AsyncSession,
        topic_id: UUID,
        user_id: UUID,
        revoker: User
    ) -> bool:
        """
        Révoque l'accès d'un utilisateur à un topic
        - ADMIN global: Peut révoquer n'importe quelle permission
        - ADMIN topic: Peut révoquer les permissions de son topic
        - Autres: Accès refusé
        """
        # ADMIN global peut tout révoquer
        if revoker.role == UserRole.ADMIN:
            pass  # OK
        else:
            # Vérifier que l'utilisateur est ADMIN du topic
            has_admin = await TopicService.check_topic_permission(
                db, topic_id, revoker.id, TopicPermission.ADMIN
            )
            if not has_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permissions insuffisantes pour révoquer des accès"
                )
        
        # Empêcher de se révoquer soi-même
        if user_id == revoker.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas révoquer votre propre accès"
            )
        
        # Trouver et supprimer la permission
        result = await db.execute(
            select(UserTopicAccess)
            .filter(
                and_(
                    UserTopicAccess.topic_id == topic_id,
                    UserTopicAccess.user_id == user_id
                )
            )
        )
        permission = result.scalar_one_or_none()
        
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission non trouvée"
            )
        
        await db.delete(permission)
        await db.commit()
        
        return True

    @staticmethod
    async def update_permission(
        db: AsyncSession,
        topic_id: UUID,
        user_id: UUID,
        new_permission: TopicPermission,
        updater: User
    ) -> UserTopicAccess:
        """
        Modifie le niveau de permission d'un utilisateur
        - ADMIN global: Peut modifier n'importe quelle permission
        - ADMIN topic: Peut modifier les permissions de son topic
        - Autres: Accès refusé
        """
        # ADMIN global peut tout modifier
        if updater.role == UserRole.ADMIN:
            pass  # OK
        else:
            # Vérifier que l'utilisateur est ADMIN du topic
            has_admin = await TopicService.check_topic_permission(
                db, topic_id, updater.id, TopicPermission.ADMIN
            )
            if not has_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permissions insuffisantes pour modifier les accès"
                )
        
        # Empêcher de se modifier soi-même (downgrade risqué)
        if user_id == updater.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas modifier votre propre permission"
            )
        
        # Trouver la permission existante
        result = await db.execute(
            select(UserTopicAccess)
            .filter(
                and_(
                    UserTopicAccess.topic_id == topic_id,
                    UserTopicAccess.user_id == user_id
                )
            )
        )
        permission = result.scalar_one_or_none()
        
        if not permission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Permission non trouvée"
            )
        
        # Mettre à jour
        permission.permission = new_permission
        permission.granted_by = updater.id
        
        await db.commit()
        await db.refresh(permission)
        
        return permission

    @staticmethod
    async def get_available_users_for_topic(
        db: AsyncSession,
        topic_id: UUID,
        requester: User,
        search: Optional[str] = None
    ) -> List[User]:
        """
        Récupère les utilisateurs qui n'ont pas encore d'accès au topic
        Utile pour le modal "Ajouter un utilisateur"
        """
        # Vérifier les permissions
        if requester.role == UserRole.ADMIN:
            pass  # OK
        else:
            has_admin = await TopicService.check_topic_permission(
                db, topic_id, requester.id, TopicPermission.ADMIN
            )
            if not has_admin:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Permissions insuffisantes"
                )
        
        # Récupérer les IDs des users ayant déjà accès
        existing_perms = await db.execute(
            select(UserTopicAccess.user_id)
            .filter(UserTopicAccess.topic_id == topic_id)
        )
        existing_user_ids = [row[0] for row in existing_perms.all()]
        
        # Construire la query de base
        query = select(User).filter(
            User.is_active == True,
            User.id.notin_(existing_user_ids) if existing_user_ids else True
        )
        
        # Ajouter la recherche si fournie
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern)
                )
            )
        
        # Limiter les résultats
        query = query.limit(50).order_by(User.full_name)
        
        result = await db.execute(query)
        users = result.scalars().all()
        
        return list(users)


# Instance globale
topic_service = TopicService()