"""
Service pour récupérer les données de l'API BVMT
"""
import requests
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging


logger = logging.getLogger(__name__)

# ISIN constants for indices
TUNINDEX_ISIN = "TN0009050014"
TUNINDEX20_ISIN = "TN0009050287"

class BVMTService:
    """
    Service pour interagir avec l'API BVMT
    """
    
    def __init__(self):
        self.base_url = os.getenv('BVMT_BASE_URL', 'https://www.bvmt.com.tn/rest_api/rest')
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Carthago-Market/1.0',
            'Accept': 'application/json'
        })
        # Cache pour les indices avec un timestamp d'expiration
        self._indices_cache = None
        self._indices_cache_timestamp = None
        self._indices_cache_ttl = 5 * 60  # 5 minutes en secondes
        # Référence à la collection MongoDB pour les indices
        

    def _make_request(self, endpoint: str) -> Optional[Dict]:
        """
        Effectue une requête vers l'API BVMT
        """
        try:
            url = f"{self.base_url}/{endpoint}"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur lors de la requête vers {endpoint}: {e}")
            return None
        except ValueError as e:
            logger.error(f"Erreur de parsing JSON pour {endpoint}: {e}")
            return None
    
    def get_all_stocks_status(self) -> Optional[Dict]:
        """
        Récupère le statut de toutes les actions
        """
        return self._make_request('status/all')
    
    def get_market_quantities(self) -> Optional[Dict]:
        """
        Récupère les quantités du marché depuis l'endpoint groups
        """
        return self.get_market_groups()

    def get_market_qtys_only(self) -> Optional[Dict]:
        """
        Récupère uniquement les données de market/qtys (sans groups)
        """
        return self._make_request('market/qtys')

    def get_market_rises(self) -> Optional[Dict]:
        """
        Récupère les hausses du marché
        """
        return self._make_request('market/hausses')
    
    def get_market_falls(self) -> Optional[Dict]:
        """
        Récupère les baisses du marché
        """
        return self._make_request('market/baisses')
    
    def get_market_volumes(self) -> Optional[Dict]:
        """
        Récupère les volumes du marché
        """
        return self._make_request('market/volumes')
    
    def get_market_groups(self, groups: str = "11,12,51,52,99") -> Optional[Dict]:
        """
        Récupère les données par groupes de marché
        """
        data = self._make_request(f'market/groups/{groups}')
        if data and 'markets' in data:
            return data
        return data

    def get_stock_history(self, isin: str) -> Optional[Dict]:
        """
        Récupère l'historique d'une action par ISIN
        """
        return self._make_request(f'history/{isin}')

    def get_stock_market_data(self, isin: str) -> Optional[Dict]:
        """
        Récupère les données de marché d'une action par ISIN
        """
        return self._make_request(f'market/{isin}')
    
    def get_stock_intraday(self, isin: str) -> Optional[Dict]:
        """
        Récupère les données intraday d'une action par ISIN
        """
        return self._make_request(f'intraday/{isin}')
    
    def normalize_stock_data(self, stock_data: Dict) -> Dict:
        """
        Normalise les données d'une action pour MongoDB
        """
        if not stock_data:
            return {}
        
        # Extraire les informations du référentiel
        referentiel = stock_data.get('referentiel', {})
        
        normalized = {
            'isin': stock_data.get('isin'),
            'ticker': referentiel.get('ticker'),
            'stock_name': referentiel.get('stockName'),
            'arab_name': referentiel.get('arabName'),
            'val_group': referentiel.get('valGroup'),
            'last_price': stock_data.get('last'),
            'close_price': stock_data.get('close'),
            'open_price': stock_data.get('open'),
            'high_price': stock_data.get('high'),
            'low_price': stock_data.get('low'),
            'volume': stock_data.get('volume'),
            'change': stock_data.get('change'),
            'change_percent': stock_data.get('ychange'),
            'market_cap': stock_data.get('caps'),
            'seance': stock_data.get('seance'),
            'arab_seance': stock_data.get('arabSeance'),
            'status': stock_data.get('status'),
            'time': stock_data.get('time'),
            'last_updated': datetime.utcnow(),
            'trading_status': stock_data.get('trading'),
            'min_limit': stock_data.get('min'),
            'max_limit': stock_data.get('max')
        }
        
        return {k: v for k, v in normalized.items() if v is not None}
    
    def get_market_summary(self) -> Dict:
        """
        Récupère un résumé complet du marché
        """
        summary = {
            'timestamp': datetime.utcnow(),
            'rises': [],
            'falls': [],
            'volumes': [],
            'quantities': []
        }
        
        # Récupérer les hausses
        rises_data = self.get_market_rises()
        if rises_data and 'markets' in rises_data:
            summary['rises'] = [self.normalize_stock_data(stock) for stock in rises_data['markets'][:10]]
        
        # Récupérer les baisses
        falls_data = self.get_market_falls()
        if falls_data and 'markets' in falls_data:
            summary['falls'] = [self.normalize_stock_data(stock) for stock in falls_data['markets'][:10]]
        
        # Récupérer les volumes
        volumes_data = self.get_market_volumes()
        if volumes_data and 'markets' in volumes_data:
            summary['volumes'] = [self.normalize_stock_data(stock) for stock in volumes_data['markets'][:10]]
        
        # Récupérer les quantités
        quantities_data = self.get_market_quantities()
        if quantities_data and 'markets' in quantities_data:
            summary['quantities'] = [self.normalize_stock_data(stock) for stock in quantities_data['markets'][:10]]
        
        return summary
    
    def search_stock_by_ticker(self, ticker: str) -> Optional[Dict]:
        """
        Recherche une action par son ticker
        """
        # Récupérer toutes les données de quantités pour chercher le ticker
        quantities_data = self.get_market_quantities()
        if not quantities_data or 'markets' not in quantities_data:
            return None
        
        for stock in quantities_data['markets']:
            referentiel = stock.get('referentiel', {})
            if referentiel.get('ticker', '').upper() == ticker.upper():
                return self.normalize_stock_data(stock)
        
        return None
    
    def get_stock_detailed_info(self, isin: str) -> Dict:
        """
        Récupère toutes les informations détaillées d'une action
        """
        result = {
            'isin': isin,
            'market_data': None,
            'history': None,
            'intraday': None,
            'timestamp': datetime.utcnow()
        }
        
        # Données de marché
        market_data = self.get_stock_market_data(isin)
        if market_data:
            result['market_data'] = self.normalize_stock_data(market_data)
        
        # Historique
        history_data = self.get_stock_history(isin)
        if history_data:
            result['history'] = history_data
        
        # Données intraday
        intraday_data = self.get_stock_intraday(isin)
        if intraday_data:
            result['intraday'] = intraday_data
        
        return result

    def get_indices(self) -> Optional[Dict]:
        """
        Récupère les indices TUNINDEX et TUNINDEX20
        """
        current_time = datetime.utcnow()

        # Vérifier si le cache est valide
        if (self._indices_cache is not None and self._indices_cache_timestamp is not None and
            current_time - self._indices_cache_timestamp < timedelta(seconds=self._indices_cache_ttl)):
            logger.debug("Récupération des indices depuis le cache")
            return self._indices_cache

        logger.debug("Récupération des indices depuis l'API BVMT")

        # Récupérer les données TUNINDEX (market data)
        tunindex_data = self._make_request(f'market/{TUNINDEX_ISIN}')

        # Récupérer les données TUNINDEX20 (market data)
        tunindex20_data = self._make_request(f'market/{TUNINDEX20_ISIN}')

        # Récupérer les historiques (optionnel, pour enrichir les données)
        tunindex_history = self._make_request(f'history/{TUNINDEX_ISIN}')
        tunindex20_history = self._make_request(f'history/{TUNINDEX20_ISIN}')

        # Formater les données pour notre API
        indices_data = {
            'indices': [],
            'timestamp': datetime.utcnow().isoformat()
        }

        # Ajouter TUNINDEX s'il existe
        if tunindex_data and 'market' in tunindex_data:
            market_data = tunindex_data['market']
            tunindex = {
                'name': 'TUNINDEX',
                'isin': TUNINDEX_ISIN,
                'value': market_data.get('last'),
                'change': market_data.get('change'),
                'percent_change': market_data.get('ychange'),
                'seance': market_data.get('seance'),
                'time': market_data.get('time'),
                'referentiel': market_data.get('referentiel')
            }
            indices_data['indices'].append(tunindex)

        # Ajouter TUNINDEX20 s'il existe
        if tunindex20_data and 'market' in tunindex20_data:
            market_data = tunindex20_data['market']
            tunindex20 = {
                'name': 'TUNINDEX20',
                'isin': TUNINDEX20_ISIN,
                'value': market_data.get('last'),
                'change': market_data.get('change'),
                'percent_change': market_data.get('ychange'),
                'seance': market_data.get('seance'),
                'time': market_data.get('time'),
                'referentiel': market_data.get('referentiel')
            }
            indices_data['indices'].append(tunindex20)

        # Enrichir avec l'historique si disponible
        if tunindex_history and 'indexHistorys' in tunindex_history:
            for index in indices_data['indices']:
                if index['isin'] == TUNINDEX_ISIN:
                    index['history'] = tunindex_history['indexHistorys'][:30]  # Limiter à 30 entrées
                    break

        if tunindex20_history and 'indexHistorys' in tunindex20_history:
            for index in indices_data['indices']:
                if index['isin'] == TUNINDEX20_ISIN:
                    index['history'] = tunindex20_history['indexHistorys'][:30]  # Limiter à 30 entrées
                    break

        if indices_data['indices']:
            # Mise à jour du cache
            self._indices_cache = indices_data
            self._indices_cache_timestamp = current_time

            return indices_data

        # En cas d'échec, retourner le cache s'il existe
        if self._indices_cache:
            logger.debug("Récupération des indices depuis le cache (fallback)")
            return self._indices_cache

        # Si toujours pas de données, retourner un dictionnaire vide
        logger.warning("Impossible de récupérer les indices")
        return {
            'indices': [],
            'timestamp': datetime.utcnow().isoformat()
        }

    def get_index_history(self, isin: str) -> Optional[Dict]:
        """
        Récupère l'historique d'un indice par son ISIN
        """
        return self._make_request(f'history/{isin}')

    def get_index_intraday(self, isin: str) -> Optional[Dict]:
        """
        Récupère les données intraday d'un indice par son ISIN
        """
        return self._make_request(f'intraday/{isin}')

    def get_order_book(self, isin: str) -> Optional[Dict]:
        """
        Récupère le carnet d'ordre pour une action donnée via son ISIN
        """
        endpoint = f"limits/{isin}"
        return self._make_request(endpoint)
