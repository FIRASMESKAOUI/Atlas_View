from pymongo import MongoClient
from datetime import datetime

# Constantes pour les indices
TUNINDEX_ISIN = "TN0009050014"
TUNINDEX20_ISIN = "TN0009050287"

# Se connecter directement à MongoDB Atlas
mongodb_uri = "mongodb+srv://libmanagerhelp_db_user:wLGkbKlQQLem8MFb@cluster0.kwnu9rt.mongodb.net/carthago_market?retryWrites=true&w=majority&appName=Cluster0"
print(f"Connexion à MongoDB Atlas...")

# Se connecter à MongoDB
client = MongoClient(mongodb_uri)
db = client["carthago_market"]
indexes_collection = db['indexes']
print("Connexion établie avec succès!")

# Vider la collection existante
indexes_collection.delete_many({})
print("Collection 'indexes' nettoyée")

# Données pour TUNINDEX
tunindex_data = {
    'name': 'TUNINDEX',
    'isin': TUNINDEX_ISIN,
    'value': 12417.07,
    'change': 5.73,
    'percent_change': 0.05,
    'seance': '26 sept. 2025',
    'time': '14:50:02',
    'last_updated': datetime.utcnow()
}

# Données pour TUNINDEX20
tunindex20_data = {
    'name': 'TUNINDEX20',
    'isin': TUNINDEX20_ISIN,
    'value': 5547.03,
    'change': 0.1,
    'percent_change': 0.01,
    'seance': '26 sept. 2025',
    'time': '14:50:02',
    'last_updated': datetime.utcnow()
}

# Insérer les données
result1 = indexes_collection.insert_one(tunindex_data)
result2 = indexes_collection.insert_one(tunindex20_data)

print(f"TUNINDEX inséré avec succès!")
print(f"TUNINDEX20 inséré avec succès!")

# Vérifier les données
count = indexes_collection.count_documents({})
print(f"Nombre de documents dans la collection indexes: {count}")

print("\nInitialisation terminée avec succès!")
