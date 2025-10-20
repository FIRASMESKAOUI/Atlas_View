"""
Routes API pour les indices boursiers (TUNINDEX, TUNINDEX20, etc.)
"""
from flask import Blueprint, jsonify
import logging

logger = logging.getLogger(__name__)

indices_bp = Blueprint('indices', __name__)

# Initialize service lazily to avoid circular imports
def get_bvmt_service():
    from ..services.bvmt_service import BVMTService
    return BVMTService()

@indices_bp.route('/', methods=['GET'])
def get_indices():
    """
    Récupère les indices boursiers (TUNINDEX, TUNINDEX20, etc.)
    """
    try:
        bvmt_service = get_bvmt_service()
        indices_data = bvmt_service.get_indices()

        if not indices_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données des indices'
            }), 500

        return jsonify({
            'success': True,
            'data': indices_data
        })

    except Exception as e:
        logger.error(f"Erreur dans get_indices: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@indices_bp.route('/tunindex', methods=['GET'])
def get_tunindex():
    """
    Récupère uniquement les données du TUNINDEX
    """
    try:
        bvmt_service = get_bvmt_service()
        indices_data = bvmt_service.get_indices()

        if not indices_data or 'indices' not in indices_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données du TUNINDEX'
            }), 500

        # Recherche du TUNINDEX dans les données
        tunindex_data = next((idx for idx in indices_data.get('indices', [])
                             if idx.get('name', '').lower() == 'tunindex'), None)

        if not tunindex_data:
            return jsonify({
                'success': False,
                'error': 'TUNINDEX non trouvé dans les données'
            }), 404

        return jsonify({
            'success': True,
            'data': tunindex_data
        })

    except Exception as e:
        logger.error(f"Erreur dans get_tunindex: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@indices_bp.route('/tunindex20', methods=['GET'])
def get_tunindex20():
    """
    Récupère uniquement les données du TUNINDEX20
    """
    try:
        bvmt_service = get_bvmt_service()
        indices_data = bvmt_service.get_indices()

        if not indices_data or 'indices' not in indices_data:
            return jsonify({
                'success': False,
                'error': 'Impossible de récupérer les données du TUNINDEX20'
            }), 500

        # Recherche du TUNINDEX20 dans les données
        tunindex20_data = next((idx for idx in indices_data.get('indices', [])
                              if idx.get('name', '').lower() == 'tunindex20'), None)

        if not tunindex20_data:
            return jsonify({
                'success': False,
                'error': 'TUNINDEX20 non trouvé dans les données'
            }), 404

        return jsonify({
            'success': True,
            'data': tunindex20_data
        })

    except Exception as e:
        logger.error(f"Erreur dans get_tunindex20: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500



