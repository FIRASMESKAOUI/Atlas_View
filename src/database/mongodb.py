"""
Module de connexion MongoDB Atlas (désactivé)
"""
# Ce module est maintenant désactivé car l'application ne dépend plus de MongoDB.
# Toutes les fonctions sont des stubs pour éviter les erreurs d'import.
import logging
logger = logging.getLogger(__name__)

def init_mongodb(app):
    app.logger.info("MongoDB désactivé : aucune connexion établie.")
    return False

def get_collection(collection_name: str):
    logger.error("MongoDB désactivé : aucune collection disponible.")
    raise RuntimeError("MongoDB désactivé : aucune collection disponible.")

def get_database():
    logger.error("MongoDB désactivé : aucune base disponible.")
    return None

def close_connection():
    logger.info("MongoDB désactivé : aucune connexion à fermer.")
    return None
