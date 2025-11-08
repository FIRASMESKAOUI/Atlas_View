import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from flask import Flask, send_from_directory, request, jsonify, render_template_string
from flask_cors import CORS
from dotenv import load_dotenv
# from .database.mongodb import init_mongodb
from .routes.stocks import stocks_bp
from .routes.indices import indices_bp
from .routes.dataCharts import dataCharts_bp
from .routes.ai_analysis import ai_analysis_bp


import requests

# Charger les variables d'environnement
load_dotenv()

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), 'static'))
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'asdf#FGSgvasgf$5$WGT')

# Activer CORS pour toutes les routes
CORS(app)

# Initialiser MongoDB
# init_mongodb(app)

# Enregistrer les blueprints
app.register_blueprint(stocks_bp, url_prefix='/api/stocks')
app.register_blueprint(indices_bp, url_prefix='/api/indices')
app.register_blueprint(dataCharts_bp, url_prefix='/api/dataCharts')
app.register_blueprint(ai_analysis_bp, url_prefix='/api/ai-analysis')



@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    # Ajouter les headers de cache pour les métadonnées Open Graph
    response.headers.add('Cache-Control', 'public, max-age=3600')
    response.headers.add('X-Content-Type-Options', 'nosniff')
    return response

@app.route('/api/bvmt/market', methods=['GET'])
def get_bvmt_market():
    """Proxy pour l'API BVMT"""
    try:
        response = requests.get('https://bvmt.com.tn/rest_api/rest/market/qtys')
        return jsonify(response.json())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/dataCharts', methods=['GET'])
def get_all_charts():
    """Route pour récupérer toutes les données des graphiques"""
    try:
        # Faire la requête vers l'API externe
        response = requests.get('https://data.irbe7.com/dataCharts')
        if not response.ok:
            return jsonify({'error': 'Erreur lors de la récupération des données'}), 500

        # Retourner directement les données
        return response.text, response.status_code, {'Content-Type': 'application/json'}
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            with open(index_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            # Améliorer les en-têtes pour le partage social
            response = app.make_response(html_content)
            response.headers['Content-Type'] = 'text/html; charset=utf-8'
            response.headers['X-UA-Compatible'] = 'ie=edge'
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
            return response
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    port = int(os.getenv('PORT',8000))
    app.run(host='0.0.0.0', port=port, debug=True, use_reloader=False)
