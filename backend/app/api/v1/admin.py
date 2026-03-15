from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List
from uuid import UUID

from app.db.database import get_db
from app.core.deps import AdminUser, CurrentUser  
from app.models.user import User, UserRole
from app.schemas.auth import UserResponse
from pydantic import BaseModel

router = APIRouter(tags=["admin"])

class ChangeRoleRequest(BaseModel):
    user_id: UUID
    new_role: UserRole

class PromoteToAdminRequest(BaseModel):
    email: str

@router.get("/users")
async def list_all_users(
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = None
) -> List[UserResponse]:
    """Liste tous les utilisateurs (Admin seulement)"""
    query = select(User)
    result = await db.execute(query)
    users = result.scalars().all()
    
    return [UserResponse.model_validate(user) for user in users]

@router.post("/users/{user_id}/change-role")
async def change_user_role(
    user_id: UUID,
    role_data: ChangeRoleRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = None
):
    """Change le rôle d'un utilisateur"""
    
    # Vérification que l'utilisateur existe
    query = select(User).filter(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(404, "Utilisateur non trouvé")
    
    # Empêcher de changer son propre rôle
    if user.id == admin_user.id:
        raise HTTPException(400, "Impossible de modifier son propre rôle")
    
    # Mise à jour du rôle
    query = update(User).filter(User.id == user_id).values(role=role_data.new_role)
    await db.execute(query)
    await db.commit()
    
    return {
        "message": f"Rôle de {user.email} changé vers {role_data.new_role}",
        "user": UserResponse.model_validate(user)
    }

@router.post("/promote-to-admin")
async def promote_user_to_admin(
    promote_data: PromoteToAdminRequest,
    db: AsyncSession = Depends(get_db),
    admin_user: AdminUser = None
):
    """Promeut un utilisateur au rang d'administrateur"""
    
    # Recherche par email
    query = select(User).filter(User.email == promote_data.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(404, f"Utilisateur {promote_data.email} non trouvé")
    
    if user.role == UserRole.ADMIN:
        raise HTTPException(400, f"{user.email} est déjà administrateur")
    
    # Promotion vers admin
    query = update(User).filter(User.id == user.id).values(role=UserRole.ADMIN)
    await db.execute(query)
    await db.commit()
    
    return {
        "message": f"{user.email} promu administrateur",
        "user": UserResponse.model_validate(user)
    }

# ENDPOINT TEMPORAIRE : Auto-promotion (pour développement uniquement)
@router.post("/dev/make-me-admin")
async def dev_make_me_admin(
    current_user: CurrentUser = None,
    db: AsyncSession = Depends(get_db)
):
    """DÉVELOPPEMENT SEULEMENT : Se promouvoir admin"""
    
    if current_user.role == UserRole.ADMIN:
        return {"message": "Vous êtes déjà administrateur"}
    
    # Mise à jour vers admin
    query = update(User).filter(User.id == current_user.id).values(role=UserRole.ADMIN)
    await db.execute(query)
    await db.commit()
    
    return {
        "message": f"Vous êtes maintenant administrateur !",
        "note": "Cet endpoint sera supprimé en production",
        "user": current_user.email
    }