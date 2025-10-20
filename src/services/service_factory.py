"""
Helper functions to initialize services
"""
import logging
import sys
import os

# Ajout du répertoire parent au path Python
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

logger = logging.getLogger(__name__)

def get_ai_service():
    """
    Get an instance of the AIService class
    """
    try:
        from src.services.ai_service import AIService
        return AIService()
    except ImportError as e:
        logger.error(f"Erreur lors de l'importation de AIService: {e}")
        raise ImportError(f"Le module AIService est introuvable: {e}")

def get_data_service():
    """
    Get an instance of the DataService class
    """
    try:
        from src.services.data_service import DataService
        return DataService()
    except ImportError as e:
        logger.error(f"Erreur lors de l'importation de DataService: {e}")
        raise ImportError(f"Le module DataService est introuvable: {e}")

def get_news_service():
    """
    Get an instance of the NewsService class
    """
    try:
        from src.services.news_service import NewsService
        return NewsService()
    except ImportError as e:
        logger.error(f"Erreur lors de l'importation de NewsService: {e}")
        raise ImportError(f"Le module NewsService est introuvable: {e}")
