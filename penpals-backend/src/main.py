
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import timedelta
import os

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from models import db, Account, Profile, Relation, Post
from chromadb_service import ChromaDBService

application = Flask(__name__)
CORS(application)

# Configuration
application.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
application.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
application.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)

# Database configuration
application.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///penpals.db')
application.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
db.init_app(application)
jwt = JWTManager(application)

# Initialize ChromaDB service
chroma_service = ChromaDBService(persist_directory="./chroma_db", collection_name="penpals_documents")

# Note: Table creation is handled by src/init_db.py (avoid doing it at runtime)

@application.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new account"""
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    organization = data.get('organization')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({"msg": "Missing required fields"}), 400
    
    # Check if account exists
    if Account.query.filter_by(email=email).first():
        return jsonify({"msg": "Account already exists"}), 409
    
    # Hash password using werkzeug
    password_hash = generate_password_hash(password)
    
    # Create account
    account = Account(email=email, password_hash=password_hash, organization=organization)
    db.session.add(account)
    db.session.flush()  # Get account.id before committing
    
    # Create associated profile
    profile = Profile(account_id=account.id, name=name)
    db.session.add(profile)
    
    db.session.commit()
    
    return jsonify({
        "msg": "Account created successfully",
        "account_id": account.id,
        "profile_id": profile.id
    }), 201


@application.route('/api/auth/login', methods=['POST'])
def login():
    """Login and receive JWT token"""
    data = request.json
    
    email = data.get('email')
    password = data.get('password')
    
    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400
    
    account = Account.query.filter_by(email=email).first()
    
    if not account or not check_password_hash(account.password_hash, password):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    # Create JWT token with account ID as identity
    access_token = create_access_token(identity=account.id)
    
    return jsonify({
        "access_token": access_token,
        "account_id": account.id,
        "profile_id": account.profile.id if account.profile else None
    }), 200


@application.route('/api/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user's info"""
    account_id = get_jwt_identity()
    account = Account.query.get(account_id)
    
    if not account:
        return jsonify({"msg": "Account not found"}), 404
    
    profile = account.profile
    
    return jsonify({
        "account": {
            "id": account.id,
            "email": account.email,
            "organization": account.organization
        },
        "profile": {
            "id": profile.id,
            "name": profile.name,
            "location": profile.location,
            "class_size": profile.class_size,
            "timezone": profile.timezone,
            "interests": profile.interests
        } if profile else None
    }), 200


# ChromaDB Document Endpoints

@application.route('/api/documents/upload', methods=['POST'])
def upload_documents():
    """
    Upload documents to ChromaDB for embedding and storage
    Expected JSON format:
    {
        "documents": ["text1", "text2", ...],
        "metadatas": [{"key": "value"}, ...],  // optional
        "ids": ["id1", "id2", ...]  // optional
    }
    """
    try:
        data = request.json
        
        if not data or 'documents' not in data:
            return jsonify({"status": "error", "message": "Missing 'documents' field"}), 400
        
        documents = data.get('documents')
        metadatas = data.get('metadatas', None)
        ids = data.get('ids', None)
        
        if not isinstance(documents, list) or len(documents) == 0:
            return jsonify({"status": "error", "message": "'documents' must be a non-empty list"}), 400
        
        result = chroma_service.add_documents(documents, metadatas, ids)
        
        if result['status'] == 'success':
            return jsonify(result), 201
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/query', methods=['POST'])
def query_documents():
    """
    Query ChromaDB for similar documents
    Expected JSON format:
    {
        "query": "search text",
        "n_results": 5,  // optional, defaults to 5
        "where": {"key": "value"}  // optional metadata filter
    }
    """
    try:
        data = request.json
        
        if not data or 'query' not in data:
            return jsonify({"status": "error", "message": "Missing 'query' field"}), 400
        
        query_text = data.get('query')
        n_results = data.get('n_results', 5)
        where = data.get('where', None)
        
        if not isinstance(query_text, str) or len(query_text.strip()) == 0:
            return jsonify({"status": "error", "message": "'query' must be a non-empty string"}), 400
        
        result = chroma_service.query_documents(query_text, n_results, where)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/delete', methods=['DELETE'])
def delete_documents():
    """
    Delete documents from ChromaDB
    Expected JSON format:
    {
        "ids": ["id1", "id2", ...]
    }
    """
    try:
        data = request.json
        
        if not data or 'ids' not in data:
            return jsonify({"status": "error", "message": "Missing 'ids' field"}), 400
        
        ids = data.get('ids')
        
        if not isinstance(ids, list) or len(ids) == 0:
            return jsonify({"status": "error", "message": "'ids' must be a non-empty list"}), 400
        
        result = chroma_service.delete_documents(ids)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/info', methods=['GET'])
def get_collection_info():
    """
    Get information about the ChromaDB collection
    """
    try:
        result = chroma_service.get_collection_info()
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@application.route('/api/documents/update', methods=['PUT'])
def update_document():
    """
    Update an existing document in ChromaDB
    Expected JSON format:
    {
        "id": "document_id",
        "document": "new text",
        "metadata": {"key": "value"}  // optional
    }
    """
    try:
        data = request.json
        
        if not data or 'id' not in data or 'document' not in data:
            return jsonify({"status": "error", "message": "Missing 'id' or 'document' field"}), 400
        
        document_id = data.get('id')
        document = data.get('document')
        metadata = data.get('metadata', None)
        
        if not isinstance(document_id, str) or len(document_id.strip()) == 0:
            return jsonify({"status": "error", "message": "'id' must be a non-empty string"}), 400
        
        if not isinstance(document, str) or len(document.strip()) == 0:
            return jsonify({"status": "error", "message": "'document' must be a non-empty string"}), 400
        
        result = chroma_service.update_document(document_id, document, metadata)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


if __name__ == '__main__':
    application.run(host='0.0.0.0', port=5001)
