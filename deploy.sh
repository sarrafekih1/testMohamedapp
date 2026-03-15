#!/bin/bash

# Configuration
VM_IP="209.97.156.200"
VM_USER="root"
SSH_KEY="~/.ssh/second_sshkey"
DEST_DIR="/root/rag-app"

echo "🚀 Préparation du déploiement vers $VM_IP..."

# Vérification de l'existence de rsync
if ! command -v rsync &> /dev/null; then
    echo "❌ Erreur: rsync n'est pas installé sur votre machine locale."
    exit 1
fi

# Synchronisation des fichiers (Exclut les dossiers lourds)
echo "📦 Transfert des fichiers (en cours...)"
rsync -avz -e "ssh -i $SSH_KEY" \
    --exclude 'node_modules' \
    --exclude 'venv' \
    --exclude 'rag-chatbot-mvp' \
    --exclude '__pycache__' \
    --exclude '.git' \
    --exclude '.venv' \
    --exclude 'frontend/dist' \
    --exclude 'backend/uploads/*' \
    --exclude '.DS_Store' \
    --exclude '.env' \
    --exclude '.env.*' \
    ./ $VM_USER@$VM_IP:$DEST_DIR

echo "✅ Transfert terminé !"
echo ""
echo "👉 Prochaines étapes sur la VM ($VM_IP) :"
echo "1. ssh -i $SSH_KEY $VM_USER@$VM_IP"
echo "2. cd $DEST_DIR"
echo "3. docker compose -f docker-compose.deploy.yml up -d --build"
echo ""
echo "🌐 Votre application sera disponible sur http://$VM_IP"
