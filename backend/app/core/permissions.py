# app/core/permissions.py
"""
Helpers et utilitaires pour la gestion des permissions et rôles
"""
from app.models.user import User, UserRole


def can_create_topic(user: User) -> bool:
    """Vérifie si l'utilisateur peut créer des topics"""
    return user.role in [UserRole.ADMIN, UserRole.MANAGER]


def can_delete_topic(user: User) -> bool:
    """Vérifie si l'utilisateur peut supprimer des topics"""
    return user.role == UserRole.ADMIN


def can_manage_users(user: User) -> bool:
    """Vérifie si l'utilisateur peut gérer d'autres utilisateurs"""
    return user.role == UserRole.ADMIN


def can_view_all_topics(user: User) -> bool:
    """Vérifie si l'utilisateur peut voir tous les topics"""
    return user.role in [UserRole.ADMIN, UserRole.MANAGER]


def can_view_all_users(user: User) -> bool:
    """Vérifie si l'utilisateur peut voir la liste des utilisateurs"""
    return user.role in [UserRole.ADMIN, UserRole.MANAGER]


def can_change_user_role(user: User) -> bool:
    """Vérifie si l'utilisateur peut changer le rôle d'autres utilisateurs"""
    return user.role == UserRole.ADMIN


def can_deactivate_user(user: User) -> bool:
    """Vérifie si l'utilisateur peut désactiver des comptes"""
    return user.role == UserRole.ADMIN


def can_delete_any_document(user: User) -> bool:
    """Vérifie si l'utilisateur peut supprimer n'importe quel document"""
    return user.role == UserRole.ADMIN


def get_role_display_name(role: UserRole) -> str:
    """Retourne le nom affiché du rôle"""
    role_names = {
        UserRole.ADMIN: "Administrateur",
        UserRole.MANAGER: "Gestionnaire",
        UserRole.USER: "Utilisateur"
    }
    return role_names.get(role, "Inconnu")


def get_role_permissions_summary(role: UserRole) -> dict:
    """Retourne un résumé des permissions pour un rôle"""
    permissions = {
        UserRole.ADMIN: {
            "can_create_topic": True,
            "can_delete_topic": True,
            "can_manage_users": True,
            "can_view_all_topics": True,
            "can_view_all_users": True,
            "can_change_user_role": True,
            "can_deactivate_user": True,
            "can_delete_any_document": True,
        },
        UserRole.MANAGER: {
            "can_create_topic": True,
            "can_delete_topic": False,
            "can_manage_users": False,
            "can_view_all_topics": True,
            "can_view_all_users": True,
            "can_change_user_role": False,
            "can_deactivate_user": False,
            "can_delete_any_document": False,
        },
        UserRole.USER: {
            "can_create_topic": False,
            "can_delete_topic": False,
            "can_manage_users": False,
            "can_view_all_topics": False,
            "can_view_all_users": False,
            "can_change_user_role": False,
            "can_deactivate_user": False,
            "can_delete_any_document": False,
        }
    }
    return permissions.get(role, permissions[UserRole.USER])