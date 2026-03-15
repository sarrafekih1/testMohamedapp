#!/bin/bash

API_BASE="http://localhost:8000/api/v1"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5NWQ4MmQ3NC0yOTFlLTQyNzItYjZkNi04OTc1YTkyOGNlNWEiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidXNlciIsImV4cCI6MTc1Njk5MjMxMH0.nFM_5BJH9QaFtmRYlmqOaLJerb_4Ipw9pGI3R1-bXIY"

echo "🚀 INDEXATION ET TEST DU SYSTÈME RAG"

# 1. Statut avant indexation
echo "📊 Statut AVANT indexation:"
curl -s "$API_BASE/indexing/status" -H "Authorization: Bearer $TOKEN" | jq '.status.sync_status'

# 2. Lancement de l'indexation
echo -e "\n⚡ Lancement de l'indexation des documents existants..."
INDEXING_RESPONSE=$(curl -s -X POST "$API_BASE/indexing/initialize?recreate_collection=false" \
-H "Authorization: Bearer $TOKEN")

echo "📋 Résultat indexation:"
echo $INDEXING_RESPONSE | jq '.report.indexing_stats'

# 3. Attente de la fin du processus
echo -e "\n⏳ Attente de la fin de l'indexation (10 secondes)..."
sleep 10

# 4. Statut après indexation
echo "📊 Statut APRÈS indexation:"
curl -s "$API_BASE/indexing/status" -H "Authorization: Bearer $TOKEN" | jq '.status.sync_status'

# 5. Test de recherche sémantique
echo -e "\n🔍 Tests de recherche sémantique:"

echo -e "\n1️⃣ Recherche: 'politique congés'"
SEARCH1=$(curl -s -X POST "$API_BASE/indexing/test-search?query=politique%20congés&limit=2" \
-H "Authorization: Bearer $TOKEN")
echo $SEARCH1 | jq '.results_found, .results[0].score, .results[0].preview'

echo -e "\n2️⃣ Recherche: 'procédure embauche'"  
SEARCH2=$(curl -s -X POST "$API_BASE/indexing/test-search?query=procédure%20embauche&limit=2" \
-H "Authorization: Bearer $TOKEN")
echo $SEARCH2 | jq '.results_found, .results[0].score, .results[0].preview'

echo -e "\n3️⃣ Recherche: 'règles sécurité'"
SEARCH3=$(curl -s -X POST "$API_BASE/indexing/test-search?query=règles%20sécurité&limit=2" \
-H "Authorization: Bearer $TOKEN") 
echo $SEARCH3 | jq '.results_found, .results[0].score, .results[0].preview'

echo -e "\n4️⃣ Recherche: 'badge obligatoire'"
SEARCH4=$(curl -s -X POST "$API_BASE/indexing/test-search?query=badge%20obligatoire&limit=1" \
-H "Authorization: Bearer $TOKEN")
echo $SEARCH4 | jq '.results_found, .results[0].score, .results[0].preview'

# 6. Résumé final
echo -e "\n📋 RÉSUMÉ FINAL:"
STATUS_FINAL=$(curl -s "$API_BASE/indexing/status" -H "Authorization: Bearer $TOKEN")
POSTGRES_CHUNKS=$(echo $STATUS_FINAL | jq '.status.postgres_stats.total_chunks')
QDRANT_POINTS=$(echo $STATUS_FINAL | jq '.status.qdrant_stats.points_count') 
IS_SYNC=$(echo $STATUS_FINAL | jq '.status.sync_status.is_synchronized')

echo "📦 Chunks PostgreSQL: $POSTGRES_CHUNKS"
echo "🔍 Points Qdrant: $QDRANT_POINTS"
echo "🔄 Synchronisé: $IS_SYNC"

if [ "$IS_SYNC" = "true" ]; then
    echo "✅ SYSTÈME RAG OPÉRATIONNEL !"
else
    echo "❌ Problème de synchronisation persistant"
fi

echo -e "\n🎯 Pour le test complet automatisé:"
echo "python test_rag_system.py"