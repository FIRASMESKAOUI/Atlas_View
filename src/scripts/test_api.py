"""
Script pour tester les endpoints de l'API BVMT
"""
import os
import sys
import json
import requests
from pprint import pprint

def test_endpoint(url, description):
    print(f"\n=== {description} ===")
    print(f"URL: {url}")
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        print("\nStructure des données:")
        pprint(data, depth=2)
        print("\n")
    except Exception as e:
        print(f"Erreur: {str(e)}")

def main():
    base_url = "https://www.bvmt.com.tn/rest_api/rest"
    
    endpoints = [
        (f"{base_url}/status/all", "Statut de toutes les actions"),
        (f"{base_url}/market/qtys", "Liste des actions et quantités"),
        (f"{base_url}/market/hausses", "Actions en hausse"),
        (f"{base_url}/market/baisses", "Actions en baisse"),
        (f"{base_url}/market/volumes", "Actions par volume"),
        (f"{base_url}/market/groups/11,12,51,52,99", "Groupes d'actions"),
        (f"{base_url}/history/TN0009050014", "Historique TUNINDEX"),
        (f"{base_url}/market/TN0009050014", "Données TUNINDEX"),
        (f"{base_url}/market/TN0009050287", "Données TUNINDEX 20"),
        (f"{base_url}/intraday/TN0009050014", "Données intraday TUNINDEX")
    ]
    
    for url, description in endpoints:
        test_endpoint(url, description)

if __name__ == "__main__":
    main()