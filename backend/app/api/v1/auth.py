# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse, ErrorResponse
from app.services.auth_service import auth_service
from app.core.deps import CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Email déjà utilisé"},
        422: {"description": "Données invalides"}
    }
)
async def register(
    user_data: UserRegister,
    db: AsyncSession = Depends(get_db)
):
    """
    Créer un nouveau compte utilisateur.
    
    Retourne immédiatement un token d'accès pour l'utilisateur créé.
    """
    return await auth_service.register_user(db, user_data)

@router.post(
    "/login",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Identifiants invalides"},
        422: {"description": "Données invalides"}
    }
)
async def login(
    login_data: UserLogin,
    db: AsyncSession = Depends(get_db)
):
    """
    Se connecter avec email/mot de passe.
    
    Retourne un token d'accès en cas de succès.
    """
    return await auth_service.login_user(db, login_data)

@router.get(
    "/me",
    response_model=UserResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Token invalide ou expiré"}
    }
)
async def get_current_user_info(current_user: CurrentUser):
    """
    Récupérer les informations de l'utilisateur connecté.
    
    Nécessite un token Bearer valide dans les headers.
    """
    return UserResponse.model_validate(current_user)

@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT
)
async def logout():
    """
    Se déconnecter (endpoint symbolique).
    
    Note: Avec JWT, la déconnexion côté client consiste simplement
    à supprimer le token du stockage local. Cet endpoint est fourni
    pour la cohérence de l'API.
    """
    # Dans une implémentation avancée, on pourrait blacklister le token
    # Pour le MVP, on retourne juste une confirmation
    return {"message": "Déconnecté avec succès"}