"""
Routes API pour les graphiques de données (dataCharts)
"""
from flask import Blueprint, jsonify, request
import requests
import logging
import json
import time

logger = logging.getLogger(__name__)

dataCharts_bp = Blueprint('dataCharts', __name__)

@dataCharts_bp.route('/stocks', methods=['GET'])
def get_stocks_list():
    """Récupère la liste des actions disponibles depuis l'API data"""
    try:
        response = requests.get('https://data.irbe7.com/api/data', timeout=30)
        if response.ok:
            data = response.json()
            stocks = []

            # Extraire les actions depuis la réponse
            for item in data:
                if item.get('referentiel') and item['referentiel'].get('stockName') and item['referentiel'].get('ticker'):
                    ref = item['referentiel']
                    stocks.append({
                        'symbol': ref.get('ticker'),
                        'stockName': ref.get('stockName'),  # Utiliser le stockName pour l'API history
                        'name': ref.get('stockName'),
                        'arabName': ref.get('arabName'),
                        'isin': ref.get('isin'),
                        'lastPrice': item.get('last'),
                        'change': item.get('change'),
                        'volume': item.get('volume'),
                        'close': item.get('close')
                    })

            return jsonify({
                'success': True,
                'data': stocks
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Erreur lors de la récupération des données. Status: {response.status_code}'
            }), 500
    except Exception as e:
        logger.error(f"Erreur dans get_stocks_list: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dataCharts_bp.route('/history/<symbol>', methods=['GET'])
def get_chart_history(symbol):
    """Récupère les données historiques pour un symbole en utilisant le stockName"""
    try:
        # D'abord récupérer la liste des actions pour trouver le stockName
        response = requests.get('https://data.irbe7.com/api/data', timeout=30)
        if not response.ok:
            return jsonify({
                'success': False,
                'error': f'Erreur lors de la récupération de la liste. Status: {response.status_code}'
            }), 500

        data = response.json()

        # Trouver le stockName correspondant au ticker
        stock_name = None
        for item in data:
            if item.get('referentiel') and item['referentiel'].get('ticker') == symbol:
                stock_name = item['referentiel'].get('stockName')
                break

        if not stock_name:
            return jsonify({
                'success': False,
                'error': f'Aucun stockName trouvé pour le ticker {symbol}'
            }), 404

        logger.info(f"Récupération des données historiques pour {symbol} -> {stock_name}")

        # CORRECTION: Utiliser des timestamps dynamiques au lieu de valeurs fixes
        import time
        from datetime import datetime, timedelta

        # Date de fin: aujourd'hui
        to_timestamp = int(time.time())

        # Date de début: 5 ans en arrière pour avoir un historique complet
        from_date = datetime.now() - timedelta(days=5*365)
        from_timestamp = int(from_date.timestamp())

        # Utiliser le stockName dans l'URL de l'API history
        history_url = f'https://data.irbe7.com/api/data/history'
        params = {
            'symbol': stock_name,
            'resolution': '1D',
            'from': str(from_timestamp),
            'to': str(to_timestamp),
            'countback': '2'
        }

        logger.info(f"Requête historique pour {stock_name} de {from_date.strftime('%Y-%m-%d')} à aujourd'hui")

        history_response = requests.get(history_url, params=params, timeout=30)

        if history_response.ok:
            history_data = history_response.json()
            logger.info(f"Données historiques reçues pour {stock_name}: {len(history_data.get('t', []))} points")

            # Vérifier que les données sont valides
            if history_data.get('s') == 'ok' and history_data.get('t') and history_data.get('c'):
                return jsonify({
                    'success': True,
                    'data': history_data,
                    'stockName': stock_name,
                    'ticker': symbol
                })
            else:
                return jsonify({
                    'success': False,
                    'error': f'Aucune donnée historique pour {stock_name}. Statut: {history_data.get("s", "unknown")}'
                }), 404
        else:
            return jsonify({
                'success': False,
                'error': f'Erreur API history pour {stock_name}. Status: {history_response.status_code}'
            }), 500

    except Exception as e:
        logger.error(f"Erreur dans get_chart_history pour {symbol}: {e}")
        return jsonify({
            'success': False,
            'error': f'Erreur serveur: {str(e)}'
        }), 500
