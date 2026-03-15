#!/bin/bash

# Configuration
VM_IP="209.97.156.200"
VM_USER="root"
SSH_KEY="~/.ssh/second_sshkey"
REMOTE_APP_DIR="/root/rag-app"

# SÉLECTION DU BACKUP LOCAL (Le plus récent)
BACKUP_SOURCE_DIR=$(ls -td backups/local_* | head -1)

if [ -z "$BACKUP_SOURCE_DIR" ]; then
    echo "❌ Aucun dossier de backup LOCAL trouvé dans ./backups/"
    exit 1
fi

echo "🚀 Démarrage de la restauration LOCAL -> PROD ($VM_IP)..."
echo "📂 Source : $BACKUP_SOURCE_DIR"

# 1. Envoi des fichiers de backup sur la VM
echo "📦 Transfert des fichiers de backup..."
scp -i "$SSH_KEY" "$BACKUP_SOURCE_DIR/postgres_dump.sql" "$BACKUP_SOURCE_DIR/uploads.tar.gz" "$VM_USER@$VM_IP:$REMOTE_APP_DIR/"

# 2. Restauration des fichiers (Uploads)
echo "📄 Restauration des fichiers uploadés..."
ssh -i "$SSH_KEY" "$VM_USER@$VM_IP" "
    cd $REMOTE_APP_DIR
    
    echo '   -> Extraction...'
    mkdir -p temp_restore
    tar -xzf uploads.tar.gz -C temp_restore
    
    echo '   -> Copie vers le volume Docker...'
    # Le backup local a la structure 'backend/uploads'
    if [ -d 'temp_restore/backend/uploads' ]; then
        docker cp temp_restore/backend/uploads/. rag-backend:/app/uploads/
    elif [ -d 'temp_restore/uploads' ]; then
        docker cp temp_restore/uploads/. rag-backend:/app/uploads/
    fi
    
    # Nettoyage
    rm -rf temp_restore uploads.tar.gz
    echo '   -> Fichiers restaurés.'
"

# 3. Restauration de la Base de Données
echo "💾 Restauration de la base de données PostgreSQL..."
ssh -i "$SSH_KEY" "$VM_USER@$VM_IP" "
    cd $REMOTE_APP_DIR
    
    echo '   -> Préparation de la base...'
    docker cp postgres_dump.sql rag-postgres:/tmp/dump.sql
    
    # On recrée la base 'ragbot_prod' à neuf
    docker exec rag-postgres psql -U raguser -d postgres -c 'DROP DATABASE IF EXISTS ragbot_prod WITH (FORCE);'
    docker exec rag-postgres psql -U raguser -d postgres -c 'CREATE DATABASE ragbot_prod;'
    
    echo '   -> Import des données...'
    # On affiche les erreurs maintenant
    docker exec rag-postgres psql -U raguser -d ragbot_prod -f /tmp/dump.sql
    
    rm postgres_dump.sql
    echo '   -> Base de données restaurée.'
"

echo ""
echo "✨ MIGRATION TERMINÉE ! Vos données locales sont maintenant en PROD."
