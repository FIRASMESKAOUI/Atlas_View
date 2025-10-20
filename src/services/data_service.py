"""
Service pour la gestion des données en base MongoDB
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from .bvmt_service import BVMTService
import logging

logger = logging.getLogger(__name__)

class DataService:
    """
    Service pour gérer les données en mémoire depuis l'API BVMT
    """
    def __init__(self):
        self.bvmt_service = BVMTService()

    def get_all_stocks(self) -> list:
        """
        Récupère toutes les actions depuis l'API BVMT
        """
        quantities_data = self.bvmt_service.get_market_quantities()
        if not quantities_data or 'markets' not in quantities_data:
            return []
        return [self.bvmt_service.normalize_stock_data(stock) for stock in quantities_data['markets']]

    def get_stock_by_ticker(self, ticker: str) -> Optional[dict]:
        """
        Récupère une action par son ticker depuis l'API BVMT
        """
        for stock in self.get_all_stocks():
            if stock.get('ticker', '').upper() == ticker.upper():
                return stock
        return None

    def get_stock_by_isin(self, isin: str) -> Optional[dict]:
        """
        Récupère une action par son ISIN depuis l'API BVMT
        """
        for stock in self.get_all_stocks():
            if stock.get('isin', '') == isin:
                return stock
        return None

    def search_stocks(self, query: str, limit: int = 20) -> list:
        """
        Recherche des actions par nom ou ticker
        """
        query = query.lower()
        results = [s for s in self.get_all_stocks() if query in s.get('ticker', '').lower() or query in s.get('stock_name', '').lower() or query in s.get('arab_name', '').lower()]
        return results[:limit]

    def get_market_summary(self) -> dict:
        """
        Récupère un résumé du marché depuis l'API BVMT
        """
        try:
            all_stocks = self.get_all_stocks()
            top_gainers = sorted([s for s in all_stocks if s.get('change', 0) > 0], key=lambda x: x.get('change', 0), reverse=True)[:10]
            top_losers = sorted([s for s in all_stocks if s.get('change', 0) < 0], key=lambda x: x.get('change', 0))[:10]
            most_active = sorted([s for s in all_stocks if s.get('volume', 0) > 0], key=lambda x: x.get('volume', 0), reverse=True)[:10]
            total_stocks = len(all_stocks)
            gainers_count = len(top_gainers)
            losers_count = len(top_losers)
            unchanged_count = total_stocks - (gainers_count + losers_count)
            return {
                'timestamp': datetime.utcnow(),
                'statistics': {
                    'total_stocks': total_stocks,
                    'gainers': gainers_count,
                    'losers': losers_count,
                    'unchanged': unchanged_count
                },
                'top_gainers': top_gainers,
                'top_losers': top_losers,
                'most_active': most_active
            }
        except Exception as e:
            logger.error(f"Erreur lors de la récupération du résumé de marché: {e}")
            return {}

    def get_stock_history(self, isin: str, days: int = 30) -> dict:
        """
        Récupère l'historique d'une action depuis l'API BVMT
        """
        try:
            history_data = self.bvmt_service.get_stock_history(isin)
            return history_data or {}
        except Exception as e:
            logger.error(f"Erreur lors de la récupération de l'historique pour {isin}: {e}")
            return {}
