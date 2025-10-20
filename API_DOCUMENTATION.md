# Documentation API Warren AI

Cette documentation décrit tous les endpoints disponibles dans l'API REST de Warren AI.

## 🌐 URL de Base

```
http://localhost:5000/api
```

## 🔐 Authentification

Actuellement, l'API est ouverte pour les tests. En production, utilisez des tokens JWT :

```http
Authorization: Bearer <token>
```

## 📊 Endpoints Stocks

### GET /api/stocks/

Récupère la liste des actions avec pagination.

**Paramètres de requête :**
- `page` (int, optionnel) : Numéro de page (défaut: 1)
- `limit` (int, optionnel) : Nombre d'éléments par page (max: 100, défaut: 20)
- `search` (string, optionnel) : Recherche par ticker ou nom

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/?page=1&limit=10&search=BNA"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "ticker": "BNA",
      "stock_name": "Banque Nationale Agricole",
      "isin": "TN0009050014",
      "last_price": 45.50,
      "change": 1.25,
      "change_percent": 2.82,
      "volume": 15420,
      "market_cap": 1250000000,
      "last_updated": "2025-09-27T15:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 85,
    "pages": 9
  }
}
```

### GET /api/stocks/{ticker}

Récupère les détails d'une action spécifique.

**Paramètres de chemin :**
- `ticker` (string) : Code ticker de l'action

**Paramètres de requête :**
- `include_history` (boolean, optionnel) : Inclure l'historique des prix
- `include_intraday` (boolean, optionnel) : Inclure les données intraday

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/BNA?include_history=true"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d0",
    "ticker": "BNA",
    "stock_name": "Banque Nationale Agricole",
    "isin": "TN0009050014",
    "last_price": 45.50,
    "open_price": 44.25,
    "high_price": 46.00,
    "low_price": 44.00,
    "change": 1.25,
    "change_percent": 2.82,
    "volume": 15420,
    "market_cap": 1250000000,
    "sector": "Banques",
    "history": [
      {
        "date": "2025-09-26",
        "close_price": 44.25,
        "volume": 12350
      }
    ]
  }
}
```

### GET /api/stocks/search

Recherche des actions par ticker ou nom.

**Paramètres de requête :**
- `q` (string, requis) : Terme de recherche
- `limit` (int, optionnel) : Nombre de résultats (max: 50, défaut: 10)

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/search?q=banque&limit=5"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "ticker": "BNA",
      "stock_name": "Banque Nationale Agricole",
      "last_price": 45.50,
      "change_percent": 2.82
    }
  ],
  "query": "banque"
}
```

### GET /api/stocks/market-summary

Récupère un résumé du marché.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/market-summary"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "total_stocks": 85,
    "market_cap_total": 25000000000,
    "volume_total": 1250000,
    "top_gainers": [
      {
        "ticker": "CELL",
        "change_percent": 5.25
      }
    ],
    "top_losers": [
      {
        "ticker": "SFBT",
        "change_percent": -3.15
      }
    ],
    "most_active": [
      {
        "ticker": "BNA",
        "volume": 15420
      }
    ]
  }
}
```

### GET /api/stocks/market/rises

Récupère les hausses du marché depuis l'API BVMT.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/market/rises"
```

### GET /api/stocks/market/falls

Récupère les baisses du marché depuis l'API BVMT.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/market/falls"
```

### GET /api/stocks/market/volumes

Récupère les volumes du marché depuis l'API BVMT.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/stocks/market/volumes"
```

### POST /api/stocks/update

Met à jour les données des actions depuis l'API BVMT.

**Exemple de requête :**
```bash
curl -X POST "http://localhost:5000/api/stocks/update"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "updated_stocks": 85,
    "new_stocks": 3,
    "timestamp": "2025-09-27T15:30:00Z"
  }
}
```

## 📰 Endpoints Actualités

### GET /api/news/

Récupère les actualités avec pagination.

**Paramètres de requête :**
- `limit` (int, optionnel) : Nombre d'actualités (max: 100, défaut: 20)
- `category` (string, optionnel) : Filtrer par catégorie

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/news/?limit=10&category=market"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d1",
      "title": "La BVMT enregistre une hausse de 2.5%",
      "summary": "Le marché tunisien affiche une performance positive...",
      "content": "Contenu complet de l'article...",
      "category": "market",
      "date": "2025-09-27T10:00:00Z",
      "url": "https://source.com/article"
    }
  ],
  "count": 10,
  "category": "market"
}
```

### GET /api/news/latest

Récupère les dernières actualités.

**Paramètres de requête :**
- `limit` (int, optionnel) : Nombre d'actualités (max: 50, défaut: 10)

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/news/latest?limit=5"
```

### GET /api/news/search

Recherche dans les actualités.

**Paramètres de requête :**
- `q` (string, requis) : Terme de recherche
- `limit` (int, optionnel) : Nombre de résultats (défaut: 20)

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/news/search?q=banque&limit=10"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "title": "Les banques tunisiennes en croissance",
      "summary": "Le secteur bancaire montre des signes positifs...",
      "relevance_score": 0.95
    }
  ],
  "query": "banque",
  "count": 5
}
```

## 🤖 Endpoints Intelligence Artificielle

### POST /api/ai/analyze

Analyse un texte avec l'IA.

**Corps de la requête :**
```json
{
  "text": "Texte à analyser",
  "analysis_type": "sentiment|summary|full"
}
```

**Exemple de requête :**
```bash
curl -X POST "http://localhost:5000/api/ai/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le marché boursier tunisien affiche une excellente performance cette semaine avec des gains significatifs dans le secteur bancaire.",
    "analysis_type": "full"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "summary": {
      "summary": "Le marché tunisien performe bien, notamment les banques."
    },
    "sentiment": {
      "sentiment": "positive",
      "confidence": 0.89,
      "explanation": "Le texte exprime une opinion positive sur la performance du marché."
    },
    "analysis_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "timestamp": "2025-09-27T15:30:00Z"
  }
}
```

### POST /api/ai/compare

Compare deux actions avec l'IA.

**Corps de la requête :**
```json
{
  "ticker1": "BNA",
  "ticker2": "STB"
}
```

**Exemple de requête :**
```bash
curl -X POST "http://localhost:5000/api/ai/compare" \
  -H "Content-Type: application/json" \
  -d '{
    "ticker1": "BNA",
    "ticker2": "STB"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "ticker1": "BNA",
    "ticker2": "STB",
    "comparison_summary": "BNA montre une meilleure performance récente...",
    "recommendation": {
      "preferred_stock": "BNA",
      "reasoning": "Basé sur les métriques financières et la tendance..."
    },
    "detailed_comparison": "Analyse détaillée des deux actions...",
    "confidence": 0.78
  }
}
```

### POST /api/ai/summarize

Résume des actualités avec l'IA.

**Corps de la requête :**
```json
{
  "news_ids": ["id1", "id2", "id3"],
  "max_length": 150
}
```

**Exemple de requête :**
```bash
curl -X POST "http://localhost:5000/api/ai/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "news_ids": ["64f8a1b2c3d4e5f6a7b8c9d1"],
    "max_length": 100
  }'
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "summary": "Résumé consolidé des actualités sélectionnées...",
    "source_count": 3,
    "confidence": 0.85,
    "key_topics": ["marché", "banques", "performance"]
  }
}
```

### GET /api/ai/sentiment/market

Analyse le sentiment général du marché.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/ai/sentiment/market"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "overall_sentiment": "positive",
    "confidence": 0.72,
    "statistics": {
      "positive": 15,
      "negative": 5,
      "neutral": 8,
      "total": 28
    },
    "individual_sentiments": [
      {
        "news_title": "Hausse des indices boursiers",
        "sentiment": {
          "sentiment": "positive",
          "confidence": 0.91
        }
      }
    ]
  }
}
```

### GET /api/ai/status

Vérifie le statut des modèles IA.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/ai/status"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "models_loaded": true,
    "summarizer_test": "OK",
    "sentiment_test": "OK",
    "cache_size": "2.1 GB",
    "last_model_update": "2025-09-27T10:00:00Z"
  }
}
```

## 📈 Endpoints Insights

### GET /api/ai/insights

Récupère les insights IA récents.

**Paramètres de requête :**
- `limit` (int, optionnel) : Nombre d'insights (défaut: 10)
- `type` (string, optionnel) : Type d'analyse

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/ai/insights?limit=5&type=stock_analysis"
```

**Réponse :**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d3",
      "analysis_type": "stock_analysis",
      "ticker": "BNA",
      "results": {
        "summary": "Analyse positive de BNA...",
        "sentiment": "positive"
      },
      "timestamp": "2025-09-27T14:00:00Z"
    }
  ]
}
```

## 🔧 Endpoints Utilitaires

### GET /health

Vérifie la santé de l'application.

**Exemple de requête :**
```bash
curl "http://localhost:5000/health"
```

**Réponse :**
```json
{
  "status": "healthy",
  "message": "Warren AI is running",
  "version": "1.0.0"
}
```

### GET /api/status

Vérifie le statut de l'API et des services.

**Exemple de requête :**
```bash
curl "http://localhost:5000/api/status"
```

**Réponse :**
```json
{
  "api": "running",
  "database": "connected",
  "ai_models": "available"
}
```

## 🚨 Gestion des Erreurs

### Codes de statut HTTP

- `200` : Succès
- `400` : Requête invalide
- `404` : Ressource non trouvée
- `500` : Erreur serveur interne

### Format des erreurs

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "code": "ERROR_CODE",
  "details": {
    "field": "Détails supplémentaires"
  }
}
```

### Exemples d'erreurs courantes

#### Action non trouvée
```json
{
  "success": false,
  "error": "Action XYZ non trouvée"
}
```

#### Paramètre manquant
```json
{
  "success": false,
  "error": "Paramètre de recherche manquant",
  "code": "MISSING_PARAMETER"
}
```

#### Erreur IA
```json
{
  "success": false,
  "error": "Erreur lors de l'analyse IA",
  "code": "AI_PROCESSING_ERROR",
  "details": {
    "model": "summarizer",
    "reason": "Texte trop long"
  }
}
```

## 📊 Limites et Quotas

### Limites par endpoint

| Endpoint | Limite par minute | Limite par heure |
|----------|-------------------|------------------|
| GET /api/stocks/ | 60 | 1000 |
| POST /api/ai/analyze | 10 | 100 |
| POST /api/ai/compare | 5 | 50 |
| GET /api/news/ | 30 | 500 |

### Limites de données

- **Texte pour analyse IA** : 5000 caractères maximum
- **Pagination** : 100 éléments maximum par page
- **Recherche** : 50 résultats maximum
- **Historique** : 365 jours maximum

## 🔐 Authentification (Production)

### Obtenir un token
```bash
curl -X POST "http://localhost:5000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "votre_username",
    "password": "votre_password"
  }'
```

### Utiliser le token
```bash
curl "http://localhost:5000/api/stocks/" \
  -H "Authorization: Bearer <votre_token>"
```

### Renouveler le token
```bash
curl -X POST "http://localhost:5000/api/auth/refresh" \
  -H "Authorization: Bearer <votre_refresh_token>"
```

## 📝 Exemples d'Utilisation

### Script Python
```python
import requests

# Configuration
BASE_URL = "http://localhost:5000/api"

# Récupérer les hausses du marché
response = requests.get(f"{BASE_URL}/stocks/market/rises")
rises = response.json()

# Analyser une action
stock_response = requests.get(f"{BASE_URL}/stocks/BNA")
stock_data = stock_response.json()

# Analyse IA
ai_response = requests.post(f"{BASE_URL}/ai/analyze", json={
    "text": "Le marché est en hausse",
    "analysis_type": "sentiment"
})
sentiment = ai_response.json()

print(f"Sentiment: {sentiment['data']['sentiment']['sentiment']}")
```

### Script JavaScript
```javascript
// Configuration
const BASE_URL = 'http://localhost:5000/api';

// Fonction utilitaire
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  return response.json();
}

// Récupérer les actions
const stocks = await apiCall('/stocks/');

// Analyser du texte
const analysis = await apiCall('/ai/analyze', {
  method: 'POST',
  body: JSON.stringify({
    text: 'Texte à analyser',
    analysis_type: 'full'
  })
});

console.log('Analyse:', analysis.data);
```

## 🔄 Webhooks (Futur)

### Configuration des webhooks
```json
{
  "url": "https://votre-site.com/webhook",
  "events": ["stock_update", "news_update", "ai_analysis"],
  "secret": "votre_secret_webhook"
}
```

### Format des événements
```json
{
  "event": "stock_update",
  "data": {
    "ticker": "BNA",
    "old_price": 44.25,
    "new_price": 45.50
  },
  "timestamp": "2025-09-27T15:30:00Z"
}
```

Cette documentation couvre tous les endpoints disponibles dans Warren AI. Pour des questions spécifiques, consultez le code source ou contactez l'équipe de développement.

