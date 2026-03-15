# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.database import get_db, create_tables
from app.models.user import User
from app.api.v1.auth import router as auth_router
from app.api.v1.topics import router as topics_router
from app.api.v1.documents import router as documents_router  
from app.core.storage import storage_service  
from app.api.v1.indexing import router as indexing_router
from app.api.v1.admin import router as admin_router
from app.api.v1.chat import router as chat_router
from app.api.v1.users import router as users_router  # ← AJOUTER




@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionnaire de cycle de vie de l'application"""
    # Startup
    print("🚀 Démarrage du RAG Chatbot API...")
    await create_tables()
    print("✅ Tables créées en base de données")
    #print("⚡ API démarrée sans création automatique des tables")

    yield
    
    # Shutdown
    print("🔥 Arrêt du RAG Chatbot API...")

# Création de l'application FastAPI avec lifespan
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan
)

print(f"DEBUG: {settings.DEBUG}")
print(f"CORS_ORIGINS: {settings.CORS_ORIGINS}")

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    #allow_origins=settings.CORS_ORIGINS,
    #allow_origins=["*"] if settings.DEBUG else settings.CORS_ORIGINS,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000", 
        "http://localhost:5173",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclure les routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(topics_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
app.include_router(indexing_router, prefix="/api/v1/indexing")  
app.include_router(admin_router, prefix="/api/v1/admin") #Nouveau
app.include_router(chat_router, prefix="/api/v1")  # 🆕 NOUVEAU !
app.include_router(users_router, prefix="/api/v1")  # ← AJOUTER





# Routes de base
@app.get("/")
async def root():
    """Route racine"""
    return {
        "message": "RAG Chatbot API",
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs"

    }

@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Health check avec test de connexion DB"""
    try:
        # Test simple de connexion à la base
        from sqlalchemy import text
        result = await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }

# Route de test pour les utilisateurs
@app.get("/users/test")
async def test_user_model(db: AsyncSession = Depends(get_db)):
    """Test du modèle utilisateur"""
    try:
        # Compter les utilisateurs existants
        from sqlalchemy import select, func
        result = await db.execute(select(func.count(User.id)))
        count = result.scalar()
        
        return {
            "message": "Modèle User fonctionne !",
            "users_count": count,
            "model": "User table accessible"
        }
    except Exception as e:
        return {
            "error": str(e),
            "message": "Erreur avec le modèle User"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload en dev
        log_level="info"
    )