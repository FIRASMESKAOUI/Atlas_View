"""
Script pour initialiser la collection des indices TUNINDEX et TUNINDEX20 dans MongoDB
"""
import sys
import os
import logging
from datetime import datetime

# Ajouter le répertoire parent au chemin d'importation
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from dotenv import load_dotenv
from pymongo import MongoClient

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ISIN constants for indices
TUNINDEX_ISIN = "TN0009050014"
TUNINDEX20_ISIN = "TN0009050287"

def init_indices_collection():
    """
    Initialiser manuellement la collection des indices
    """
    try:
        # Charger les variables d'environnement
        load_dotenv()

        # Récupérer l'URI MongoDB depuis les variables d'environnement
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            logger.error("Variable d'environnement MONGODB_URI non définie")
            return False

        logger.info(f"Connexion à MongoDB avec URI: {mongodb_uri}")

        # Se connecter à MongoDB
        client = MongoClient(mongodb_uri)
        db_name = mongodb_uri.split('/')[-1].split('?')[0]
        db = client[db_name]
        indexes_collection = db['indexes']

        logger.info(f"Connexion à la base de données {db_name} établie")

        # Vider la collection existante
        indexes_collection.delete_many({})
        logger.info("Collection indexes vidée avec succès")

        # Données manuelles pour TUNINDEX
        tunindex_data = {
            'name': 'TUNINDEX',
            'isin': TUNINDEX_ISIN,
            'value': 12417.07,
            'change': 0.0,
            'percent_change': 0.0,
            'seance': '26 sept. 2025',
            'time': '14:50:02',
            'last_updated': datetime.utcnow()
        }

        # Données manuelles pour TUNINDEX20
        tunindex20_data = {
            'name': 'TUNINDEX20',
            'isin': TUNINDEX20_ISIN,
            'value': 5547.03,
            'change': 0.1,
            'percent_change': 0.0,
            'seance': '26 sept. 2025',
            'time': '14:50:02',
            'last_updated': datetime.utcnow()
        }

        # Insérer les documents
        result1 = indexes_collection.insert_one(tunindex_data)
        result2 = indexes_collection.insert_one(tunindex20_data)

        logger.info(f"TUNINDEX inséré avec ID: {result1.inserted_id}")
        logger.info(f"TUNINDEX20 inséré avec ID: {result2.inserted_id}")

        # Vérifier que les documents ont bien été insérés
        count = indexes_collection.count_documents({})
        logger.info(f"La collection indexes contient maintenant {count} documents")

        # Afficher les documents pour vérification
        for doc in indexes_collection.find():
            logger.info(f"Document: {doc}")

        return True

    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation des indices: {e}")
        return False

if __name__ == "__main__":
    success = init_indices_collection()
    if success:
        logger.info("Initialisation des indices terminée avec succès")
    else:
        logger.error("Échec de l'initialisation des indices")
        sys.exit(1)
