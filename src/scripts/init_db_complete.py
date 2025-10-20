"""
Script pour initialiser la base de données avec les données BVMT complètes
"""
import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv

# Ajouter le répertoire racine au PYTHONPATH
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Charger les variables d'environnement
load_dotenv()

from src.database.mongodb import mongo_client, db, init_mongodb
from src.services.data_service import DataService
from src.services.bvmt_service import BVMTService

# Configuration du logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DummyApp:
    def __init__(self):
        self.logger = logger

def init_database():
    print("=== Initialisation de la base de données Warren AI ===\n")
    
    # Initialiser la connexion MongoDB
    print("1. Connexion à MongoDB...")
    dummy_app = DummyApp()
    init_mongodb(dummy_app)
    
    data_service = DataService()
    bvmt_service = BVMTService()
    
    # 1. Récupérer et stocker toutes les actions
    print("\n2. Récupération des données de toutes les actions...")
    stocks_result = data_service.update_stocks_data()
    print(f"   - {stocks_result['updated_count']} actions mises à jour")
    if stocks_result['errors']:
        print("   - Erreurs rencontrées:")
        for error in stocks_result['errors']:
            print(f"     * {error}")
    
    # 2. Récupérer les données TUNINDEX
    print("\n3. Récupération des données TUNINDEX...")
    try:
        tunindex_data = bvmt_service.get_stock_market_data('TN0009050014')
        if tunindex_data:
            data_service.stocks_collection.update_one(
                {'isin': 'TN0009050014'},
                {'$set': bvmt_service.normalize_stock_data(tunindex_data.get('market', {}))},
                upsert=True
            )
            print("   - Données TUNINDEX mises à jour avec succès")
    except Exception as e:
        print(f"   - Erreur lors de la mise à jour TUNINDEX: {e}")
    
    # 3. Récupérer les données TUNINDEX20
    print("\n4. Récupération des données TUNINDEX20...")
    try:
        tunindex20_data = bvmt_service.get_stock_market_data('TN0009050287')
        if tunindex20_data:
            data_service.stocks_collection.update_one(
                {'isin': 'TN0009050287'},
                {'$set': bvmt_service.normalize_stock_data(tunindex20_data.get('market', {}))},
                upsert=True
            )
            print("   - Données TUNINDEX20 mises à jour avec succès")
    except Exception as e:
        print(f"   - Erreur lors de la mise à jour TUNINDEX20: {e}")
    
    # 4. Vérifier le nombre total d'actions en base
    total_stocks = data_service.stocks_collection.count_documents({})
    print(f"\n5. Vérification finale:")
    print(f"   - Nombre total d'actions en base: {total_stocks}")
    print(f"   - Date de dernière mise à jour: {datetime.utcnow()}")
    
    print("\n=== Initialisation terminée ===")

if __name__ == "__main__":
    init_database()