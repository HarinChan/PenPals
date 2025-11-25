from flask import Flask, jsonify, request
from flask_cors import CORS
import uuid

application = Flask(__name__)
CORS(application)

# In memory databases
USERS = {}
CLIQUES = {}
MESSAGES = []


@application.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    user_id = str(uuid.uuid4())
    USERS[user_id] = {"id": user_id, "name": data.get("name")}
    return jsonify(USERS[user_id]), 201


@application.route('/api/cliques', methods=['POST'])
def create_clique():
    data = request.json
    clique_id = str(uuid.uuid4())
    CLIQUES[clique_id] = {"id": clique_id, "name": data.get("name")}
    return jsonify(CLIQUES[clique_id]), 201


@application.route('/api/messages', methods=['POST'])
def send_message():
    data = request.json
    msg = {
        "id": str(uuid.uuid4()),
        "senderId": data["senderId"],
        "cliqueId": data["cliqueId"],
        "text": data["text"],
    }
    MESSAGES.append(msg)
    return jsonify(msg), 201

@application.route('/api/messages', methods=['GET'])
def get_messages():
    return jsonify(MESSAGES), 200

@application.route('/api/users', methods=['GET'])
def get_users():
    return jsonify(list(USERS.values())), 200

@application.route('/api/cliques', methods=['GET'])
def get_cliques():
    return jsonify(list(CLIQUES.values())), 200



if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5001)
