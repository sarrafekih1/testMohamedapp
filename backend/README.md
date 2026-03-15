# 🤖 RAG Chatbot Backend - v0.1

## 📋 Description

Backend FastAPI pour un système de chatbot RAG (Retrieval Augmented Generation) permettant aux entreprises d'interroger leurs bases documentaires internes via Intelligence Artificielle (LLMs).

### Fonctionnalités Principales

- 🔐 **Authentification JWT** avec gestion de rôles hiérarchiques
- 📁 **Gestion Topics** avec permissions granulaires par utilisateur
- 📄 **Traitement Documents** multi-formats (PDF, Word, Excel, TXT)
- 🧠 **Pipeline RAG Complet** : Extraction → Chunking → Embeddings → Indexation
- 💬 **Interface Conversationnelle** avec citations des sources
- 🔍 **Recherche Vectorielle** via Qdrant avec filtres sécurisés

## 🏗️ Architecture

### Stack Technique

- **Framework API** : FastAPI 0.104.1 + Python 3.11
- **Base Relationnelle** : PostgreSQL 15 + SQLAlchemy 2.0 (Async)
- **Base Vectorielle** : Qdrant v1.11.0 pour embeddings
- **Cache** : Redis 7 pour sessions et cache requêtes
- **IA** : Sentence Transformers + Ollama (phi3:mini)
- **Sécurité** : JWT + bcrypt + RBAC granulaire

### Services Développés

```
app/
├── api/v1/              # Endpoints REST
│   ├── auth.py          # Authentification (login, register, me)
│   ├── topics.py        # Gestion topics et permissions
│   ├── documents.py     # Upload et gestion documents
│   ├── indexing.py      # Pipeline d'indexation RAG
│   ├── chat.py          # Interface conversationnelle
│   └── admin.py         # Administration utilisateurs
├── core/                # Configuration et sécurité
├── models/              # Modèles SQLAlchemy
├── schemas/             # Validation Pydantic
├── services/            # Logique métier
│   ├── auth_service.py
│   ├── topic_service.py
│   ├── document_service.py
│   ├── embeddings_service.py
│   ├── qdrant_service.
│   ├── indexing_service.py
│   ├── llm_service.py
│   ├── chat_service.py
│   ├── admin_service.py
│   ├── user_service.py
│   └── processors/      # Traitement fichiers
└── db/                  # Configuration base de données
```

## 🚀 Installation et Démarrage

### Prérequis

- Python 3.11.8
- PostgreSQL 15+
- Redis 7+
- Qdrant 1.11.0
- Ollama avec modèle phi3:mini

### Configuration Environment

```bash
# Créer l'environnement virtuel
python -m venv rag-chatbot-mvp
source rag-chatbot-mvp/bin/activate

# Installation des dépendances
pip install -r requirements.txt
```

### Variables d'Environnement

Créer un fichier `.env` :

```env
# Database
DATABASE_URL=postgresql+asyncpg://ragdev:dev123@localhost:5432/ragbot_dev

# Security
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# Services URLs
QDRANT_URL=http://localhost:6333
REDIS_URL=redis://localhost:6379
OLLAMA_URL=http://localhost:11434

# LLM Configuration
LLM_MODEL=phi3:mini
LLM_TEMPERATURE=0.3
LLM_TIMEOUT=120

# RAG Configuration
RAG_MAX_CHUNKS=5
RAG_SCORE_THRESHOLD=0.3

# Upload Configuration
MAX_UPLOAD_SIZE=104857600  # 100MB
UPLOAD_DIR=./uploads
```

### Démarrage des Services

```bash
# 1. PostgreSQL (via Docker)
docker run -d --name postgres-dev \
  -e POSTGRES_PASSWORD=dev123 \
  -e POSTGRES_USER=ragdev \
  -e POSTGRES_DB=ragbot_dev \
  -p 5432:5432 postgres:15-alpine

# 2. Redis (via Docker)
docker run -d --name redis-dev \
  -p 6379:6379 redis:7-alpine

# 3. Qdrant (via Docker)
docker run -d --name qdrant-dev \
  -p 6333:6333 \
  -v ./qdrant-data:/qdrant/storage \
  qdrant/qdrant:v1.11.0

# 4. Ollama + Modèles
# Installer Ollama depuis https://ollama.ai
ollama pull phi3:mini

# 5. Backend FastAPI
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker Compose (Recommandé)

```bash
# Démarrage complet avec Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Logs
docker-compose -f docker-compose.dev.yml logs -f
```

## 📊 API Documentation

### Endpoints Principaux

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/docs` | GET | Documentation Swagger interactive |
| `/health` | GET | Health check général |
| `/api/v1/auth/register` | POST | Inscription utilisateur |
| `/api/v1/auth/login` | POST | Connexion utilisateur |
| `/api/v1/auth/me` | GET | Profil utilisateur |
| `/api/v1/topics` | GET/POST | Gestion topics |
| `/api/v1/documents/upload` | POST | Upload de documents |
| `/api/v1/documents` | GET | Liste documents par topic |
| `/api/v1/indexing/initialize` | POST | Initialisation système RAG |
| `/api/v1/chat` | POST | Création conversation |
| `/api/v1/chat/{id}/messages` | POST | Envoi message + réponse IA |

### Authentification

Toutes les routes protégées nécessitent un header :
```
Authorization: Bearer <jwt_token>
```


## 🔐 Système de Permissions Granulaires

### Architecture RBAC à 2 Niveaux

**Niveau 1 : Rôles Globaux**
- `ADMIN` : Accès complet système (tous topics, gestion users, permissions)
- `MANAGER` : Peut créer topics + voir tous les topics
- `USER` : Accès uniquement topics autorisés

**Niveau 2 : Permissions par Topic**
- `READ` : Consultation documents uniquement
- `WRITE` : Consultation + Upload documents
- `ADMIN` : Toutes permissions + Gestion accès topic

### Hiérarchie des Permissions
```
ADMIN global → Peut tout faire partout
    ↓
ADMIN topic → Gestion complète du topic
    ↓
WRITE → Consultation + Upload
    ↓
READ → Consultation uniquement
```

### Endpoints Permissions

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `POST /api/v1/topics/{id}/permissions` | POST | Accorder permission |
| `GET /api/v1/topics/{id}/permissions` | GET | Lister permissions topic |
| `PATCH /api/v1/topics/{id}/permissions/{user_id}` | PATCH | Modifier permission |
| `DELETE /api/v1/topics/{id}/permissions/{user_id}` | DELETE | Révoquer permission |
| `GET /api/v1/topics/{id}/available-users` | GET | Users sans accès topic |

### Règles Métier

1. **Création Topic** : Créateur reçoit automatiquement permission ADMIN
2. **Visibilité Topics** :
   - ADMIN/MANAGER : Voient tous les topics
   - USER : Uniquement topics avec permissions
3. **Gestion Permissions** :
   - ADMIN global : Peut tout gérer
   - ADMIN topic : Peut gérer son topic uniquement
   - WRITE/READ : Pas de gestion permissions
4. **Auto-protection** : Impossible de se révoquer soi-même

### Traçabilité

Chaque permission enregistre :
- `granted_by` : Qui a accordé la permission
- `created_at` : Date d'attribution
- `updated_at` : Dernière modification


## 🔧 Configuration Avancée

### Modèles d'Embeddings

Par défaut : `paraphrase-multilingual-MiniLM-L12-v2` (384 dimensions)

Options disponibles :
- `all-MiniLM-L6-v2` (anglais, 384 dims)
- `all-mpnet-base-v2` (anglais, 768 dims)
- `paraphrase-multilingual-mpnet-base-v2` (multilingue, 768 dims)

### Modèles LLM

Configuration actuelle : `phi3:mini` (2GB RAM)

Alternatives testées :
- `mistral:7b` (7GB RAM, meilleure qualité)
- `llama2:7b` (7GB RAM)

### Optimisation Performance

```python
# Configuration Qdrant optimisée
COLLECTION_CONFIG = {
    "vector_size": 384,
    "distance": "COSINE",
    "hnsw_config": {
        "m": 16,
        "ef_construct": 100
    }
}

# Configuration LLM
LLM_CONFIG = {
    "temperature": 0.3,  # Réponses factuelles
    "top_p": 0.9,
    "top_k": 40,
    "max_tokens": 500
}
```

## 🧪 Tests et Validation

### Tests Unitaires

```bash
# Installation dépendances test
pip install pytest pytest-asyncio pytest-cov

# Exécution tests
pytest tests/ -v --cov=app

# Tests spécifiques
pytest tests/test_auth.py -v
pytest tests/test_rag_pipeline.py -v
```

### Tests d'Intégration

```bash
# Test pipeline RAG complet
python test_rag_system.py

# Test système chat
python test_chat_system.py
```

### Scripts de Validation

```bash
# Upload documents test
bash upload_test_documents.sh

# Test indexation
bash test_indexing.sh

# Health checks
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/indexing/health
```

## 📈 Métriques et Monitoring

### Performance Actuelle (MacBook M2 8GB)

- **Upload + Processing** : 3-30s selon taille fichier
- **Chunking** : ~500 mots par chunk avec overlap 50 mots
- **Embeddings** : 384 dimensions, génération batch optimisée
- **Recherche Vectorielle** : < 1s avec filtres permissions
- **Génération LLM** : ~27s pour réponse contextuelle (phi3:mini)

### Métriques Collectées

```python
# Métriques business
conversations_total = Counter()
documents_uploaded = Counter()
search_duration = Histogram()
active_users = Gauge()

# Métriques techniques
llm_response_time = Histogram()
vector_search_time = Histogram()
embedding_generation_time = Histogram()
```

## 🐛 Debugging et Logs

### Configuration Logging

```python
# Configuration dans config.py
LOG_LEVEL = "INFO"  # DEBUG, INFO, WARNING, ERROR
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
```

### Logs Utiles

```bash
# Logs application
tail -f logs/app.log

# Logs Docker services
docker-compose logs -f qdrant
docker-compose logs -f postgres
```

### Debug RAG Pipeline

```python
# Variables debug dans .env
DEBUG_RAG=true
DEBUG_EMBEDDINGS=true
DEBUG_LLM=true
```

## 🔐 Sécurité

### Mesures Implémentées

- **JWT Tokens** : Expiration 24h, algorithme HS256
- **Bcrypt Hashing** : Mots de passe sécurisés
- **RBAC Granulaire** : Permissions par topic/utilisateur
- **Input Validation** : Sanitisation via Pydantic
- **File Upload Security** : Type/taille validation
- **SQL Injection Protection** : SQLAlchemy ORM
- **CORS Configuration** : Origines contrôlées

### Bonnes Pratiques

- Changement SECRET_KEY en production
- HTTPS obligatoire en production
- Limitation de taille upload
- Rate limiting sur API
- Audit trail des actions sensibles

## 🚀 Déploiement Production

### Requirements

```bash
# Production optimisée
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

### Docker Production

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

### Variables Production

```env
DEBUG=false
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/ragbot
SECRET_KEY=production-secret-key-here
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
```

## 🤝 Contribution

### Structure de Commit

```
feat: ajout nouvelle fonctionnalité
fix: correction de bug
docs: mise à jour documentation
style: formatage code
refactor: refactoring sans changement fonctionnel
test: ajout/modification tests
chore: tâches maintenance
```


## 📞 Support

### Issues Connues

1. **phi3:mini en français** : Qualité perfectible, migration Mistral 7B prévue
2. **Métadonnées sources** : Parfois null, correction en cours
3. **Performance M2 8GB** : Limitation hardware, GPU recommandé

### Issues Résolues ✅

1. ~~**SQLAlchemy Lazy Loading** : Erreur 500 sur grant/update permissions~~ → **RÉSOLU v0.1.1**
   - Cause : Relations user/grantor non chargées avec AsyncSession
   - Solution : `db.refresh(permission, ["user", "grantor"])`
   - Commit : `fix: add eager loading for permission relationships`

---


**Version** : v0.1.1 (Permissions Granulaires)
**Date** : 31 Octobre 2025  
**Statut** : MVP Fonctionnel + Gestion Permissions
