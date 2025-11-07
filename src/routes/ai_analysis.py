"""
Routes API pour l'analyse IA des actions
"""
from flask import Blueprint, jsonify, request
import requests
import logging

from ..services.ai_analysis import AIStockAnalyzer

logger = logging.getLogger(__name__)

ai_analysis_bp = Blueprint('ai_analysis', __name__)

# Initialiser l'analyseur IA
analyzer = AIStockAnalyzer()

@ai_analysis_bp.route('/analyze/<symbol>', methods=['POST'])
def analyze_stock(symbol):
    """
    Analyse une action avec l'IA - Les indicateurs sont calculés côté JS

    Args:
        symbol: Le ticker de l'action (ex: BNA, STB, etc.)
        Body JSON: {
            "indicators": {"rsi": float, "macd": float, "macd_signal": float, "sma_20": float, "sma_50": float, "momentum": float},
            "current_price": float,
            "support": float,
            "resistance": float,
            "avg_volume": float,
            "recent_volume": float
        }

    Returns:
        JSON avec l'analyse complète
    """
    try:
        logger.info(f"Demande d'analyse IA pour {symbol}")

        # Récupérer les données du body
        data = request.get_json()

        if not data:
            return jsonify({
                'success': False,
                'error': 'Aucune donnée fournie'
            }), 400

        indicators = data.get('indicators', {})
        current_price = data.get('current_price')
        support = data.get('support')
        resistance = data.get('resistance')
        avg_volume = data.get('avg_volume', 0)
        recent_volume = data.get('recent_volume', 0)

        # Valider les données
        if not all([current_price, support, resistance]):
            return jsonify({
                'success': False,
                'error': 'Données manquantes (current_price, support, resistance requis)'
            }), 400

        logger.info(f"Indicateurs reçus pour {symbol}: RSI={indicators.get('rsi')}, MACD={indicators.get('macd')}")

        # Analyser avec l'IA (indicateurs déjà calculés en JS)
        # Calculer les volumes nécessaires
        current_volume = recent_volume  # Volume récent comme volume actuel
        previous_volume = avg_volume * 0.95  # Estimation du volume précédent
        volume_trend = "hausse" if recent_volume > avg_volume else "baisse" if recent_volume < avg_volume * 0.9 else "stable"

        analysis_result = analyzer.analyze_stock_with_indicators(
            indicators=indicators,
            current_price=current_price,
            support=support,
            resistance=resistance,
            current_volume=current_volume,
            previous_volume=previous_volume,
            avg_volume_20=avg_volume,
            volume_trend=volume_trend
        )

        if not analysis_result.get('success'):
            return jsonify(analysis_result), 400

        # Ajouter les informations du titre
        analysis_result['symbol'] = symbol

        logger.info(f"Analyse IA terminée pour {symbol}: tendance {analysis_result['trend']}, confiance {analysis_result['confidence']}")

        return jsonify(analysis_result)

    except Exception as e:
        logger.error(f"Erreur lors de l'analyse IA pour {symbol}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Erreur serveur lors de l\'analyse: {str(e)}'
        }), 500


@ai_analysis_bp.route('/stocks', methods=['GET'])
def get_available_stocks():
    """
    Récupère la liste des actions disponibles pour l'analyse
    Utilise la même source que la section Graphiques

    Returns:
        JSON avec la liste des actions
    """
    try:
        from ..services.data_service import DataService
        data_service = DataService()

        # Récupérer toutes les actions
        stocks = data_service.get_all_stocks()

        # Formater les données pour le frontend
        formatted_stocks = []
        for stock in stocks:
            formatted_stocks.append({
                'ticker': stock.get('ticker') or stock.get('symbol'),
                'name': stock.get('stock_name') or stock.get('name'),
                'arabName': stock.get('arab_name'),
                'last': stock.get('last_price') or stock.get('last'),
                'change': stock.get('change') or stock.get('variation')
            })

        # Trier par ticker
        formatted_stocks.sort(key=lambda x: x['ticker'] if x['ticker'] else '')

        logger.info(f"Liste des actions récupérée: {len(formatted_stocks)} actions")

        return jsonify({
            'success': True,
            'stocks': formatted_stocks
        })

    except Exception as e:
        logger.error(f"Erreur lors de la récupération des actions: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
