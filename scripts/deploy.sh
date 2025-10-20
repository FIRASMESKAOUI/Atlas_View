#!/bin/bash

# Warren AI - Script de déploiement automatique
# Usage: ./scripts/deploy.sh [production|staging|development]

set -e  # Arrêter en cas d'erreur

# Configuration
ENVIRONMENT=${1:-development}
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$PROJECT_DIR/venv"
LOG_FILE="$PROJECT_DIR/logs/Atlas-Capital.log"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de logging
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

# Vérifier les prérequis
check_prerequisites() {
    log "Vérification des prérequis..."
    
    # Vérifier Python
    if ! command -v python3 &> /dev/null; then
        error "Python 3 n'est pas installé"
    fi
    
    # Vérifier pip
    if ! command -v pip3 &> /dev/null; then
        error "pip3 n'est pas installé"
    fi
    
    # Vérifier Git
    if ! command -v git &> /dev/null; then
        error "Git n'est pas installé"
    fi
    
    log "Prérequis vérifiés avec succès"
}

# Créer les répertoires nécessaires
create_directories() {
    log "Création des répertoires..."
    
    mkdir -p "$PROJECT_DIR/logs"
    mkdir -p "$PROJECT_DIR/models_cache"
    mkdir -p "$PROJECT_DIR/backups"
    
    log "Répertoires créés"
}

# Configurer l'environnement virtuel
setup_virtualenv() {
    log "Configuration de l'environnement virtuel..."
    
    if [ ! -d "$VENV_DIR" ]; then
        python3 -m venv "$VENV_DIR"
        log "Environnement virtuel créé"
    else
        log "Environnement virtuel existant trouvé"
    fi
    
    # Activer l'environnement virtuel
    source "$VENV_DIR/bin/activate"
    
    # Mettre à jour pip
    pip install --upgrade pip
    
    log "Environnement virtuel configuré"
}

# Installer les dépendances
install_dependencies() {
    log "Installation des dépendances..."
    
    source "$VENV_DIR/bin/activate"
    
    # Installer les dépendances Python
    pip install -r "$PROJECT_DIR/requirements.txt"
    
    log "Dépendances installées"
}

# Configurer la base de données
setup_database() {
    log "Configuration de la base de données..."
    
    # Vérifier si MongoDB est en cours d'exécution
    if ! pgrep -x "mongod" > /dev/null; then
        warning "MongoDB ne semble pas être en cours d'exécution"
        
        # Essayer de démarrer MongoDB
        if command -v systemctl &> /dev/null; then
            sudo systemctl start mongod || warning "Impossible de démarrer MongoDB automatiquement"
        fi
    fi
    
    # Tester la connexion à la base de données
    source "$VENV_DIR/bin/activate"
    python3 -c "
from src.database.mongodb import init_mongodb
from flask import Flask
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
app.config['MONGODB_URI'] = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/warren_ai')

try:
    init_mongodb(app)
    print('Connexion à la base de données réussie')
except Exception as e:
    print(f'Erreur de connexion à la base de données: {e}')
    exit(1)
" || error "Impossible de se connecter à la base de données"
    
    log "Base de données configurée"
}

# Configurer les variables d'environnement
setup_environment() {
    log "Configuration des variables d'environnement..."
    
    ENV_FILE="$PROJECT_DIR/.env"
    
    if [ ! -f "$ENV_FILE" ]; then
        log "Création du fichier .env..."
        
        cat > "$ENV_FILE" << EOF
# Configuration Warren AI - $ENVIRONMENT

# Base de données MongoDB
MONGODB_URI=mongodb://localhost:27017/warren_ai

# Clé secrète Flask (CHANGEZ CETTE VALEUR EN PRODUCTION)
SECRET_KEY=$(openssl rand -hex 32)

# Configuration de l'environnement
FLASK_ENV=$ENVIRONMENT
DEBUG=$([ "$ENVIRONMENT" = "development" ] && echo "True" || echo "False")

# API BVMT
BVMT_BASE_URL=https://www.bvmt.com.tn/rest_api/rest

# Configuration IA
AI_MODEL_NAME=microsoft/DialoGPT-medium
CACHE_DIR=./models_cache

# Logging
LOG_LEVEL=$([ "$ENVIRONMENT" = "development" ] && echo "DEBUG" || echo "INFO")
LOG_FILE=logs/Atlas-Capital.log
EOF
        
        log "Fichier .env créé"
    else
        log "Fichier .env existant trouvé"
    fi
}

# Télécharger les modèles IA
download_ai_models() {
    log "Téléchargement des modèles IA..."
    
    source "$VENV_DIR/bin/activate"
    
    # Pré-télécharger les modèles pour éviter les délais au premier usage
    python3 -c "
from src.services.ai_service import AIService
import os

try:
    ai_service = AIService()
    ai_service.initialize_models()
    print('Modèles IA téléchargés avec succès')
except Exception as e:
    print(f'Erreur lors du téléchargement des modèles: {e}')
    print('Les modèles seront téléchargés au premier usage')
" || warning "Impossible de pré-télécharger les modèles IA"
    
    log "Modèles IA configurés"
}

# Exécuter les tests
run_tests() {
    log "Exécution des tests..."
    
    source "$VENV_DIR/bin/activate"
    
    # Tests basiques
    python3 -c "
import sys
sys.path.insert(0, 'src')

# Test d'import des modules principaux
try:
    from src.main import create_app
    from src.services.bvmt_service import BVMTService
    from src.services.ai_service import AIService
    print('Tous les modules s\'importent correctement')
except ImportError as e:
    print(f'Erreur d\'import: {e}')
    sys.exit(1)

# Test de création de l'app Flask
try:
    app = create_app()
    print('Application Flask créée avec succès')
except Exception as e:
    print(f'Erreur lors de la création de l\'app: {e}')
    sys.exit(1)
" || error "Les tests ont échoué"
    
    log "Tests réussis"
}

# Configurer le service systemd (production uniquement)
setup_systemd_service() {
    if [ "$ENVIRONMENT" != "production" ]; then
        return
    fi
    
    log "Configuration du service systemd..."
    
    SERVICE_FILE="/etc/systemd/system/Atlas-Capital.service"

    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=Warren AI Financial Analysis Platform
After=network.target mongod.service
Requires=mongod.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR
Environment=PATH=$VENV_DIR/bin
ExecStart=$VENV_DIR/bin/gunicorn --workers 4 --bind 0.0.0.0:5000 --timeout 120 src.main:app
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    # Recharger systemd et activer le service
    sudo systemctl daemon-reload
    sudo systemctl enable Atlas-Capital

    log "Service systemd configuré"
}

# Configurer Nginx (production uniquement)
setup_nginx() {
    if [ "$ENVIRONMENT" != "production" ]; then
        return
    fi
    
    log "Configuration de Nginx..."
    
    NGINX_CONFIG="/etc/nginx/sites-available/Atlas-Capital"

    sudo tee "$NGINX_CONFIG" > /dev/null << EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 120s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
    }

    location /static {
        alias $PROJECT_DIR/src/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF
    
    # Activer le site
    sudo ln -sf "$NGINX_CONFIG" /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    
    log "Nginx configuré"
}

# Démarrer l'application
start_application() {
    log "Démarrage de l'application..."
    
    case "$ENVIRONMENT" in
        "production")
            sudo systemctl start Atlas-Capital
            sudo systemctl status Atlas-Capital --no-pager
            ;;
        "staging"|"development")
            source "$VENV_DIR/bin/activate"
            info "Pour démarrer l'application en mode $ENVIRONMENT:"
            info "cd $PROJECT_DIR"
            info "source venv/bin/activate"
            info "python src/main.py"
            ;;
    esac
    
    log "Application configurée pour l'environnement $ENVIRONMENT"
}

# Créer un script de sauvegarde
create_backup_script() {
    log "Création du script de sauvegarde..."
    
    BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup.sh"
    
    cat > "$BACKUP_SCRIPT" << 'EOF'
#!/bin/bash

# Script de sauvegarde Warren AI
BACKUP_DIR="$(dirname "$0")/../backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/warren_ai_backup_$DATE.tar.gz"

# Créer le répertoire de sauvegarde
mkdir -p "$BACKUP_DIR"

# Sauvegarder la base de données MongoDB
mongodump --db warren_ai --out "$BACKUP_DIR/db_$DATE"

# Créer l'archive complète
tar -czf "$BACKUP_FILE" \
    --exclude='venv' \
    --exclude='models_cache' \
    --exclude='logs' \
    --exclude='__pycache__' \
    --exclude='.git' \
    -C "$(dirname "$0")/.." .

echo "Sauvegarde créée: $BACKUP_FILE"

# Nettoyer les anciennes sauvegardes (garder les 7 dernières)
find "$BACKUP_DIR" -name "warren_ai_backup_*.tar.gz" -type f -mtime +7 -delete
find "$BACKUP_DIR" -name "db_*" -type d -mtime +7 -exec rm -rf {} +
EOF
    
    chmod +x "$BACKUP_SCRIPT"
    
    log "Script de sauvegarde créé: $BACKUP_SCRIPT"
}

# Afficher le résumé du déploiement
show_summary() {
    log "=== RÉSUMÉ DU DÉPLOIEMENT ==="
    info "Environnement: $ENVIRONMENT"
    info "Répertoire du projet: $PROJECT_DIR"
    info "Environnement virtuel: $VENV_DIR"
    info "Fichier de logs: $LOG_FILE"
    
    case "$ENVIRONMENT" in
        "production")
            info "Service systemd: Atlas-Capital"
            info "Configuration Nginx: /etc/nginx/sites-available/Atlas-Capital"
            info "Commandes utiles:"
            info "  - Statut: sudo systemctl status Atlas-Capital"
            info "  - Logs: sudo journalctl -u Atlas-Capital -f"
            info "  - Redémarrer: sudo systemctl restart Atlas-Capital"
            ;;
        *)
            info "Pour démarrer l'application:"
            info "  cd $PROJECT_DIR"
            info "  source venv/bin/activate"
            info "  python src/main.py"
            ;;
    esac
    
    info "Script de sauvegarde: $PROJECT_DIR/scripts/backup.sh"
    info "Documentation API: $PROJECT_DIR/API_DOCUMENTATION.md"
    
    log "Déploiement terminé avec succès!"
}

# Fonction principale
main() {
    log "Début du déploiement Warren AI - Environnement: $ENVIRONMENT"
    
    check_prerequisites
    create_directories
    setup_virtualenv
    install_dependencies
    setup_environment
    setup_database
    download_ai_models
    run_tests
    
    if [ "$ENVIRONMENT" = "production" ]; then
        setup_systemd_service
        setup_nginx
    fi
    
    create_backup_script
    start_application
    show_summary
}

# Gestion des signaux
trap 'error "Déploiement interrompu"' INT TERM

# Exécution
main "$@"
