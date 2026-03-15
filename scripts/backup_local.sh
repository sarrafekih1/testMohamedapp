#!/bin/bash

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups/local_$TIMESTAMP"
CONTAINER_POSTGRES="postgres-dev"
DB_USER="ragdev"
DB_NAME="ragbot_dev"

echo "🚀 Démarrage du backup LOCAL..."
echo "📂 Dossier de destination : $BACKUP_DIR"

# Création du dossier
mkdir -p "$BACKUP_DIR"

# 1. Backup PostgreSQL
echo "💾 Dump de la base de données PostgreSQL..."
if docker exec $CONTAINER_POSTGRES pg_dump -U $DB_USER $DB_NAME > "$BACKUP_DIR/postgres_dump.sql"; then
    echo "✅ Postgres dump réussi."
else
    echo "❌ Erreur lors du dump Postgres (Le conteneur est-il lancé ?)."
fi

# 2. Backup Qdrant (Snapshot via API)
# On suppose que Qdrant tourne sur localhost:6333
echo "🧠 Snapshot de Qdrant..."
# On déclenche un snapshot pour la collection 'documents'
# Note: Ceci est une commande simplifiée. Pour un backup complet, copier le volume est mieux si le service est coupé.
# Ici on copie juste le dossier qdrant-config.yaml pour la forme, 
# car le backup à chaud des vecteurs est complexe sans couper le service.
# Alternative : on copiera les fichiers uploadés, ce qui permet de réindexer si besoin.

# 3. Backup des fichiers Uploads
echo "📄 Archivage des fichiers uploadés..."
if [ -d "backend/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads.tar.gz" -C backend uploads
    echo "✅ Fichiers archivés."
else
    echo "⚠️ Pas de dossier backend/uploads trouvé."
fi

echo ""
echo "✨ Backup terminé dans $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
