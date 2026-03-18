#!/bin/bash

# Configuration
VM_IP="192.168.112.130"
VM_USER="sarra"
DEST_DIR="/home/sarra/rag-chatbot-k8s"
DOCKER_USER="sarra142"

echo "🚀 Préparation du déploiement Kubernetes vers $VM_IP..."

# Synchronisation des fichiers
echo "📦 Transfert des fichiers vers la VM..."
rsync -avz \
    --exclude 'node_modules' \
    --exclude 'venv' \
    --exclude '__pycache__' \
    --exclude '.git' \
    --exclude 'frontend/dist' \
    --exclude 'backend/uploads/*' \
    ./ $VM_USER@$VM_IP:$DEST_DIR

echo "✅ Transfert terminé !"

echo "👉 Prochaines étapes sur la VM :"
echo "1. ssh $VM_USER@$VM_IP"
echo "2. cd $DEST_DIR"
echo "3. docker login"
echo "4. docker build -t $DOCKER_USER/rag-backend:latest ./backend -f ./backend/dockerfile"
echo "5. docker build -t $DOCKER_USER/rag-frontend:latest ./frontend"
echo "6. docker push $DOCKER_USER/rag-backend:latest"
echo "7. docker push $DOCKER_USER/rag-frontend:latest"
echo "8. kubectl apply -f kubernetes/base/"
echo "9. minikube service frontend --url"
