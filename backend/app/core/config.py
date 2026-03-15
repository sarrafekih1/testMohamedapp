# app/core/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Base
    APP_NAME: str = "RAG Chatbot API"
    APP_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = True
    
    # Database
    #DATABASE_URL: str = "postgresql+asyncpg://postgres:dev123@localhost:5432/postgres"
    DATABASE_URL: str = "postgresql+asyncpg://ragdev:dev123@localhost:5432/ragbot_dev"
    
    # Security JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 heures
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",    # React dev server
        "http://127.0.0.1:3000",    # React (127.0.0.1)
        "http://localhost:8080",    # Vue dev server
        "http://localhost:5173",    # Vite dev server
        "http://localhost:4200",    # Angular dev server
        "http://localhost:8000",    # Pour tests directs depuis docs
    ]

    # API pagination
    DEFAULT_PAGE_SIZE: int = 20
    MAX_PAGE_SIZE: int = 100

    # Upload
    UPLOAD_FOLDER: str = "./uploads"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx", ".txt", ".xlsx"}  # Ajouté .xlsx
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Qdrant (pour plus tard)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION_NAME: str = "documents_chunks"  # Nom cohérent avec le service
    EMBEDDINGS_MODEL: str = "multilingual"  # ou 'english', 'large'
    MAX_SEARCH_RESULTS: int = 10
    SIMILARITY_THRESHOLD: float = 0.7

    # Configuration avancée RAG
    EMBEDDINGS_BATCH_SIZE: int = 32
    VECTOR_DIMENSION: int = 384  # Pour le modèle multilingual
    CHUNK_OVERLAP: int = 50  # Mots de chevauchement entre chunks

    # =====================================================
    # NOUVELLES CONFIGURATIONS LLM & CHAT 🆕
    # =====================================================
    
    # Ollama Configuration
    OLLAMA_URL: str = "http://localhost:11434"
    #LLM_MODEL: str = "mistral:7b"
    LLM_MODEL: str = "phi3:mini"


    # =====================================================
    # NOUVELLES CONFIGURATIONS LLM (API EXTERNE GROQ)
    # =====================================================
    # Groq Configuration (alternative rapide à Ollama)
    GROQ_API_KEY: Optional[str] = None  # Si vide, utilise Ollama
    GROQ_MODEL: str = "llama-3.1-8b-instant"  # Modèle Groq
    GROQ_FALLBACK_TO_OLLAMA: bool = True  # Fallback si erreur

    



    # Paramètres de génération LLM
    LLM_TEMPERATURE: float = 0.3
    LLM_TOP_P: float = 0.9
    LLM_TOP_K: int = 40
    LLM_MAX_TOKENS: int = 2000
    LLM_TIMEOUT: int = 180  # secondes = 3 minutes
    
    # Paramètres RAG pour Chat
    RAG_MAX_CHUNKS: int = 4  # Optimisation CPU : Réduit de 8 à 4
    RAG_SCORE_THRESHOLD: float = 0.3  # Différent de SIMILARITY_THRESHOLD existant

    class Config:
        env_file = ".env"
        case_sensitive = True

# Instance globale
def get_settings() -> Settings:
    settings = Settings()
    print(f"DEBUG CONFIG: QDRANT_URL={settings.QDRANT_URL}")
    print(f"DEBUG CONFIG: OLLAMA_URL={settings.OLLAMA_URL}")
    return settings

# Pour compatibilité avec le code existant
settings = Settings()