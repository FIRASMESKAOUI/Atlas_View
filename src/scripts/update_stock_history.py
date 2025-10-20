import os
import requests
from datetime import datetime
from pymongo import MongoClient, UpdateOne
from dotenv import load_dotenv

load_dotenv()

MONGODB_URI = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/warren_ai')
DB_NAME = MONGODB_URI.split('/')[-1].split('?')[0] if '/' in MONGODB_URI else 'warren_ai'

client = MongoClient(MONGODB_URI)
db = client[DB_NAME]

# Récupérer la liste des actions (ISIN) depuis la base locale
stocks = list(db['stocks'].find({}, {'isin': 1, '_id': 0}))

for stock in stocks:
    isin = stock.get('isin')
    if not isin:
        continue
    try:
        url = f'https://www.bvmt.com.tn/rest_api/rest/intraday/{isin}'
        resp = requests.get(url, timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            intradays = data.get('intradays', [])
            ops = []
            for entry in intradays:
                # Upsert par ISIN + séance
                filter_ = {'isin': isin, 'seance': entry.get('seance')}
                update = {'$set': entry}
                ops.append(UpdateOne(filter_, update, upsert=True))
            if ops:
                db['stock_history'].bulk_write(ops)
                print(f"[OK] {isin}: {len(ops)} séances mises à jour.")
            else:
                print(f"[INFO] {isin}: aucune séance trouvée.")
        else:
            print(f"[ERR] {isin}: statut {resp.status_code}")
    except Exception as e:
        print(f"[ERR] {isin}: {e}")

print("Mise à jour terminée.")

