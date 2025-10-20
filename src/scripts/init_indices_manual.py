"""
Script pour initialiser manuellement la collection d'indices
Ce script récupère directement les données TUNINDEX et TUNINDEX20 et les insère dans MongoDB
"""
import os
import sys
from datetime import datetime
import logging

# Ajouter le dossier parent au chemin d'importation
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from dotenv import load_dotenv
from pymongo import MongoClient
import requests

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def init_indices_manually():
    """
    Initialisation manuelle de la collection indexes avec les données TUNINDEX et TUNINDEX20
    """
    try:
        # Charger les variables d'environnement
        load_dotenv()

        # Récupérer l'URI MongoDB depuis les variables d'environnement
        mongodb_uri = os.getenv('MONGODB_URI')
        if not mongodb_uri:
            logger.error("Variable d'environnement MONGODB_URI non définie")
            return False

        # Se connecter à MongoDB
        client = MongoClient(mongodb_uri)
        db_name = mongodb_uri.split('/')[-1].split('?')[0]
        db = client[db_name]
        indexes_collection = db['indexes']

        logger.info(f"Connexion à la base de données {db_name} établie")

        # Récupérer les données des indices depuis l'API BVMT
        bvmt_base_url = os.getenv('BVMT_BASE_URL', 'https://www.bvmt.com.tn/rest_api/rest')
        indices_url = f"{bvmt_base_url}/indices/all"

        logger.info(f"Récupération des indices depuis {indices_url}")

        response = requests.get(indices_url, timeout=10)
        response.raise_for_status()
        indices_data = response.json()

        if not indices_data or 'indices' not in indices_data:
            logger.error("Aucune donnée d'indice trouvée dans la réponse API")
            return False

        # Nettoyage de la collection existante
        indexes_collection.delete_many({})
        logger.info("Collection indexes vidée")

        # Création manuelle des documents pour TUNINDEX et TUNINDEX20
        now = datetime.utcnow()
        inserted_indices = []

        for index in indices_data['indices']:
            index_name = index.get('name')
            if not index_name:
                continue

            normalized_index = {
                'name': index_name,
                'value': float(index.get('value', 0)),
                'change': float(index.get('change', 0)),
                'percent_change': float(index.get('pourcentage', 0)),
                'last_updated': now
            }

            # Insérer l'indice
            indexes_collection.insert_one(normalized_index)
            inserted_indices.append(index_name)
            logger.info(f"Indice {index_name} inséré avec succès")

        logger.info(f"Indices insérés: {', '.join(inserted_indices)}")
        logger.info(f"Total d'indices insérés: {len(inserted_indices)}")

        # Vérification finale
        count = indexes_collection.count_documents({})
        logger.info(f"La collection indexes contient maintenant {count} documents")

        # Afficher un exemple de document TUNINDEX
        tunindex = indexes_collection.find_one({'name': 'TUNINDEX'})
        if tunindex:
            tunindex['_id'] = str(tunindex['_id'])  # Convertir ObjectId en string
            logger.info(f"Document TUNINDEX: {tunindex}")
        else:
            logger.warning("Aucun document TUNINDEX trouvé")

        return True

    except Exception as e:
        logger.error(f"Erreur lors de l'initialisation manuelle des indices: {e}")
        return False

if __name__ == "__main__":
    success = init_indices_manually()
    if success:
        logger.info("Initialisation manuelle des indices terminée avec succès")
        sys.exit(0)
    else:
        logger.error("Échec de l'initialisation manuelle des indices")
        sys.exit(1)
