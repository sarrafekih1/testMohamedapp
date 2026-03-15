# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
from app.schemas.auth import TokenPayload
import uuid

# Configuration du hachage des mots de passe
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class SecurityService:
    """Service de sécurité pour l'authentification et les tokens"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hasher un mot de passe"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Vérifier un mot de passe"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(
        data: dict, 
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Créer un token JWT"""
        to_encode = data.copy()
        
        # Définir l'expiration
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
            )
        
        # Ajouter l'expiration au payload
        to_encode.update({"exp": expire})
        
        # Encoder le token
        encoded_jwt = jwt.encode(
            to_encode, 
            settings.SECRET_KEY, 
            algorithm=settings.ALGORITHM
        )
        
        return encoded_jwt
    
    @staticmethod
    def create_user_token(user_id: uuid.UUID, email: str, role: str) -> dict:
        """Créer un token pour un utilisateur avec toutes les infos"""
        # Données à encoder dans le token
        token_data = {
            "sub": str(user_id),  # Subject = User ID
            "email": email,
            "role": role
        }
        
        # Créer le token
        access_token = SecurityService.create_access_token(data=token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # En secondes
        }
    
    @staticmethod
    def verify_token(token: str) -> Optional[TokenPayload]:
        """Vérifier et décoder un token JWT"""
        try:
            # Décoder le token
            payload = jwt.decode(
                token, 
                settings.SECRET_KEY, 
                algorithms=[settings.ALGORITHM]
            )
            
            # Extraire les données
            user_id: str = payload.get("sub")
            email: str = payload.get("email")
            role: str = payload.get("role")
            exp: int = payload.get("exp")
            
            # Vérifier que toutes les données sont présentes
            if user_id is None or email is None or role is None:
                return None
                
            # Convertir timestamp d'expiration en datetime
            exp_datetime = datetime.fromtimestamp(exp)
            
            # Créer l'objet TokenPayload
            return TokenPayload(
                sub=user_id,
                email=email,
                role=role,
                exp=exp_datetime
            )
            
        except JWTError:
            return None
    
    @staticmethod
    def is_token_expired(token_payload: TokenPayload) -> bool:
        """Vérifier si un token a expiré"""
        return datetime.utcnow() > token_payload.exp

# Instance globale du service
security = SecurityService()