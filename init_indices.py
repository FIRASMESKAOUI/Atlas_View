from pymongo import MongoClient
from datetime import datetime
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

# Constantes pour les indices
TUNINDEX_ISIN = "TN0009050014"
TUNINDEX20_ISIN = "TN0009050287"

# Récupérer l'URI MongoDB
mongodb_uri = os.getenv('MONGODB_URI')
print(f"Connexion à MongoDB: {mongodb_uri}")

# Se connecter à MongoDB
client = MongoClient(mongodb_uri)
db_name = mongodb_uri.split('/')[-1].split('?')[0]
db = client[db_name]
indexes_collection = db['indexes']

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

print(f"TUNINDEX inséré avec ID: {result1.inserted_id}")
print(f"TUNINDEX20 inséré avec ID: {result2.inserted_id}")

# Vérifier les données
count = indexes_collection.count_documents({})
print(f"Nombre de documents dans la collection indexes: {count}")

# Afficher les données
print("\nDocuments dans la collection 'indexes':")
for doc in indexes_collection.find():
    # Convertir ObjectId en string pour l'affichage
    doc_id = str(doc.get('_id'))
    print(f"ID: {doc_id}, Nom: {doc.get('name')}, Valeur: {doc.get('value')}")

print("\nInitialisation terminée avec succès!")
