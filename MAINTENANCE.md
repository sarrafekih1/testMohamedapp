# 🛠️ Guide de Maintenance & Déploiement - RAG Chatbot

Ce document récapitule l'état actuel du projet et les procédures pour gérer la production.

## 🏗️ Architecture Actuelle (v0.1 - Dec 2025)

L'application est déployée sur une VM Digital Ocean (IP: `<machine_adresse>`) via Docker Compose.

- **Frontend** : React (Vite) servi par Nginx sur le port 80.
- **Backend** : FastAPI (Python 3.11) sur le port 8000 (proxyfied).
- **IA (LLM)** : 
  - **Principal** : Groq API (Llama 3.3 70B) pour une vitesse instantanée.
  - **Fallback** : Ollama local (Phi3:mini) si Groq est indisponible.
- **Bases de données** : 
  - **PostgreSQL** : Données relationnelles.
  - **Qdrant** : Base vectorielle pour le RAG.
  - **Redis** : Cache et sessions.

---

## 🔐 Sécurité VM

Le serveur est protégé par :
1. **Firewalld** : Seuls les ports `22` (SSH), `80` (HTTP) et `443` (HTTPS) sont ouverts.
2. **Fail2Ban** : Protection contre les attaques force brute sur SSH.
3. **Docker Isolation** : Les bases de données n'exposent aucun port sur l'IP publique.

---

## 🚀 Procédure de Déploiement (Mise à jour)

Pour mettre à jour la production depuis votre machine locale :

1.  **Envoyer le code** :
    ```bash
    ./deploy.sh
    ```
2.  **Redémarrer/Reconstruire sur la VM** :
    ```bash
    ssh -i ~/.ssh/second_sshkey root@<machine_adresse>
    cd /root/rag-app
    docker compose -f docker-compose.deploy.yml up -d --build
    ```

---

## 💾 Sauvegarde et Migration

### Créer un backup local
Génère un dump SQL et une archive des fichiers dans `./backups/local_...` :
```bash
./scripts/backup_local.sh
```

### Restaurer (Local -> Prod)
Envoie votre base locale actuelle vers la VM de production :
```bash
./scripts/restore.sh
```

---

## 🛠️ Commandes de Maintenance utiles

### Ré-indexer tous les documents (Si Qdrant est vide)
```bash
# Via API (recommandé) - Nécessite Token Admin
curl -X POST http://<machine_adresse>/api/indexing/documents/reindex-all -H "Authorization: Bearer <TOKEN>"
```

### Consulter les logs en direct
```bash
docker logs -f rag-backend
```

### Télécharger un nouveau modèle Ollama sur la VM
```bash
docker exec -it rag-ollama ollama pull <nom_du_modele>
```

---

## 📋 Variables de Configuration actuelles

Pour les commandes ci-dessus, utilisez les valeurs suivantes pour le serveur actuel :

- `<machine_adresse>` : `209.97.156.200`
- `<SSH_KEY>` : `~/.ssh/second_sshkey`
- `<DB_USER>` : `raguser`
- `<DB_NAME>` : `ragbot_prod`

---

## ⚠️ Notes Techniques
- **Frontend** : Le build ignore les erreurs TypeScript (`tsc -b` retiré du package.json) pour faciliter le déploiement rapide.
- **Qdrant** : L'URL de connexion est configurée via `QDRANT_URL=http://qdrant:6333` dans `.env.deploy`.