#!/bin/bash

# Script de sécurisation et de test pour serveur CentOS/AlmaLinux 9
# À exécuter en tant que root sur la VM

LOG_FILE="/var/log/security_setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "🛡️  Démarrage de la sécurisation du serveur ($(date))..."

# 1. Mise à jour du système (Sécurité uniquement)
echo "📦 Mise à jour des paquets de sécurité..."
dnf update --security -y

# 2. Installation des outils
echo "🔧 Installation de firewalld, fail2ban et nmap (pour le test)..."
dnf install -y firewalld fail2ban nmap-ncat

# Configuration du Pare-feu (Firewalld)
echo "🔥 Configuration du Pare-feu (Firewalld)..."
systemctl enable --now firewalld

# Reset complet
firewall-cmd --permanent --remove-service=cockpit 2>/dev/null
firewall-cmd --permanent --remove-service=dhcpv6-client 2>/dev/null
firewall-cmd --permanent --remove-service=ssh 2>/dev/null
firewall-cmd --permanent --remove-service=http 2>/dev/null
firewall-cmd --permanent --remove-service=https 2>/dev/null

# Autoriser UNIQUEMENT le strict nécessaire
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https

# Appliquer les changements
firewall-cmd --reload

# 4. Configuration de Fail2Ban
echo "👮 Configuration de Fail2Ban (Anti-BruteForce)..."
cat <<EOF > /etc/fail2ban/jail.local
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF

systemctl enable --now fail2ban

echo -e "\n🔍 --- DIAGNOSTIC DE SÉCURITÉ ---"

# Test A : État des services
check_service() {
    if systemctl is-active --quiet $1; then
        echo "✅ Service $1 : ACTIF"
    else
        echo "❌ Service $1 : ARRÊTÉ (Erreur)"
    fi
}

check_service firewalld
check_service fail2ban

# Test B : Vérification des ports ouverts dans Firewalld
SERVICES=$(firewall-cmd --list-services)
echo "🌐 Services autorisés : $SERVICES"

# Test C : Auto-scan des ports sensibles (Simulation d'attaque locale)
# On vérifie si les ports DB répondent sur l'interface publique
PUBLIC_IP=$(curl -s https://ifconfig.me)
echo "📡 Scan de l'IP publique ($PUBLIC_IP) pour les ports sensibles..."

test_port() {
    # On utilise nc (netcat) avec un timeout de 2s
    nc -z -w 2 $PUBLIC_IP $1 > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "⚠️  ALERTE : Port $1 ($2) est OUVERT sur l'IP publique !"
    else
        echo "✅ Port $1 ($2) est bien BLOQUÉ."
    fi
}

test_port 5432 "PostgreSQL"
test_port 6379 "Redis"
test_port 6333 "Qdrant"
test_port 8000 "Backend API (direct)"

echo -e "\n✨ SÉCURISATION TERMINÉE !"
echo "Les logs détaillés sont disponibles dans $LOG_FILE"
