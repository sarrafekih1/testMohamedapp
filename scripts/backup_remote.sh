#!/bin/bash

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/remote_$TIMESTAMP"
VM_IP="209.97.156.200"
VM_USER="root"
SSH_KEY="~/.ssh/second_sshkey"

# Infos déduites de l'exploration
CONTAINER_POSTGRES="postgres-prod"
DB_USER="raguser"
DB_NAME="ragbot_prod"

echo "🚀 Démarrage du backup DISTANT ($VM_IP)..."
echo "📂 Dossier local de destination : $BACKUP_DIR"

# Création du dossier local
mkdir -p "$BACKUP_DIR"

# 1. Backup PostgreSQL sur la VM
echo "💾 Dump de la base de données PostgreSQL sur la VM..."
ssh -i "$SSH_KEY" "$VM_USER@$VM_IP" "docker exec $CONTAINER_POSTGRES pg_dump -U $DB_USER $DB_NAME" > "$BACKUP_DIR/remote_postgres_dump.sql"

if [ -s "$BACKUP_DIR/remote_postgres_dump.sql" ]; then
    echo "✅ Remote Postgres dump réussi."
else
    echo "❌ Erreur lors du dump Postgres distant ou fichier vide."
fi

# 2. Backup des fichiers Uploads sur la VM
# On va chercher où sont les fichiers. Généralement dans le dossier de l'app sur la VM.
echo "📄 Recherche et archivage des fichiers uploadés sur la VM..."
# On tente de trouver le dossier uploads dans /root ou dans les volumes
ssh -i "$SSH_KEY" "$VM_USER@$VM_IP" "tar -cz -C /root/rag-chatbot-mvp/backend uploads 2>/dev/null || tar -cz -C /root/backend uploads 2>/dev/null" > "$BACKUP_DIR/remote_uploads.tar.gz"

if [ -s "$BACKUP_DIR/remote_uploads.tar.gz" ]; then
    echo "✅ Fichiers distants archivés et rapatriés."
else
    echo "⚠️ Aucun fichier d'upload trouvé ou erreur lors de l'archivage."
fi

echo ""
echo "✨ Backup distant terminé dans $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
