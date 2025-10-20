from flask import Flask, render_template
from flask_socketio import SocketIO, emit
import threading
import time

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

@app.route('/')
def index():
    return "WebSocket server running."

# Exemple : émettre un événement toutes les 10 secondes (à remplacer par ta logique réelle)
def background_thread():
    while True:
        socketio.emit('update_chart', {'message': 'Mise à jour des données !'})
        time.sleep(10)

if __name__ == '__main__':
    thread = threading.Thread(target=background_thread)
    thread.daemon = True
    thread.start()
    socketio.run(app, host='0.0.0.0', port=5000)


