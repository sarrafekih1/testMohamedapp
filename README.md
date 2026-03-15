# 🤖 RAG Chatbot MVP - Enterprise Edition

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()

A robust, enterprise-ready RAG (Retrieval-Augmented Generation) Chatbot platform designed to ingest corporate documents and provide accurate, context-aware AI responses. Built with a modern tech stack focusing on security, scalability, and ease of deployment.

## ✨ Key Features

- **🧠 Hybrid AI Engine**: 
  - **Primary**: Ultra-fast inference via Groq API (Llama 3.3 70B).
  - **Fallback**: Local inference capability using Ollama (Phi3:mini) for resilience.
- **📚 Smart Document Ingestion**: Supports PDF, TXT, DOCX, and Excel files with automated chunking and vectorization.
- **🔍 Advanced Retrieval**: Semantic search powered by Qdrant vector database.
- **🛡️ Enterprise Security**: Role-Based Access Control (RBAC), JWT authentication, and secure dockerized architecture.
- **💬 Interactive UI**: Modern React frontend with real-time streaming responses, history management, and dark mode.

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Vector DB**: Qdrant
- **Relational DB**: PostgreSQL
- **Caching**: Redis
- **AI Orchestration**: Custom LangChain-inspired architecture

### Frontend
- **Framework**: React 18 (Vite)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **HTTP Client**: Axios

### DevOps & Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx
- **Security**: Fail2Ban, Firewalld

## 🚀 Getting Started (Local Development)

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.11+ (for local backend testing)

### 1. Clone the repository
```bash
git clone git@github.com:sadjikun/rag-chatbot-mvp-global.git
cd rag-chatbot-mvp-global
```

### 2. Configure Environment
Copy the example environment file and configure your keys (Groq API, etc.):
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your actual API keys
```

### 3. Start with Docker (Recommended)
This will start the entire stack (DBs, Backend, Frontend):
```bash
docker-compose -f backend/docker-compose.dev.yml up -d --build
```

Access the application:
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:8000/docs

## 📦 Deployment (Production)

The project includes automated scripts for deployment to a Linux VM (e.g., DigitalOcean).

### 1. Deployment Script
The `deploy.sh` script handles syncing code to the remote server using `rsync`.

```bash
./deploy.sh
```

### 2. Server-side Launch
On your production server:
```bash
cd /root/rag-app
docker compose -f docker-compose.deploy.yml up -d --build
```

See [MAINTENANCE.md](./MAINTENANCE.md) for detailed operation guides including backups, restoration, and security audits.

## 📂 Project Structure

```
├── backend/            # FastAPI application & business logic
├── frontend/           # React application
├── scripts/            # Automation (backups, restore, security setup)
├── docker-compose.*    # Docker orchestration files
└── MAINTENANCE.md      # Ops & Maintenance documentation
```

## 🤝 Contributing
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feat/AmazingFeature`)
3. Commit your Changes (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feat/AmazingFeature`)
5. Open a Pull Request
