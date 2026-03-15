# app/services/auth_service.py
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.core.security import security
import uuid

class AuthService:
    """Service métier pour l'authentification"""
    
    @staticmethod
    async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
        """Récupérer un utilisateur par son email"""
        result = await db.execute(select(User).filter(User.email == email))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        """Récupérer un utilisateur par son ID"""
        result = await db.execute(select(User).filter(User.id == user_id))
        return result.scalar_one_or_none()
    
    @staticmethod
    async def create_user(db: AsyncSession, user_data: UserRegister) -> User:
        """Créer un nouvel utilisateur"""
        
        # Vérifier si l'email existe déjà
        existing_user = await AuthService.get_user_by_email(db, user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Un utilisateur avec cet email existe déjà",
                headers={"error_code": "EMAIL_ALREADY_EXISTS"}
            )
        
        # Hasher le mot de passe
        hashed_password = security.hash_password(user_data.password)
        
        # Créer l'utilisateur
        db_user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=hashed_password,
            is_active=True,
            role=UserRole.USER  # Par défaut, nouvel utilisateur = USER
        )
        
        # Sauvegarder en base
        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        
        return db_user
    
    @staticmethod
    async def authenticate_user(
        db: AsyncSession, 
        email: str, 
        password: str
    ) -> Optional[User]:
        """Authentifier un utilisateur avec email/mot de passe"""
        
        # Récupérer l'utilisateur
        user = await AuthService.get_user_by_email(db, email)
        if not user:
            return None
        
        # Vérifier que l'utilisateur est actif
        if not user.is_active:
            return None
        
        # Vérifier le mot de passe
        if not security.verify_password(password, user.hashed_password):
            return None
        
        return user
    
    @staticmethod
    async def register_user(db: AsyncSession, user_data: UserRegister) -> TokenResponse:
        """Inscription complète d'un utilisateur avec retour du token"""
        
        # Créer l'utilisateur
        user = await AuthService.create_user(db, user_data)
        
        # Créer le token
        token_data = security.create_user_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value
        )
        
        # Retourner la réponse complète
        return TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data["token_type"],
            expires_in=token_data["expires_in"],
            user=UserResponse.model_validate(user)
        )
    
    @staticmethod
    async def login_user(db: AsyncSession, login_data: UserLogin) -> TokenResponse:
        """Connexion d'un utilisateur avec retour du token"""
        
        # Authentifier l'utilisateur
        user = await AuthService.authenticate_user(
            db, 
            login_data.email, 
            login_data.password
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Email ou mot de passe incorrect",
                headers={"WWW-Authenticate": "Bearer", "error_code": "INVALID_CREDENTIALS"}
            )
        
        # Créer le token
        token_data = security.create_user_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value
        )
        
        # Retourner la réponse complète
        return TokenResponse(
            access_token=token_data["access_token"],
            token_type=token_data["token_type"],
            expires_in=token_data["expires_in"],
            user=UserResponse.model_validate(user)
        )
    
    @staticmethod
    async def get_current_user_from_token(
        db: AsyncSession, 
        token: str
    ) -> Optional[User]:
        """Récupérer l'utilisateur actuel depuis un token JWT"""
        
        # Vérifier et décoder le token
        token_payload = security.verify_token(token)
        if not token_payload:
            return None
        
        # Vérifier que le token n'a pas expiré
        if security.is_token_expired(token_payload):
            return None
        
        # Récupérer l'utilisateur
        try:
            user_id = uuid.UUID(token_payload.sub)
            user = await AuthService.get_user_by_id(db, user_id)
            
            # Vérifier que l'utilisateur existe et est actif
            if not user or not user.is_active:
                return None
                
            return user
            
        except (ValueError, TypeError):
            # user_id invalide
            return None

# Instance globale du service
auth_service = AuthService()