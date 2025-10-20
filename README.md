# Carthago Market - Plateforme d'Analyse Financière BVMT

Carthago Market est une application web fullstack moderne qui permet d'analyser les données financières de la Bourse de Valeurs Mobilières de Tunis (BVMT) en utilisant l'intelligence artificielle.

## 🚀 Fonctionnalités

### 📊 Données Financières
- **Récupération en temps réel** des données BVMT via API REST
- **Suivi des actions** avec historique et données intraday
- **Analyse de marché** : hausses, baisses, volumes
- **Recherche avancée** d'actions par ticker ou nom

### 🤖 Intelligence Artificielle
- **Analyse de sentiment** des actualités financières
- **Résumé automatique** d'articles et rapports
- **Comparaison d'actions** avec recommandations IA
- **Insights personnalisés** basés sur l'analyse des données

### 💻 Interface Moderne
- **Design responsive** compatible mobile et desktop
- **Tableaux de bord interactifs** avec graphiques Chart.js
- **Navigation intuitive** entre les sections
- **Thème professionnel** avec palette de couleurs financières

## 🏗️ Architecture Technique

### Backend (Flask)
- **Framework** : Flask avec architecture modulaire (blueprints)
- **Base de données** : MongoDB avec collections optimisées
- **API REST** : Endpoints documentés et sécurisés
- **Services** : Couche d'abstraction pour BVMT et IA

### Frontend (HTML/CSS/JS)
- **Technologies** : HTML5, CSS3, JavaScript ES6+
- **Bibliothèques** : Chart.js pour les graphiques
- **Architecture** : Modules JavaScript avec gestion d'état
- **Design** : CSS Grid/Flexbox avec variables CSS

### Intelligence Artificielle
- **Modèles** : HuggingFace Transformers (BART, DistilBERT)
- **Fonctionnalités** : Résumé, analyse de sentiment, comparaison
- **Cache** : Optimisation des performances avec mise en cache

## 📋 Prérequis

- **Python** 3.8+ avec pip
- **MongoDB** 4.4+ (local ou Atlas)
- **Node.js** 14+ (optionnel, pour outils de développement)
- **Git** pour le clonage du repository

## 🛠️ Installation

### 1. Cloner le projet
```bash
git clone <repository-url>
cd Atlas-Capital
```

### 2. Créer l'environnement virtuel
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows
```

### 3. Installer les dépendances
```bash
pip install -r requirements.txt
```

### 4. Configuration de la base de données

#### Option A : MongoDB Local
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# macOS avec Homebrew
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb/brew/mongodb-community
```

#### Option B : MongoDB Atlas
1. Créer un compte sur [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Créer un cluster gratuit
3. Obtenir la chaîne de connexion
4. Mettre à jour le fichier `.env`

### 5. Configuration des variables d'environnement
```bash
cp .env.example .env
```

Éditer le fichier `.env` :
```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/warren_ai
# ou pour Atlas :
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/warren_ai

# Sécurité
SECRET_KEY=votre-cle-secrete-unique

# Configuration
FLASK_ENV=development
DEBUG=True

# APIs
BVMT_BASE_URL=https://www.bvmt.com.tn/rest_api/rest
```

## 🚀 Lancement de l'application

### Développement
```bash
# Activer l'environnement virtuel
source venv/bin/activate

# Lancer l'application
python src/main.py
```

L'application sera accessible sur : http://localhost:5000

### Production
```bash
# Installer un serveur WSGI
pip install gunicorn

# Lancer avec Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 src.main:app
```

## 📚 Utilisation

### Interface Web
1. **Tableau de bord** : Vue d'ensemble du marché BVMT
2. **Actions** : Recherche et analyse détaillée des titres
3. **Actualités** : Flux d'actualités financières avec filtres
4. **Analyse IA** : Outils d'analyse intelligente

### API REST

#### Endpoints Stocks
```bash
# Liste des actions
GET /api/stocks/

# Détails d'une action
GET /api/stocks/{ticker}

# Recherche d'actions
GET /api/stocks/search?q=BNA

# Hausses du marché
GET /api/stocks/market/rises

# Baisses du marché
GET /api/stocks/market/falls

# Volumes du marché
GET /api/stocks/market/volumes
```

#### Endpoints Actualités
```bash
# Dernières actualités
GET /api/news/latest

# Actualités par catégorie
GET /api/news/?category=market

# Recherche d'actualités
GET /api/news/search?q=banque
```

#### Endpoints IA
```bash
# Analyse de texte
POST /api/ai/analyze
{
  "text": "Texte à analyser",
  "analysis_type": "sentiment"
}

# Comparaison d'actions
POST /api/ai/compare
{
  "ticker1": "BNA",
  "ticker2": "STB"
}

# Résumé d'actualités
POST /api/ai/summarize
{
  "news_ids": ["id1", "id2"]
}
```

## 🔧 Configuration Avancée

### Modèles IA
Les modèles sont téléchargés automatiquement au premier usage. Pour personnaliser :

```python
# src/services/ai_service.py
AI_MODELS = {
    'summarizer': 'facebook/bart-large-cnn',
    'sentiment': 'nlptown/bert-base-multilingual-uncased-sentiment',
    'classifier': 'distilbert-base-uncased'
}
```

### Cache et Performance
```python
# Configuration du cache Redis (optionnel)
REDIS_URL = 'redis://localhost:6379/0'
CACHE_TIMEOUT = 300  # 5 minutes
```

### Logging
```python
# Configuration des logs
LOGGING_LEVEL = 'INFO'
LOG_FILE = 'logs/Atlas-Capital.log'
```

## 🧪 Tests

### Tests unitaires
```bash
# Installer les dépendances de test
pip install pytest pytest-cov

# Lancer les tests
pytest tests/

# Avec couverture
pytest --cov=src tests/
```

### Tests d'intégration
```bash
# Tester les APIs
python tests/test_api_integration.py

# Tester la base de données
python tests/test_database.py
```

## 📊 Monitoring et Logs

### Logs de l'application
```bash
# Voir les logs en temps réel
tail -f logs/Atlas-Capital.log

# Logs par niveau
grep "ERROR" logs/Atlas-Capital.log
```

### Métriques de performance
- Temps de réponse API
- Utilisation mémoire des modèles IA
- Statistiques d'utilisation MongoDB

## 🔒 Sécurité

### Bonnes pratiques implémentées
- **Variables d'environnement** pour les secrets
- **Validation des entrées** utilisateur
- **Limitation du taux** de requêtes API
- **CORS** configuré pour la production
- **Logs de sécurité** pour le monitoring

### Configuration production
```python
# Désactiver le mode debug
DEBUG = False

# Utiliser HTTPS
SSL_CONTEXT = 'adhoc'

# Configurer les headers de sécurité
SECURITY_HEADERS = True
```

## 🚀 Déploiement

### Docker (Recommandé)
```dockerfile
# Dockerfile fourni
docker build -t Atlas-Capital .
docker run -p 5000:5000 Atlas-Capital
```

### Heroku
```bash
# Installer Heroku CLI
heroku create Atlas-Capital-app
git push heroku main
```

### VPS/Serveur dédié
```bash
# Nginx + Gunicorn
sudo apt install nginx
# Configuration Nginx fournie dans /deploy/nginx.conf
```

## 🤝 Contribution

### Structure du projet
```
warren-ai/
├── src/
│   ├── main.py              # Point d'entrée Flask
│   ├── database/            # Connexion MongoDB
│   ├── routes/              # Endpoints API
│   ├── services/            # Logique métier
│   └── static/              # Frontend (HTML/CSS/JS)
├── tests/                   # Tests unitaires
├── docs/                    # Documentation
├── deploy/                  # Scripts de déploiement
└── requirements.txt         # Dépendances Python
```

### Guidelines de développement
1. **Code style** : PEP 8 pour Python, ESLint pour JavaScript
2. **Tests** : Couverture minimale de 80%
3. **Documentation** : Docstrings pour toutes les fonctions
4. **Git** : Commits atomiques avec messages descriptifs

## 📈 Roadmap

### Version 1.1
- [ ] Alertes en temps réel
- [ ] Export PDF des analyses
- [ ] API GraphQL
- [ ] Mode sombre

### Version 1.2
- [ ] Machine Learning prédictif
- [ ] Intégration Slack/Discord
- [ ] Application mobile
- [ ] Analyse technique avancée

## 🐛 Dépannage

### Problèmes courants

#### Erreur de connexion MongoDB
```bash
# Vérifier le statut
sudo systemctl status mongod

# Redémarrer si nécessaire
sudo systemctl restart mongod
```

#### Modèles IA non trouvés
```bash
# Vider le cache et retélécharger
rm -rf ./models_cache/
python -c "from src.services.ai_service import AIService; AIService().initialize_models()"
```

#### Erreur de port déjà utilisé
```bash
# Trouver le processus
lsof -i :5000

# Arrêter le processus
kill -9 <PID>
```

## 📞 Support

- **Documentation** : [Wiki du projet](wiki-url)
- **Issues** : [GitHub Issues](issues-url)
- **Email** : support@Atlas-Capital.com
- **Discord** : [Serveur communauté](discord-url)

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

- **BVMT** pour l'accès aux données financières
- **HuggingFace** pour les modèles IA pré-entraînés
- **MongoDB** pour la base de données
- **Flask** pour le framework web
- **Chart.js** pour les visualisations

---

**Carthago Market** - Analyse financière intelligente pour la BVMT 🚀📊🤖
