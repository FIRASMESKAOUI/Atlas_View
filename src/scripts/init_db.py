"""
Script pour initialiser la base de données avec les données BVMT
"""
import os
import sys
import logging
from dotenv import load_dotenv

# Ajouter le répertoire racine au PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Charger les variables d'environnement
load_dotenv()

from src.database.mongodb import mongo_client, db, init_mongodb
from src.services.data_service import DataService

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DummyApp:
    def __init__(self):
        self.logger = logger

def init_database():
    print("Initialisation de la base de données...")
    
    # Initialiser la connexion MongoDB
    dummy_app = DummyApp()
    init_mongodb(dummy_app)
    
    data_service = DataService()
    
    # Mise à jour des données des actions
    result = data_service.update_stocks_data()
    
    print(f"Nombre d'actions mises à jour : {result['updated_count']}")
    if result['errors']:
        print("\nErreurs rencontrées :")
        for error in result['errors']:
            print(f"- {error}")
    else:
        print("\nInitialisation réussie !")

if __name__ == "__main__":
    init_database()

if __name__ == "__main__":
    init_database()