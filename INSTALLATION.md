# Guide d'Installation Carthago Market

Ce guide vous accompagne pas à pas pour installer et configurer Carthago Market sur votre système.

## 🎯 Vue d'ensemble

Carthago Market est une application web fullstack qui nécessite :
- Python 3.8+ avec Flask
- MongoDB (local ou Atlas)
- Modèles IA HuggingFace
- Navigateur web moderne

## 📋 Prérequis Système

### Minimum requis
- **OS** : Ubuntu 18.04+, macOS 10.14+, Windows 10
- **RAM** : 4 GB (8 GB recommandé pour les modèles IA)
- **Stockage** : 5 GB d'espace libre
- **Python** : 3.8 ou supérieur
- **Internet** : Connexion stable pour télécharger les modèles

### Logiciels requis
```bash
# Vérifier Python
python3 --version  # Doit être 3.8+

# Vérifier pip
pip3 --version

# Vérifier Git
git --version
```

## 🚀 Installation Rapide (Ubuntu/Debian)

### Script d'installation automatique
```bash
# Télécharger et exécuter le script d'installation
curl -fsSL https://raw.githubusercontent.com/Atlas-Capital/install.sh | bash
```

### Installation manuelle

#### 1. Mise à jour du système
```bash
sudo apt update && sudo apt upgrade -y
```

#### 2. Installation des dépendances système
```bash
# Python et outils de développement
sudo apt install -y python3 python3-pip python3-venv git curl wget

# Dépendances pour les modèles IA
sudo apt install -y build-essential python3-dev
```

#### 3. Installation de MongoDB
```bash
# Ajouter la clé GPG MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Ajouter le repository MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Installer MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Démarrer et activer MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Vérifier l'installation
sudo systemctl status mongod
```

#### 4. Cloner le projet
```bash
# Cloner depuis GitHub
git clone https://github.com/votre-username/Atlas-Capital.git
cd Atlas-Capital

# Ou télécharger l'archive
wget https://github.com/votre-username/Atlas-Capital/archive/main.zip
cd Atlas-Capital-main
```

#### 5. Configuration de l'environnement Python
```bash
# Créer l'environnement virtuel
python3 -m venv venv

# Activer l'environnement
source venv/bin/activate

# Mettre à jour pip
pip install --upgrade pip

# Installer les dépendances
pip install -r requirements.txt
```

#### 6. Configuration de l'application
```bash
# Copier le fichier de configuration
cp .env.example .env

# Éditer la configuration
nano .env
```

Configuration `.env` :
```env
# Base de données MongoDB
MONGODB_URI=mongodb://localhost:27017/Atlas_Capital

# Clé secrète Flask (générer une clé unique)
SECRET_KEY=votre-cle-secrete-tres-longue-et-unique

# Configuration de développement
FLASK_ENV=development
DEBUG=True

# API BVMT
BVMT_BASE_URL=https://www.bvmt.com.tn/rest_api/rest

# Configuration IA
AI_MODEL_NAME=microsoft/DialoGPT-medium
CACHE_DIR=./models_cache
```

#### 7. Initialisation de la base de données
```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Initialiser la base de données
python -c "
from src.database.mongodb import init_mongodb
from flask import Flask
app = Flask(__name__)
app.config['MONGODB_URI'] = 'mongodb://localhost:27017/Atlas_Capital'
init_mongodb(app)
print('Base de données initialisée avec succès')
"
```

#### 8. Test de l'installation
```bash
# Lancer l'application
python src/main.py
```

Ouvrir http://localhost:5000 dans votre navigateur.

## 🍎 Installation macOS

### Avec Homebrew
```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer Python
brew install python

# Installer MongoDB
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community

# Suivre les étapes 4-8 de l'installation Ubuntu
```

### Avec MacPorts
```bash
# Installer Python
sudo port install python39 +universal

# Installer MongoDB
sudo port install mongodb
sudo port load mongodb

# Suivre les étapes 4-8 de l'installation Ubuntu
```

## 🪟 Installation Windows

### Avec Chocolatey (Recommandé)
```powershell
# Installer Chocolatey (en tant qu'administrateur)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Installer Python
choco install python

# Installer Git
choco install git

# Installer MongoDB
choco install mongodb
```

### Installation manuelle
1. **Python** : Télécharger depuis [python.org](https://www.python.org/downloads/)
2. **Git** : Télécharger depuis [git-scm.com](https://git-scm.com/download/win)
3. **MongoDB** : Télécharger depuis [mongodb.com](https://www.mongodb.com/try/download/community)

### Configuration Windows
```cmd
# Cloner le projet
git clone https://github.com/votre-username/Atlas-Capital.git
cd Atlas-Capital

# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement
venv\Scripts\activate

# Installer les dépendances
pip install -r requirements.txt

# Copier la configuration
copy .env.example .env

# Éditer .env avec Notepad
notepad .env
```

## 🐳 Installation avec Docker

### Prérequis
```bash
# Installer Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installer Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Déploiement avec Docker
```bash
# Cloner le projet
git clone https://github.com/votre-username/Atlas-Capital.git
cd Atlas-Capital

# Construire et lancer avec Docker Compose
docker-compose up -d

# Vérifier les conteneurs
docker-compose ps

# Voir les logs
docker-compose logs -f warren-ai
```

### Dockerfile personnalisé
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Installer les dépendances système
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copier les fichiers de dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Copier le code source
COPY . .

# Exposer le port
EXPOSE 5000

# Commande de démarrage
CMD ["python", "src/main.py"]
```

## ☁️ Configuration MongoDB Atlas

### Création du cluster
1. Aller sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créer un compte gratuit
3. Créer un nouveau cluster (M0 gratuit)
4. Configurer l'accès réseau (0.0.0.0/0 pour les tests)
5. Créer un utilisateur de base de données

### Configuration de la connexion
```env
# Dans le fichier .env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/Atlas_Capital?retryWrites=true&w=majority
```

### Test de connexion
```python
# Test de connexion Atlas
python -c "
import pymongo
from dotenv import load_dotenv
import os

load_dotenv()
client = pymongo.MongoClient(os.getenv('MONGODB_URI'))
db = client.Atlas_Capital
print('Connexion Atlas réussie:', db.name)
"
```

## 🤖 Configuration des Modèles IA

### Téléchargement automatique
Les modèles sont téléchargés automatiquement au premier usage :
```bash
# Premier lancement (peut prendre 5-10 minutes)
python src/main.py
```

### Téléchargement manuel
```python
# Script de pré-téléchargement
python -c "
from src.services.ai_service import AIService
ai_service = AIService()
ai_service.initialize_models()
print('Modèles IA téléchargés avec succès')
"
```

### Configuration avancée
```python
# src/services/ai_service.py
AI_MODELS = {
    'summarizer': 'facebook/bart-large-cnn',  # 1.6 GB
    'sentiment': 'cardiffnlp/twitter-roberta-base-sentiment-latest',  # 500 MB
    'classifier': 'distilbert-base-uncased'  # 250 MB
}
```

## 🔧 Configuration Avancée

### Variables d'environnement complètes
```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/Atlas_Capital
MONGODB_MAX_POOL_SIZE=10
MONGODB_TIMEOUT=5000

# Sécurité
SECRET_KEY=votre-cle-secrete-unique-de-32-caracteres
JWT_SECRET_KEY=autre-cle-pour-jwt
BCRYPT_LOG_ROUNDS=12

# Flask
FLASK_ENV=production
DEBUG=False
TESTING=False

# APIs externes
BVMT_BASE_URL=https://www.bvmt.com.tn/rest_api/rest
BVMT_TIMEOUT=10
BVMT_RETRY_ATTEMPTS=3

# IA et Cache
AI_MODEL_NAME=microsoft/DialoGPT-medium
CACHE_DIR=./models_cache
AI_CACHE_TIMEOUT=3600
MAX_TEXT_LENGTH=5000

# Logging
LOG_LEVEL=INFO
LOG_FILE=logs/Atlas-Capital.log
LOG_MAX_SIZE=10MB
LOG_BACKUP_COUNT=5

# Performance
WORKERS=4
THREADS=2
TIMEOUT=30
KEEPALIVE=2

# Redis (optionnel)
REDIS_URL=redis://localhost:6379/0
REDIS_TIMEOUT=5
```

### Configuration Nginx (Production)
```nginx
# /etc/nginx/sites-available/Atlas-Capital
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /static {
        alias /path/to/Atlas-Capital/src/static;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Service Systemd (Production)
```ini
# /etc/systemd/system/Atlas-Capital.service
[Unit]
Description=Warren AI Financial Analysis Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/Atlas-Capital
Environment=PATH=/opt/Atlas-Capital/venv/bin
ExecStart=/opt/Atlas-Capital/venv/bin/gunicorn --workers 4 --bind 0.0.0.0:5000 src.main:app
Restart=always

[Install]
WantedBy=multi-user.target
```

## 🧪 Vérification de l'Installation

### Tests automatiques
```bash
# Activer l'environnement
source venv/bin/activate

# Installer les dépendances de test
pip install pytest pytest-cov

# Lancer les tests
pytest tests/ -v

# Test avec couverture
pytest --cov=src tests/
```

### Tests manuels
```bash
# Test de l'API
curl http://localhost:5000/api/stocks/market/rises

# Test de la base de données
python -c "
from src.database.mongodb import get_db
db = get_db()
print('Collections:', db.list_collection_names())
"

# Test des modèles IA
python -c "
from src.services.ai_service import AIService
ai = AIService()
result = ai.analyze_sentiment('Le marché est en hausse')
print('Test IA réussi:', result)
"
```

## 🐛 Résolution de Problèmes

### Erreurs courantes

#### Port déjà utilisé
```bash
# Trouver le processus
sudo lsof -i :5000

# Arrêter le processus
sudo kill -9 <PID>

# Ou changer le port
export FLASK_RUN_PORT=5001
```

#### Problème de permissions MongoDB
```bash
# Réparer les permissions
sudo chown -R mongodb:mongodb /var/lib/mongodb
sudo chown mongodb:mongodb /tmp/mongodb-27017.sock
sudo systemctl restart mongod
```

#### Modèles IA non téléchargés
```bash
# Vider le cache
rm -rf ./models_cache/

# Forcer le téléchargement
python -c "
from transformers import pipeline
summarizer = pipeline('summarization', model='facebook/bart-large-cnn')
print('Modèle téléchargé')
"
```

#### Erreur de mémoire
```bash
# Augmenter la swap (Ubuntu)
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Ou utiliser des modèles plus légers
export AI_MODEL_NAME=distilbert-base-uncased
```

### Logs de débogage
```bash
# Logs détaillés
export FLASK_ENV=development
export LOG_LEVEL=DEBUG
python src/main.py

# Logs MongoDB
sudo tail -f /var/log/mongodb/mongod.log

# Logs système
sudo journalctl -u Atlas-Capital -f
```

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifiez les logs** : `logs/Atlas-Capital.log`
2. **Consultez la FAQ** : [FAQ.md](FAQ.md)
3. **Ouvrez une issue** : [GitHub Issues](https://github.com/votre-username/Atlas-Capital/issues)
4. **Rejoignez Discord** : [Serveur communauté](discord-url)

## ✅ Checklist Post-Installation

- [ ] Python 3.8+ installé et fonctionnel
- [ ] MongoDB démarré et accessible
- [ ] Environnement virtuel créé et activé
- [ ] Dépendances Python installées
- [ ] Fichier .env configuré
- [ ] Base de données initialisée
- [ ] Application accessible sur http://localhost:5000
- [ ] API endpoints répondent correctement
- [ ] Modèles IA téléchargés et fonctionnels
- [ ] Tests passent avec succès

Félicitations ! Carthago Market est maintenant installé et prêt à l'emploi. 🎉
