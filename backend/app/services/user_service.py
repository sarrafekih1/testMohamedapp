# app/services/user_service.py
"""
Service métier pour la gestion des utilisateurs
"""
from typing import List, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from fastapi import HTTPException, status

from app.models.user import User, UserRole
from app.schemas.user import UserUpdate, UserRoleUpdate, UserStatsResponse
from app.core.permissions import get_role_permissions_summary


class UserService:
    """Service de gestion des utilisateurs"""

    @staticmethod
    async def list_users(
        db: AsyncSession,
        requesting_user: User,
        skip: int = 0,
        limit: int = 100,
        role_filter: Optional[UserRole] = None,
        is_active_filter: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[User]:
        """
        Liste les utilisateurs avec filtres
        - ADMIN: Voit tous les utilisateurs
        - MANAGER: Voit tous les utilisateurs
        - USER: Ne peut pas accéder à cette fonction
        """
        # Vérifier les permissions
        if requesting_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour voir la liste des utilisateurs"
            )

        # Construire la requête de base
        query = select(User)

        # Appliquer les filtres
        filters = []

        if role_filter:
            filters.append(User.role == role_filter)

        if is_active_filter is not None:
            filters.append(User.is_active == is_active_filter)

        if search:
            search_pattern = f"%{search}%"
            filters.append(
                or_(
                    User.email.ilike(search_pattern),
                    User.full_name.ilike(search_pattern)
                )
            )

        if filters:
            query = query.filter(and_(*filters))

        # Pagination et tri
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)

        # Exécuter la requête
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_user_by_id(
        db: AsyncSession,
        user_id: UUID,
        requesting_user: User
    ) -> Optional[User]:
        """
        Récupère un utilisateur par son ID
        - ADMIN/MANAGER: Peut voir n'importe quel utilisateur
        - USER: Ne peut voir que son propre profil
        """
        # Vérifier les permissions
        if requesting_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
            if requesting_user.id != user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Vous ne pouvez voir que votre propre profil"
                )

        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )

        return user

    @staticmethod
    async def update_user(
        db: AsyncSession,
        user_id: UUID,
        user_data: UserUpdate,
        requesting_user: User
    ) -> User:
        """
        Met à jour un utilisateur
        - ADMIN: Peut modifier n'importe quel utilisateur
        - Autres: Peuvent modifier leur propre profil (sauf is_active)
        """
        # Récupérer l'utilisateur à modifier
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )

        # Vérifier les permissions
        is_self_update = requesting_user.id == user_id
        is_admin = requesting_user.role == UserRole.ADMIN

        if not (is_self_update or is_admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissions insuffisantes pour modifier cet utilisateur"
            )

        # Si ce n'est pas un admin, ne peut pas modifier is_active
        if not is_admin and user_data.is_active is not None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent modifier le statut actif"
            )

        # Mettre à jour les champs
        update_data = user_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)

        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def update_user_role(
        db: AsyncSession,
        user_id: UUID,
        role_data: UserRoleUpdate,
        requesting_user: User
    ) -> User:
        """
        Change le rôle d'un utilisateur
        - ADMIN uniquement
        """
        # Vérifier les permissions (ADMIN uniquement)
        if requesting_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent changer les rôles"
            )

        # Récupérer l'utilisateur
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )

        # Empêcher de modifier son propre rôle
        if user_id == requesting_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas modifier votre propre rôle"
            )

        # Mettre à jour le rôle
        user.role = role_data.role
        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def deactivate_user(
        db: AsyncSession,
        user_id: UUID,
        requesting_user: User
    ) -> User:
        """
        Désactive un utilisateur
        - ADMIN uniquement
        """
        # Vérifier les permissions
        if requesting_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent désactiver des utilisateurs"
            )

        # Récupérer l'utilisateur
        result = await db.execute(select(User).filter(User.id == user_id))
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Utilisateur non trouvé"
            )

        # Empêcher de se désactiver soi-même
        if user_id == requesting_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Vous ne pouvez pas désactiver votre propre compte"
            )

        # Désactiver
        user.is_active = False
        await db.commit()
        await db.refresh(user)

        return user

    @staticmethod
    async def get_user_statistics(
        db: AsyncSession,
        requesting_user: User
    ) -> UserStatsResponse:
        """
        Récupère les statistiques des utilisateurs
        - ADMIN uniquement
        """
        # Vérifier les permissions
        if requesting_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seuls les administrateurs peuvent voir les statistiques"
            )

        # Compte total
        total_result = await db.execute(select(func.count(User.id)))
        total_users = total_result.scalar()

        # Comptes par rôle
        admin_result = await db.execute(
            select(func.count(User.id)).filter(User.role == UserRole.ADMIN)
        )
        admins_count = admin_result.scalar()

        manager_result = await db.execute(
            select(func.count(User.id)).filter(User.role == UserRole.MANAGER)
        )
        managers_count = manager_result.scalar()

        user_result = await db.execute(
            select(func.count(User.id)).filter(User.role == UserRole.USER)
        )
        users_count = user_result.scalar()

        # Comptes actifs/inactifs
        active_result = await db.execute(
            select(func.count(User.id)).filter(User.is_active == True)
        )
        active_users = active_result.scalar()

        inactive_result = await db.execute(
            select(func.count(User.id)).filter(User.is_active == False)
        )
        inactive_users = inactive_result.scalar()

        return UserStatsResponse(
            total_users=total_users or 0,
            admins_count=admins_count or 0,
            managers_count=managers_count or 0,
            users_count=users_count or 0,
            active_users=active_users or 0,
            inactive_users=inactive_users or 0
        )

    @staticmethod
    async def get_user_permissions(
        user: User
    ) -> dict:
        """Récupère les permissions d'un utilisateur"""
        return get_role_permissions_summary(user.role)


# Instance globale
user_service = UserService()