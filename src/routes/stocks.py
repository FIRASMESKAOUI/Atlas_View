"""
Routes API pour les actions (stocks)
"""
from flask import Blueprint, jsonify, request
import logging

logger = logging.getLogger(__name__)

stocks_bp = Blueprint('stocks', __name__)

# Initialize services lazily to avoid circular imports
def get_data_service():
    from ..services.data_service import DataService
    return DataService()

def get_bvmt_service():
    from ..services.bvmt_service import BVMTService
    return BVMTService()

@stocks_bp.route('/', methods=['GET'])
def get_stocks():
    """
    Récupère la liste des actions avec pagination
    """
    try:
        data_service = get_data_service()
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)  # Max 100 par page
        search = request.args.get('search', '')

        if search:
            stocks = data_service.search_stocks(search, limit)
            total = len(stocks)
        else:
            all_stocks = data_service.get_all_stocks()
            total = len(all_stocks)
            skip = (page - 1) * limit
            stocks = all_stocks[skip:skip+limit]

        return jsonify({
            'success': True,
            'data': stocks,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total
            }
        })
    except Exception as e:
        logger.error(f"Erreur dans get_stocks: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@stocks_bp.route('/<ticker>', methods=['GET'])
def get_stock_by_ticker(ticker):
    """
    Récupère les détails d'une action par ticker
    """
    try:
        data_service = get_data_service()
        stock = data_service.get_stock_by_ticker(ticker)

        if not stock:
            return jsonify({
                'success': False,
                'error': f'Action {ticker} non trouvée'
            }), 404

        # Convertir ObjectId en string
        if '_id' in stock:
            stock['_id'] = str(stock['_id'])

        # Récupérer des données supplémentaires si demandées
        include_history = request.args.get('include_history', 'true').lower() == 'true'
        include_intraday = request.args.get('include_intraday', 'true').lower() == 'true'

        result = {
            'success': True,
            'data': stock
        }

        if include_history and stock.get('isin'):
            history = data_service.get_stock_history(stock['isin'])
            result['data']['history'] = history

        if include_intraday and stock.get('isin'):
            bvmt_service = get_bvmt_service()
            intraday = bvmt_service.get_stock_intraday(stock['isin'])
            result['data']['intraday'] = intraday

        return jsonify(result)

    except Exception as e:
        logger.error(f"Erreur dans get_stock_by_ticker: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/market-summary', methods=['GET'])
def get_market_summary():
    """
    Récupère un résumé du marché
    """
    try:
        data_service = get_data_service()
        summary = data_service.get_market_summary()

        # Convertir ObjectId en string pour tous les stocks
        for category in ['top_gainers', 'top_losers', 'most_active']:
            if category in summary:
                for stock in summary[category]:
                    if '_id' in stock:
                        stock['_id'] = str(stock['_id'])

        return jsonify({
            'success': True,
            'data': summary
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_market_summary: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/update', methods=['POST'])
def update_stocks_data():
    """
    Cette route ne fait rien car les données sont récupérées en temps réel depuis l'API BVMT.
    """
    return jsonify({
        'success': True,
        'message': "Les données sont toujours à jour via l'API BVMT. Aucune mise à jour manuelle nécessaire."
    })

@stocks_bp.route('/search', methods=['GET'])
def search_stocks():
    """
    Recherche des actions
    """
    try:
        data_service = get_data_service()
        query = request.args.get('q', '')
        limit = min(int(request.args.get('limit', 10)), 50)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Paramètre de recherche manquant'
            }), 400
        
        stocks = data_service.search_stocks(query, limit)
        
        # Convertir ObjectId en string
        for stock in stocks:
            if '_id' in stock:
                stock['_id'] = str(stock['_id'])
        
        return jsonify({
            'success': True,
            'data': stocks,
            'query': query
        })
        
    except Exception as e:
        logger.error(f"Erreur dans search_stocks: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/market/rises', methods=['GET'])
def get_market_rises():
    """
    Récupère les hausses du marché depuis l'API BVMT
    """
    try:
        bvmt_service = get_bvmt_service()
        rises_data = bvmt_service.get_market_rises()
        
        if not rises_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données de hausses'
            }), 500
        
        # Normaliser les données
        normalized_data = []
        if 'markets' in rises_data:
            for stock in rises_data['markets']:
                normalized_stock = bvmt_service.normalize_stock_data(stock)
                if normalized_stock:
                    normalized_data.append(normalized_stock)
        
        return jsonify({
            'success': True,
            'data': normalized_data
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_market_rises: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/market/falls', methods=['GET'])
def get_market_falls():
    """
    Récupère les baisses du marché depuis l'API BVMT
    """
    try:
        bvmt_service = get_bvmt_service()
        falls_data = bvmt_service.get_market_falls()
        
        if not falls_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données de baisses'
            }), 500
        
        # Normaliser les données
        normalized_data = []
        if 'markets' in falls_data:
            for stock in falls_data['markets']:
                normalized_stock = bvmt_service.normalize_stock_data(stock)
                if normalized_stock:
                    normalized_data.append(normalized_stock)
        
        return jsonify({
            'success': True,
            'data': normalized_data
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_market_falls: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/market/volumes', methods=['GET'])
def get_market_volumes():
    """
    Récupère les volumes du marché depuis l'API BVMT
    """
    try:
        bvmt_service = get_bvmt_service()
        volumes_data = bvmt_service.get_market_volumes()
        
        if not volumes_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données de volumes'
            }), 500
        
        # Normaliser les données
        normalized_data = []
        if 'markets' in volumes_data:
            for stock in volumes_data['markets']:
                normalized_stock = bvmt_service.normalize_stock_data(stock)
                if normalized_stock:
                    normalized_data.append(normalized_stock)
        
        return jsonify({
            'success': True,
            'data': normalized_data
        })
        
    except Exception as e:
        logger.error(f"Erreur dans get_market_volumes: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@stocks_bp.route('/orderbook/<isin>', methods=['GET'])
def get_order_book(isin):
    """
    Retourne le carnet d'ordre pour une action donnée (ISIN)
    """
    try:
        bvmt_service = get_bvmt_service()
        order_book = bvmt_service.get_order_book(isin)
        if order_book:
            return jsonify({'success': True, 'data': order_book})
        else:
            return jsonify({'success': False, 'error': 'Aucun carnet d\'ordre trouvé'}), 404
    except Exception as e:
        logger.error(f"Erreur lors de la récupération du carnet d'ordre pour {isin}: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@stocks_bp.route('/history/<isin>', methods=['GET'])
def get_stock_history(isin):
    """
    Retourne l'historique des séances pour une action donnée (par ISIN) depuis l'API BVMT
    """
    try:
        data_service = get_data_service()
        history = data_service.get_stock_history(isin)
        # Formatage des champs utiles pour le graphique
        if 'history' in history:
            for h in history['history']:
                h['date'] = h.get('seance')
                h['last'] = h.get('last')
            return jsonify({'success': True, 'data': history['history']})
        return jsonify({'success': True, 'data': history})
    except Exception as e:
        logger.error(f"Erreur dans get_stock_history: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@stocks_bp.route('/intraday/<isin>', methods=['GET'])
def proxy_intraday_bvmt(isin):
    """
    Proxy pour contourner le CORS et récupérer les données intraday BVMT pour un ISIN
    """
    import requests
    try:
        url = f'https://www.bvmt.com.tn/rest_api/rest/intraday/{isin}'
        resp = requests.get(url, timeout=10)
        return (resp.content, resp.status_code, {'Content-Type': resp.headers.get('Content-Type', 'application/json')})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@stocks_bp.route('/marketwatch', methods=['GET'])
def get_market_watch():
    """
    Récupère la liste complète des actions depuis l'API BVMT (pour la liste déroulante)
    """
    try:
        data_service = get_data_service()
        stocks = data_service.get_all_stocks()
        # Tri alphabétique par ticker puis nom (insensible à la casse)
        stocks.sort(key=lambda stock: (
            (stock.get('ticker') or '').upper(),
            (stock.get('stock_name') or '').upper()
        ))
        actions = []
        for stock in stocks:
            prix = (
                stock.get('last_price') or
                stock.get('close_price') or
                stock.get('last') or
                stock.get('close') or
                stock.get('price') or
                stock.get('prix') or
                '-'
            )
            actions.append({
                'ticker': stock.get('ticker', '-'),
                'nom': stock.get('stock_name', '-'),
                'prix': prix,
                'variation': stock.get('change', '-'),
                'volume': stock.get('volume', '-'),
                'isin': stock.get('isin', '-')
            })
        return jsonify({'success': True, 'data': actions})
    except Exception as e:
        logger.error(f"Erreur dans get_market_watch: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
