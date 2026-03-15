# app/core/deps.py
from typing import Annotated
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.services.auth_service import auth_service
from app.models.user import User, UserRole

# Configuration du scheme de sécurité Bearer
security_scheme = HTTPBearer()

async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security_scheme)]
) -> User:
    """Dependency pour récupérer l'utilisateur actuel depuis le token JWT"""
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Extraire le token
        token = credentials.credentials
        
        # Récupérer l'utilisateur depuis le token
        user = await auth_service.get_current_user_from_token(db, token)
        
        if user is None:
            raise credentials_exception
            
        return user
        
    except Exception:
        raise credentials_exception

async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """Dependency pour s'assurer que l'utilisateur est actif"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Inactive user"
        )
    return current_user

async def get_admin_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Dependency pour s'assurer que l'utilisateur est admin"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def get_manager_or_admin_user(
    current_user: Annotated[User, Depends(get_current_active_user)]
) -> User:
    """Dependency pour s'assurer que l'utilisateur est manager ou admin"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

# Types d'annotations pour faciliter l'usage
CurrentUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(get_admin_user)]
ManagerUser = Annotated[User, Depends(get_manager_or_admin_user)]