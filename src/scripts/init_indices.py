"""
Script pour initialiser la collection MongoDB des indices boursiers
"""
import sys
import os
import logging
from datetime import datetime

# Ajouter le répertoire parent au chemin d'importation
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
from ..services.bvmt_service import BVMTService
from ..database.mongodb import init_mongodb, get_collection

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def init_indices_collection():
    """
    Initialiser la collection des indices en récupérant les données depuis l'API BVMT
    """
    try:
        # Charger les variables d'environnement
        load_dotenv()

        logger.info("Initialisation de la collection des indices...")

        # Initialiser le service BVMT
        bvmt_service = BVMTService()

        # Récupérer les données des indices
        indices_data = bvmt_service.get_indices()

        if not indices_data or 'indices' not in indices_data:
            logger.error("Impossible de récupérer les données des indices")
            return False

        # La sauvegarde est déjà effectuée dans la méthode get_indices()
        indices_count = len(indices_data.get('indices', []))
        logger.info(f"Données des indices récupérées avec succès: {indices_count} indices")

        # Vérifier que les données ont bien été sauvegardées
        indices_collection = get_collection('indexes')
        count = indices_collection.count_documents({})
        logger.info(f"Collection 'indexes' contient maintenant {count} documents")

        return True

    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation de la collection des indices: {e}")
        return False

if __name__ == "__main__":
    try:
        init_indices_collection()
        logger.info("Script d'initialisation terminé avec succès")
    except Exception as e:
        logger.error(f"Erreur lors de l'exécution du script: {e}")
        sys.exit(1)
